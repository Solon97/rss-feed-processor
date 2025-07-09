import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeedQueueService } from './feed-queue.service';

@Injectable()
export class FeedSchedulerService {
  private readonly logger = new Logger(FeedSchedulerService.name);

  constructor(private readonly feedQueueService: FeedQueueService) {}

  /**
   * Schedule all feeds processing every 30 minutes
   * Runs at minute 0 and 30 of every hour
   */
  @Cron('0,30 * * * *')
  async scheduleFeedsProcessing() {
    this.logger.log('Starting scheduled feeds processing...');

    try {
      await this.feedQueueService.scheduleAllFeedsProcessing();
      this.logger.log('Successfully scheduled all feeds for processing');
    } catch (error) {
      this.logger.error(
        `Failed to schedule feeds processing: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Log queue statistics every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async logQueueStats() {
    try {
      const stats = await this.feedQueueService.getQueueStats();
      this.logger.log('Queue Statistics:', JSON.stringify(stats, null, 2));
    } catch (error) {
      this.logger.error(
        `Failed to get queue statistics: ${error.message}`,
        error.stack,
      );
    }
  }
}
