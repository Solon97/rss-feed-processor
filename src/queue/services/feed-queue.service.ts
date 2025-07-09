import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import {
  FeedProcessingJobData,
  JobPriority,
  QueueNames,
  JobTypes,
} from '../interfaces/job.interface';

@Injectable()
export class FeedQueueService {
  private readonly logger = new Logger(FeedQueueService.name);

  constructor(
    @InjectQueue(QueueNames.FEED_PROCESSING)
    private readonly feedProcessingQueue: Queue<FeedProcessingJobData>,
    @InjectQueue(QueueNames.FEED_PRIORITY)
    private readonly feedPriorityQueue: Queue<FeedProcessingJobData>,
    private readonly prisma: PrismaService,
  ) {}

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

      const jobData: FeedProcessingJobData = {
        feedId,
        feedUrl,
        priority,
        userCount,
      };

      await this.feedProcessingQueue.add(JobTypes.PROCESS_FEED, jobData, {
        priority,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
      });

      this.logger.log(
        `Feed ${feedId} added to processing queue with priority ${priority} (${userCount} users)`,
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

      await this.feedPriorityQueue.add(JobTypes.PROCESS_NEW_FEED, jobData, {
        priority: JobPriority.HIGH,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 5,
        removeOnFail: 3,
      });

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

  /**
   * Gets queue statistics
   */
  async getQueueStats() {
    const [processingStats, priorityStats] = await Promise.all([
      {
        waiting: await this.feedProcessingQueue.getWaiting(),
        active: await this.feedProcessingQueue.getActive(),
        completed: await this.feedProcessingQueue.getCompleted(),
        failed: await this.feedProcessingQueue.getFailed(),
      },
      {
        waiting: await this.feedPriorityQueue.getWaiting(),
        active: await this.feedPriorityQueue.getActive(),
        completed: await this.feedPriorityQueue.getCompleted(),
        failed: await this.feedPriorityQueue.getFailed(),
      },
    ]);

    return {
      processing: {
        waiting: processingStats.waiting.length,
        active: processingStats.active.length,
        completed: processingStats.completed.length,
        failed: processingStats.failed.length,
      },
      priority: {
        waiting: priorityStats.waiting.length,
        active: priorityStats.active.length,
        completed: priorityStats.completed.length,
        failed: priorityStats.failed.length,
      },
    };
  }
}
