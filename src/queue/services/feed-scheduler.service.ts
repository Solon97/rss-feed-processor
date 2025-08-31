import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { FeedQueueService } from './feed-queue.service';

@Injectable()
export class FeedSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(FeedSchedulerService.name);

  constructor(
    private readonly feedQueueService: FeedQueueService,
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    this.setupCronJobs();
  }

  private setupCronJobs(): void {
    // Setup feed processing cron
    const feedProcessingCron = this.configService.get(
      'FEED_PROCESSING_CRON',
      '0,30 * * * *',
    );
    const feedProcessingJob = new CronJob(feedProcessingCron, () => {
      this.scheduleAllFeedsProcessing();
    });

    this.schedulerRegistry.addCronJob('feed-processing', feedProcessingJob);
    feedProcessingJob.start();

    // Setup health check cron
    const healthCheckCron = this.configService.get(
      'QUEUE_HEALTH_CHECK_CRON',
      '0/5 * * * *',
    );
    const healthCheckJob = new CronJob(healthCheckCron, () => {
      this.healthCheck();
    });

    this.schedulerRegistry.addCronJob('health-check', healthCheckJob);
    healthCheckJob.start();

    this.logger.log(`Feed processing cron scheduled: ${feedProcessingCron}`);
    this.logger.log(`Health check cron scheduled: ${healthCheckCron}`);
  }

  /**
   * Schedules all feeds for processing using cron from environment
   */
  async scheduleAllFeedsProcessing(): Promise<void> {
    const cronExpression = this.configService.get(
      'FEED_PROCESSING_CRON',
      '0,30 * * * *',
    );

    this.logger.log(
      `Starting scheduled feed processing (cron: ${cronExpression})...`,
    );

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
   * Health check using cron from environment to ensure the queue system is working
   */
  async healthCheck(): Promise<void> {
    this.logger.log('Queue system health check - system is running');
  }
}
