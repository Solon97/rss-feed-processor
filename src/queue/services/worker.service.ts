import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { QueueAdapter } from '../interfaces/queue-adapter.interface';
import { FeedProcessor } from '../processors/feed.processor';
import { EmailProcessor } from '../processors/email.processor';
import { JobTypes } from '../interfaces/job.interface';

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);

  constructor(
    @Inject('QueueAdapter') private readonly queueAdapter: QueueAdapter,
    private readonly feedProcessor: FeedProcessor,
    private readonly emailProcessor: EmailProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueAdapter.start();
    await this.initializeWorkers();
  }

  async onModuleDestroy(): Promise<void> {
    await this.queueAdapter.stop();
  }

  private async initializeWorkers(): Promise<void> {
    this.logger.log('Initializing queue workers...');

    // Create queues first
    await this.queueAdapter.createQueue('feed-processing-default');
    await this.queueAdapter.createQueue('feed-processing-priority');
    await this.queueAdapter.createQueue('email-processing');

    // Register feed processing workers
    await this.queueAdapter.registerWorker(
      'feed-processing-default',
      async (jobData: any) => {
        const message = { id: `job-${Date.now()}`, data: jobData };

        if (jobData.jobType === JobTypes.PROCESS_FEED) {
          return await this.feedProcessor.processFeed(message);
        } else if (jobData.jobType === JobTypes.PROCESS_NEW_FEED) {
          return await this.feedProcessor.processNewFeed(message);
        }

        throw new Error(`Unknown job type: ${jobData.jobType}`);
      },
    );

    await this.queueAdapter.registerWorker(
      'feed-processing-priority',
      async (jobData: any) => {
        const message = { id: `job-${Date.now()}`, data: jobData };

        if (jobData.jobType === JobTypes.PROCESS_FEED) {
          return await this.feedProcessor.processFeed(message);
        } else if (jobData.jobType === JobTypes.PROCESS_NEW_FEED) {
          return await this.feedProcessor.processNewFeed(message);
        }

        throw new Error(`Unknown job type: ${jobData.jobType}`);
      },
    );

    // Register email processing worker
    await this.queueAdapter.registerWorker(
      'email-processing',
      async (jobData: any) => {
        const message = { id: `email-job-${Date.now()}`, data: jobData };
        return await this.emailProcessor.processEmailJob(message);
      },
    );

    this.logger.log('Queue workers initialized successfully');
  }
}
