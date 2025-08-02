import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from '@nestjs/common';
import { EmailTemplateType } from '../../email/templates';
import { WebhookUserDto } from '../dto/queue-email.dto';
import { WebhookAuthGuard } from '../guards/webhook-auth.guard';
import { EmailQueueService } from '../services/email-queue.service';

@Controller('webhook')
export class EmailWebhookController {
  private readonly logger = new Logger(EmailWebhookController.name);

  constructor(private readonly emailQueueService: EmailQueueService) {}

  @Post('user-signup')
  @UseGuards(WebhookAuthGuard)
  async handleUserSignup(@Body() payload: WebhookUserDto) {
    try {
      this.logger.log('Processing user signup webhook');

      // Validação básica
      if (!payload?.record?.raw_user_meta_data?.email) {
        throw new HttpException(
          'Invalid payload: Email is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const { email, full_name } = payload.record.raw_user_meta_data;

      // Adicionar email de boas-vindas na fila
      await this.emailQueueService.addEmailToQueue({
        template: EmailTemplateType.WELCOME,
        to: email,
        toName: full_name,
        variables: {},
      });

      this.logger.log(`Welcome email queued for user: ${email}`);

      return {
        status: 'success',
        message: 'User signup processed and welcome email queued',
      };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Internal Server Error: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
