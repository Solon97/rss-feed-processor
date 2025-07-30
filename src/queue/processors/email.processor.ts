import { Injectable, Logger } from '@nestjs/common';
import {
  EmailJobData,
  EmailJobResult,
  Message,
} from '../interfaces/job.interface';
import { EmailService } from '../../email/email.service';
import { EmailTemplateType } from '../../email/templates';

@Injectable()
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  async processEmailJob(job: Message<EmailJobData>): Promise<EmailJobResult> {
    this.logger.log(
      `Processing email job ${job.id} with template ${job.data.template}`,
    );

    const { template, to, toName } = job.data;

    let result;

    switch (template) {
      case EmailTemplateType.WELCOME:
        result = await this.emailService.sendWelcomeEmail(to, toName);
        break;
      default:
        throw new Error(`Unknown email template type: ${template}`);
    }

    return {
      emailId: result.id,
      success: result.success,
      message: result.message,
    };
  }
}
