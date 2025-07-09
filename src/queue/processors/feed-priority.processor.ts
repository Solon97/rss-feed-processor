import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import {
  FeedProcessingJobData,
  FeedItemProcessingResult,
  QueueNames,
  JobTypes,
} from '../interfaces/job.interface';
import { FeedProcessingProcessor } from './feed-processing.processor';

@Processor(QueueNames.FEED_PRIORITY)
@Injectable()
export class FeedPriorityProcessor {
  private readonly logger = new Logger(FeedPriorityProcessor.name);

  constructor(
    private readonly feedProcessingProcessor: FeedProcessingProcessor,
  ) {}

  @Process(JobTypes.PROCESS_NEW_FEED)
  async processNewFeed(
    job: Job<FeedProcessingJobData>,
  ): Promise<FeedItemProcessingResult> {
    const { feedId } = job.data;

    this.logger.log(
      `Processing new feed ${feedId} with high priority - Job ${job.id}`,
    );

    try {
      // Use the same processing logic as regular feeds but with higher priority
      const result = await this.feedProcessingProcessor.processFeed(job);

      this.logger.log(
        `Completed priority processing for new feed ${feedId} - ${result.newItems} new items`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process new feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
