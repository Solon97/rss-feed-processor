import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeedQueueService } from './feed-queue.service';

@Injectable()
export class FeedSchedulerService {
  private readonly logger = new Logger(FeedSchedulerService.name);

  constructor(private readonly feedQueueService: FeedQueueService) {}

  /**
   * Schedules all feeds for processing every 30 minutes
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async scheduleAllFeedsProcessing(): Promise<void> {
    this.logger.log('Starting scheduled feed processing...');

    try {
      await this.feedQueueService.scheduleAllFeedsProcessing();
      this.logger.log('Scheduled feed processing completed successfully');
    } catch (error) {
      this.logger.error(
        `Failed to schedule feeds for processing: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Health check that runs every 5 minutes to ensure the queue system is working
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async healthCheck(): Promise<void> {
    this.logger.log('Queue system health check - system is running');
  }
}
