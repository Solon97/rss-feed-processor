import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';
import { EmailJobData } from '../interfaces/job.interface';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly qstashClient: Client;
  private readonly emailQueueName = 'send-email';

  constructor(private readonly configService: ConfigService) {
    this.qstashClient = new Client({
      token: this.configService.get<string>('QSTASH_TOKEN'),
    });
  }

  /**
   * Sends an email job to the QStash queue
   */
  async sendEmailToQueue(jobData: EmailJobData, retries = 3): Promise<void> {
    this.logger.log(
      `Sending email job to queue: ${jobData.template} for ${jobData.to}`,
    );
    const queue = this.qstashClient.queue({
      queueName: this.emailQueueName,
    });

    const url =
      this.configService.get<string>('WEBHOOK_BASE_URL') + '/webhook/email';

    const body = {
      jobData,
      jobId: `email-${jobData.template}-${Date.now()}`,
    };

    await queue.enqueueJSON({
      url,
      body,
      retries,
    });
  }
}
