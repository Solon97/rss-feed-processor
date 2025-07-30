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
  EmailJobData,
  FeedItemProcessingResult,
  FeedProcessingJobData,
  Job,
  JobTypes,
  Message,
} from '../interfaces/job.interface';
import { EmailProcessor } from '../processors/email.processor';
import { FeedProcessor } from '../processors/feed.processor';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly receiver: Receiver;

  constructor(
    private readonly configService: ConfigService,
    private readonly feedProcessor: FeedProcessor,
    private readonly emailProcessor: EmailProcessor,
  ) {
    this.receiver = new Receiver({
      currentSigningKey: this.configService.get<string>(
        'QSTASH_CURRENT_SIGNING_KEY',
      ),
      nextSigningKey: this.configService.get<string>('QSTASH_NEXT_SIGNING_KEY'),
    });
  }

  @Post('process')
  async processFeed(
    @Headers('upstash-signature') signature: string,
    @Body() body: any,
  ) {
    try {
      const { jobType, jobData, jobId } =
        await this.parseBody<FeedProcessingJobData>(signature, body);

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
          result = await this.feedProcessor.processFeed(job);
          break;
        case JobTypes.PROCESS_NEW_FEED:
          result = await this.feedProcessor.processNewFeed(job);
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
      return { success: false, message: error.message };
    }
  }

  @Post('email')
  async processEmail(
    @Headers('upstash-signature') signature: string,
    @Body() body: any,
  ) {
    try {
      const { jobData } = await this.parseBody<EmailJobData>(signature, body);

      this.logger.log(
        `Processing email with template ${jobData.template} for ${jobData.to}`,
      );

      const job: Message<EmailJobData> = {
        data: jobData,
        id: `${jobData.template}-${jobData.to}-${Date.now()}`,
      };

      const result = await this.emailProcessor.processEmailJob(job);

      this.logger.log(`Successfully processed email job for ${jobData.to}`);
      return { success: true, result };
    } catch (error) {
      this.logger.error(
        `Failed to process email job: ${error.message}`,
        error.stack,
      );
      return { success: false, message: error.message };
    }
  }

  private async parseBody<T>(signature: string, body: any): Promise<Job<T>> {
    if (process.env.NODE_ENV === 'production') {
      const isValid = await this.receiver.verify({
        signature,
        body: JSON.stringify(body),
      });

      if (!isValid) {
        throw new BadRequestException('Invalid signature for webhook request');
      }
    }

    return body as Job<T>;
  }
}
