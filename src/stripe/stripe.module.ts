import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { StripeService } from './services/stripe.service';
import { StripeController } from './controllers/stripe.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedModule } from '../feed/feed.module';
import { QueueModule } from '../queue/queue.module';
import { SubscriptionService } from './services/subscription.service';
import { WebhookService } from './services/webhook.service';
import { WebhookController } from './controllers/webhook.controller';
import { CustomerService } from './services/customer.service';
import { CheckoutService } from './services/checkout.service';
import { CheckoutController } from './controllers/checkout.controller';

@Module({
  imports: [PrismaModule, FeedModule, QueueModule],
  providers: [
    StripeService,
    SubscriptionService,
    WebhookService,
    CustomerService,
    CheckoutService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Stripe(configService.get<string>('STRIPE_SECRET_KEY'), {
          apiVersion: '2025-06-30.basil',
          typescript: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  controllers: [StripeController, WebhookController, CheckoutController],
  exports: [
    StripeService,
    SubscriptionService,
    CustomerService,
    CheckoutService,
  ],
})
export class StripeModule {}
