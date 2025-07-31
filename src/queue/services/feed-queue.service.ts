import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QueueAdapter } from '../interfaces/queue-adapter.interface';
import { JobTypes } from '../interfaces/job.interface';

@Injectable()
export class FeedQueueService {
  private readonly logger = new Logger(FeedQueueService.name);
  private readonly priorityQueueName = 'feed-processing-priority';
  private readonly defaultQueueName = 'feed-processing-default';

  constructor(
    @Inject('QueueAdapter') private readonly queueAdapter: QueueAdapter,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    await this.queueAdapter.start();
    await this.queueAdapter.createQueue(this.priorityQueueName);
    await this.queueAdapter.createQueue(this.defaultQueueName);
  }

  /**
   * Stop the queue service gracefully
   */
  async stop(): Promise<void> {
    await this.queueAdapter.stop();
  }

  /**
   * Adds a feed to the appropriate processing queue based on priority
   */
  async addFeedToQueue(feedId: string, feedUrl: string): Promise<void> {
    try {
      const queueName = this.defaultQueueName;

      const jobData = {
        feedId,
        feedUrl,
        jobType: JobTypes.PROCESS_FEED,
      };

      await this.queueAdapter.addJob(queueName, jobData);

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
      const jobData = {
        feedId,
        feedUrl,
        jobType: JobTypes.PROCESS_NEW_FEED,
      };

      // Send to priority queue for immediate processing
      await this.queueAdapter.addJob(this.priorityQueueName, jobData);

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
