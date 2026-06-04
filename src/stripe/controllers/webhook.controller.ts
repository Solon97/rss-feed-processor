import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsStripeEnabledGuard } from '../../common/guards/stripe-enabled.guard';
import { StripeService } from '../services/stripe.service';
import { WebhookService } from '../services/webhook.service';

@Controller('stripe/webhooks')
@UseGuards(IsStripeEnabledGuard)
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly webhookService: WebhookService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Handle Stripe webhook events
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!endpointSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    if (!signature) {
      this.logger.error('Missing stripe-signature header');
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Get the raw body from the request (available due to rawBody: true in main.ts)
    const body = request.rawBody || request.body;

    if (!body) {
      this.logger.error('No body received in webhook request');
      throw new BadRequestException('No body received');
    }

    console.log('Body type:', typeof body, 'Length:', body?.length);

    try {
      const event = this.stripeService.verifyWebhookSignature(
        body,
        signature,
        endpointSecret,
      );

      console.log('Event verified:', event.type);
      await this.webhookService.processWebhookEvent(event);

      return { received: true };
    } catch (error) {
      this.logger.error('Webhook signature verification failed', error);
      throw new BadRequestException('Invalid signature');
    }
  }
}
