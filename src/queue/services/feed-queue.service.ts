import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FeedProcessingJobData,
  JobPriority,
  JobTypes,
} from '../interfaces/job.interface';

@Injectable()
export class FeedQueueService {
  private readonly logger = new Logger(FeedQueueService.name);
  private readonly qstashClient: Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.qstashClient = new Client({
      token: this.configService.get<string>('QSTASH_TOKEN'),
    });
  }

  /**
   * Sends a job to QStash with appropriate delay based on priority
   */
  private async sendToQStash(
    jobType: JobTypes,
    jobData: FeedProcessingJobData,
    delay?: number,
    retries = 3,
  ): Promise<void> {
    const webhookUrl =
      this.configService.get<string>('WEBHOOK_BASE_URL') +
      '/queue/webhook/process';

    const payload = {
      jobType,
      jobData,
      jobId: `${jobType}-${jobData.feedId}-${Date.now()}`,
    };

    const options: any = {
      retries,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (delay) {
      options.delay = delay;
    }

    await this.qstashClient.publishJSON({
      url: webhookUrl,
      body: payload,
      ...options,
    });
  }

  /**
   * Calculates delay based on priority (lower priority = higher delay)
   */
  private calculateDelayForPriority(priority: number): number {
    switch (priority) {
      case JobPriority.HIGH:
        return 0; // Immediate processing
      case JobPriority.MEDIUM:
        return 30000; // 30 seconds delay
      case JobPriority.LOW:
        return 60000; // 1 minute delay
      default:
        return 60000;
    }
  }

  /**
   * Calculates feed priority based on active user count
   */
  private calculateFeedPriority(userCount: number): number {
    if (userCount >= 100) return JobPriority.HIGH;
    if (userCount >= 10) return JobPriority.MEDIUM;
    return JobPriority.LOW;
  }

  /**
   * Gets active user count for a feed
   */
  private async getActiveUserCount(feedId: string): Promise<number> {
    const count = await this.prisma.user_feeds.count({
      where: {
        feed_id: feedId,
        is_active: true,
      },
    });
    return count;
  }

  /**
   * Adds a feed to the regular processing queue
   */
  async addFeedToQueue(feedId: string, feedUrl: string): Promise<void> {
    try {
      const userCount = await this.getActiveUserCount(feedId);
      const priority = this.calculateFeedPriority(userCount);
      const delay = this.calculateDelayForPriority(priority);

      const jobData: FeedProcessingJobData = {
        feedId,
        feedUrl,
        priority,
        userCount,
      };

      await this.sendToQStash(JobTypes.PROCESS_FEED, jobData, delay, 3);

      this.logger.log(
        `Feed ${feedId} added to processing queue with priority ${priority} (${userCount} users), delay: ${delay}ms`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add feed ${feedId} to queue: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Adds a newly created feed to the priority queue for immediate processing
   */
  async addNewFeedToPriorityQueue(
    feedId: string,
    feedUrl: string,
  ): Promise<void> {
    try {
      const userCount = await this.getActiveUserCount(feedId);

      const jobData: FeedProcessingJobData = {
        feedId,
        feedUrl,
        priority: JobPriority.HIGH,
        userCount,
      };

      // No delay for new feeds - immediate processing
      await this.sendToQStash(JobTypes.PROCESS_NEW_FEED, jobData, 0, 3);

      this.logger.log(
        `New feed ${feedId} added to priority queue for immediate processing`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add new feed ${feedId} to priority queue: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Schedules all feeds for processing based on priority
   */
  async scheduleAllFeedsProcessing(): Promise<void> {
    try {
      // Get feeds with their user counts, ordered by user count (priority)
      const feedsWithUserCounts = await this.prisma.feeds.findMany({
        where: {
          is_active: true,
          status: 'active',
        },
        select: {
          id: true,
          url: true,
          _count: {
            select: {
              user_feeds: {
                where: {
                  is_active: true,
                },
              },
            },
          },
        },
        orderBy: {
          user_feeds: {
            _count: 'desc',
          },
        },
      });

      for (const feed of feedsWithUserCounts) {
        await this.addFeedToQueue(feed.id, feed.url);
      }

      this.logger.log(
        `Scheduled ${feedsWithUserCounts.length} feeds for processing`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to schedule feeds for processing: ${error.message}`,
      );
      throw error;
    }
  }
}
