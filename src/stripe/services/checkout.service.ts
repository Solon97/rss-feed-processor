import {
  Injectable,
  Logger,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { UserInfo } from '../../auth/decorators/current-user.decorator';
import { CustomerService } from './customer.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
} from '../dto/checkout.dto';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  /**
   * Create a subscription checkout session for the user
   */
  async createSubscriptionCheckoutSession(
    user: UserInfo,
    createCheckoutDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(`Creating checkout session for user ${user.id}`, {
      priceId: createCheckoutDto.priceId,
    });

    try {
      // Step 1: Get or create Stripe customer
      const customerData = await this.customerService.getOrCreateCustomer(user);

      // Step 2: Check for existing active subscription
      await this.validateExistingSubscription(user.id);

      // Step 3: Create checkout session
      const session = await this.createCheckoutSession(
        customerData.stripeCustomerId,
        createCheckoutDto,
      );

      this.logger.log(`Checkout session created successfully`, {
        userId: user.id,
        sessionId: session.id,
        customerId: customerData.stripeCustomerId,
        checkoutUrl: session.url!,
      });

      return {
        sessionId: session.id,
        checkoutUrl: session.url!,
        customerId: customerData.stripeCustomerId,
        expiresAt: session.expires_at,
      };
    } catch (error) {
      this.logger.error(
        `Error creating checkout session for user ${user.id}`,
        error,
      );

      // If error occurred, we might need to clean up
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new Error('Failed to create checkout session');
    }
  }

  /**
   * Validate if user already has an active subscription
   */
  private async validateExistingSubscription(userId: string): Promise<void> {
    const existingSubscription = await this.prisma.user_subscriptions.findFirst(
      {
        where: {
          user_id: userId,
          status: {
            in: ['active', 'trialing'],
          },
        },
      },
    );

    if (existingSubscription) {
      this.logger.warn(`User ${userId} already has an active subscription`, {
        subscriptionId: existingSubscription.stripe_subscription_id,
        status: existingSubscription.status,
      });

      throw new BadRequestException('User already has an active subscription');
    }
  }

  /**
   * Create Stripe checkout session
   */
  private async createCheckoutSession(
    customerId: string,
    createCheckoutDto: CreateCheckoutSessionDto,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [
          {
            price: createCheckoutDto.priceId,
            quantity: 1,
          },
        ],
        success_url: createCheckoutDto.successUrl,
        cancel_url: createCheckoutDto.cancelUrl,
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        payment_method_types: ['card'],
        subscription_data: {
          metadata: {
            created_by: 'checkout_service',
          },
        },
        metadata: {
          created_by: 'checkout_service',
        },
      });

      return session;
    } catch (error) {
      this.logger.error(
        `Error creating Stripe checkout session for customer ${customerId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Retrieve checkout session details
   */
  async getCheckoutSession(
    sessionId: string,
  ): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription', 'customer'],
      });

      return session;
    } catch (error) {
      this.logger.error(
        `Error retrieving checkout session ${sessionId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Handle successful checkout session completion
   * This would typically be called from a webhook handler
   */
  async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    try {
      if (session.mode !== 'subscription' || !session.subscription) {
        this.logger.warn(
          `Checkout session ${session.id} is not a subscription`,
        );
        return;
      }

      // Get the subscription details
      const subscription = await this.stripe.subscriptions.retrieve(
        session.subscription as string,
      );

      // Update our database with the new subscription
      // This logic would be handled by the SubscriptionService
      this.logger.log(
        `Checkout session completed for subscription ${subscription.id}`,
        {
          sessionId: session.id,
          customerId: session.customer,
        },
      );
    } catch (error) {
      this.logger.error(
        `Error handling completed checkout session ${session.id}`,
        error,
      );
      throw error;
    }
  }
}
