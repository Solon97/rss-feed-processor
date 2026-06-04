import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  EmailProvider,
  SendEmailRequest,
  EmailSendResult,
} from './interfaces/email.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly logger = new Logger(ResendEmailProvider.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async sendEmail(request: SendEmailRequest): Promise<EmailSendResult> {
    try {
      this.logger.log(`Sending email to: ${JSON.stringify(request.to)}`);

      const { data, error } = await this.resend.emails.send({
        from: this.formatEmailAddress(request.from),
        to: this.formatEmailAddresses(request.to),
        cc: request.cc ? this.formatEmailAddresses(request.cc) : undefined,
        bcc: request.bcc ? this.formatEmailAddresses(request.bcc) : undefined,
        subject: request.subject,
        html: request.html,
        text: request.text,
        attachments: request.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
        })),
        replyTo: request.replyTo
          ? this.formatEmailAddress(request.replyTo)
          : undefined,
        tags: request.tags
          ? Object.entries(request.tags).map(([name, value]) => ({
              name,
              value,
            }))
          : undefined,
      });

      if (error) {
        this.logger.error('Failed to send email', error);
        return {
          id: '',
          success: false,
          message: error.message,
        };
      }

      this.logger.log(`Email sent successfully with ID: ${data?.id}`);
      return {
        id: data?.id || '',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error sending email', error);
      return {
        id: '',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const apiKey = this.configService.get<string>('RESEND_API_KEY');
      if (!apiKey) {
        this.logger.error('RESEND_API_KEY is not configured');
        return false;
      }

      // Test the API key by attempting to get domains
      // This is a lightweight way to verify the API key works
      const { error } = await this.resend.domains.list();

      if (error) {
        this.logger.error('Resend API key validation failed', error);
        return false;
      }

      this.logger.log('Resend configuration validated successfully');
      return true;
    } catch (error) {
      this.logger.error('Error validating Resend configuration', error);
      return false;
    }
  }

  private formatEmailAddress(
    address: string | { email: string; name?: string },
  ): string {
    if (typeof address === 'string') {
      return address;
    }

    return address.name ? `${address.name} <${address.email}>` : address.email;
  }

  private formatEmailAddresses(
    addresses:
      | string
      | { email: string; name?: string }
      | Array<string | { email: string; name?: string }>,
  ): string[] {
    const addressArray = Array.isArray(addresses) ? addresses : [addresses];
    return addressArray.map((address) => this.formatEmailAddress(address));
  }
}
