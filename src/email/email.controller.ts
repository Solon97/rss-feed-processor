import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailDto } from './dto/send-email.dto';
import { AppAuthGuard } from '../auth/guards/auth.guard';

@Controller('email')
@UseGuards(AppAuthGuard)
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(private readonly emailService: EmailService) {}

  @Get('health')
  async checkEmailHealth() {
    try {
      const isValid = await this.emailService.validateConfiguration();
      return {
        status: isValid ? 'healthy' : 'unhealthy',
        service: 'Resend',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Email health check failed', error);
      throw new HttpException(
        'Email service health check failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  @Post('send')
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    try {
      const result = await this.emailService.sendEmail({
        from: sendEmailDto.from,
        to: sendEmailDto.to,
        cc: sendEmailDto.cc,
        bcc: sendEmailDto.bcc,
        subject: sendEmailDto.subject,
        html: sendEmailDto.html,
        text: sendEmailDto.text,
        replyTo: sendEmailDto.replyTo,
        attachments: sendEmailDto.attachments?.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        })),
      });

      if (!result.success) {
        throw new HttpException(
          result.message || 'Failed to send email',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        emailId: result.id,
        message: 'Email sent successfully',
      };
    } catch (error) {
      this.logger.error('Failed to send email', error);
      throw new HttpException(
        error instanceof HttpException ? error.message : 'Failed to send email',
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('welcome')
  async sendWelcomeEmail(@Body() body: { email: string; name?: string }) {
    try {
      const result = await this.emailService.sendWelcomeEmail(
        body.email,
        body.name,
      );

      if (!result.success) {
        throw new HttpException(
          result.message || 'Failed to send welcome email',
          HttpStatus.BAD_REQUEST,
        );
      }

      return {
        success: true,
        emailId: result.id,
        message: 'Welcome email sent successfully',
      };
    } catch (error) {
      this.logger.error('Failed to send welcome email', error);
      throw new HttpException(
        error instanceof HttpException
          ? error.message
          : 'Failed to send welcome email',
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
