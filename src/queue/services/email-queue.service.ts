import { Injectable, Logger, Inject } from '@nestjs/common';
import { QueueAdapter } from '../interfaces/queue-adapter.interface';
import { EmailJobData } from '../interfaces/job.interface';

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);
  private readonly emailQueueName = 'email-processing';

  constructor(
    @Inject('QueueAdapter') private readonly queueAdapter: QueueAdapter,
  ) {}

  /**
   * Initialize the email queue service
   */
  async initialize(): Promise<void> {
    await this.queueAdapter.createQueue(this.emailQueueName);
  }

  /**
   * Adds an email job to the queue
   */
  async addEmailToQueue(emailData: EmailJobData): Promise<void> {
    try {
      const jobId = await this.queueAdapter.addJob(this.emailQueueName, {
        template: emailData.template,
        variables: emailData.variables,
        to: emailData.to,
        toName: emailData.toName,
      });

      this.logger.log(
        `Email job ${jobId} added to queue for ${emailData.to} with template ${emailData.template}`,
      );
    } catch (error) {
      this.logger.error(`Failed to add email job to queue: ${error.message}`);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use addEmailToQueue instead
   */
  async sendEmailToQueue(jobData: EmailJobData): Promise<void> {
    return this.addEmailToQueue(jobData);
  }
}
