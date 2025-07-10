import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Receiver } from '@upstash/qstash';
import {
  FeedItemProcessingResult,
  FeedProcessingJobData,
  Message,
  JobTypes,
} from '../interfaces/job.interface';
import { FeedPriorityProcessor } from '../processors/feed-priority.processor';
import { FeedDefaultProcessor } from '../processors/feed-default.processor';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly receiver: Receiver;

  constructor(
    private readonly configService: ConfigService,
    private readonly feedDefaultProcessor: FeedDefaultProcessor,
    private readonly feedPriorityProcessor: FeedPriorityProcessor,
  ) {
    this.receiver = new Receiver({
      currentSigningKey: this.configService.get<string>(
        'QSTASH_CURRENT_SIGNING_KEY',
      ),
      nextSigningKey: this.configService.get<string>('QSTASH_NEXT_SIGNING_KEY'),
    });
  }

  @Post('process')
  async processJob(
    @Headers('upstash-signature') signature: string,
    @Body() body: any,
  ) {
    try {
      // Verify the signature to ensure the request is from QStash
      const isValid = await this.receiver.verify({
        signature,
        body: JSON.stringify(body),
      });

      if (!isValid) {
        this.logger.error('Invalid signature from QStash webhook');
        throw new BadRequestException('Invalid signature');
      }

      const { jobType, jobData, jobId } = body as {
        jobType: JobTypes;
        jobData: FeedProcessingJobData;
        jobId: string;
      };

      this.logger.log(
        `Processing feed ${jobData?.feedUrl} of job type ${jobType}`,
      );

      let result: FeedItemProcessingResult;

      // Create a mock job object that matches Bull's Job interface
      const job: Message<FeedProcessingJobData> = {
        id: jobId,
        data: jobData,
      };

      switch (jobType) {
        case JobTypes.PROCESS_FEED:
          result = await this.feedDefaultProcessor.processFeed(job);
          break;
        case JobTypes.PROCESS_NEW_FEED:
          result = await this.feedPriorityProcessor.processNewFeed(job);
          break;
        default:
          throw new BadRequestException(`Unknown job type: ${jobType}`);
      }

      this.logger.log(
        `Successfully processed QStash job ${jobId} for feed ${jobData.feedUrl}`,
      );
      return { success: true, result };
    } catch (error) {
      this.logger.error(
        `Failed to process QStash job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
