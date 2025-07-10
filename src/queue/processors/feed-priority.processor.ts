import { Injectable, Logger } from '@nestjs/common';
import {
  FeedProcessingJobData,
  FeedItemProcessingResult,
  JobData,
} from '../interfaces/job.interface';
import { FeedDefaultProcessor } from './feed-default.processor';

@Injectable()
export class FeedPriorityProcessor {
  private readonly logger = new Logger(FeedPriorityProcessor.name);

  constructor(private readonly feedDefaultProcessor: FeedDefaultProcessor) {}

  async processNewFeed(
    job: JobData<FeedProcessingJobData>,
  ): Promise<FeedItemProcessingResult> {
    const { feedId } = job.data;

    this.logger.log(
      `Processing new feed ${feedId} with high priority - Job ${job.id}`,
    );

    try {
      // Use the same processing logic as regular feeds but with higher priority
      const result = await this.feedDefaultProcessor.processFeed(job);

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
