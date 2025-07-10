import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedProcessingJobData, JobTypes } from '../interfaces/job.interface';

@Injectable()
export class FeedQueueService {
  private readonly logger = new Logger(FeedQueueService.name);
  private readonly qstashClient: Client;
  private readonly priorityQueueName = 'feed-processing-priority';
  private readonly defaultQueueName = 'feed-processing-default';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.qstashClient = new Client({
      token: this.configService.get<string>('QSTASH_TOKEN'),
    });
  }

  /**
   * Sends a job to a specific QStash queue
   */
  private async sendToQueue(
    queueName: string,
    jobType: JobTypes,
    jobData: FeedProcessingJobData,
    retries = 3,
  ): Promise<void> {
    const queue = this.qstashClient.queue({
      queueName: queueName,
    });

    const url =
      this.configService.get<string>('WEBHOOK_BASE_URL') + '/webhook/process';

    const body = {
      jobType,
      jobData,
      jobId: `${jobType}-${jobData.feedId}-${Date.now()}`,
    };

    await queue.enqueueJSON({
      url,
      body,
      retries,
    });
  }

  /**
   * Adds a feed to the appropriate processing queue based on priority
   */
  async addFeedToQueue(feedId: string, feedUrl: string): Promise<void> {
    try {
      const queueName = this.defaultQueueName;

      const jobData: FeedProcessingJobData = {
        feedId,
        feedUrl,
      };

      await this.sendToQueue(queueName, JobTypes.PROCESS_FEED, jobData, 3);

      this.logger.log(`Feed ${feedUrl} added to ${queueName} queue`);
    } catch (error) {
      this.logger.error(
        `Failed to add feed ${feedUrl} to queue: ${error.message}`,
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
      const jobData: FeedProcessingJobData = {
        feedId,
        feedUrl,
      };

      // Send to priority queue for immediate processing
      await this.sendToQueue(
        this.priorityQueueName,
        JobTypes.PROCESS_NEW_FEED,
        jobData,
        3,
      );

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
