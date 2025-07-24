import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

export interface PricesResponse {
  monthly: {
    id: string;
    interval: 'month';
    unit_amount: number;
    currency?: string;
  };
  yearly: {
    id: string;
    interval: 'year';
    unit_amount: number;
    currency?: string;
  };
}
@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);

  constructor(
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get monthly and yearly prices using specific price IDs from environment
   */
  async getActivePrices(): Promise<PricesResponse> {
    try {
      const monthlyPriceId = this.configService.get<string>(
        'STRIPE_MONTHLY_PRICE_ID',
      );
      const yearlyPriceId = this.configService.get<string>(
        'STRIPE_YEARLY_PRICE_ID',
      );

      if (!monthlyPriceId || !yearlyPriceId) {
        throw new Error(
          'STRIPE_MONTHLY_PRICE_ID and STRIPE_YEARLY_PRICE_ID must be configured',
        );
      }

      const [monthlyPrice, yearlyPrice] = await Promise.all([
        this.stripe.prices.retrieve(monthlyPriceId, { expand: ['product'] }),
        this.stripe.prices.retrieve(yearlyPriceId, { expand: ['product'] }),
      ]);

      return {
        monthly: {
          id: monthlyPrice.id,
          interval: 'month',
          unit_amount: monthlyPrice.unit_amount || 0,
          currency: monthlyPrice.currency,
        },
        yearly: {
          id: yearlyPrice.id,
          interval: 'year',
          unit_amount: yearlyPrice.unit_amount || 0,
          currency: yearlyPrice.currency,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching specific prices from Stripe', error);
      throw error;
    }
  }

  /**
   * Get a specific price by ID
   */
  async getPrice(priceId: string): Promise<Stripe.Price> {
    try {
      return await this.stripe.prices.retrieve(priceId, {
        expand: ['product'],
      });
    } catch (error) {
      this.logger.error(`Error fetching price ${priceId} from Stripe`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    endpointSecret: string,
  ): Stripe.Event {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret,
      );
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
      throw error;
    }
  }
}
