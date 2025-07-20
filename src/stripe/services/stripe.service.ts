import { Injectable, Inject, Logger } from '@nestjs/common';
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

  constructor(@Inject('STRIPE_CLIENT') private readonly stripe: Stripe) {}

  /**
   * Get all available prices with optional filtering
   */
  async getActivePrices(): Promise<PricesResponse> {
    try {
      const pricesResponse = await this.stripe.prices.list({
        expand: ['data.product'],
      });

      const prices = pricesResponse.data.reduce((acc, price) => {
        if (price.recurring?.interval === 'month') {
          acc.monthly = {
            id: price.id,
            interval: price.recurring.interval,
            unit_amount: price.unit_amount || 0,
            currency: price.currency,
          };
        } else if (price.recurring?.interval === 'year') {
          acc.yearly = {
            id: price.id,
            interval: price.recurring.interval,
            unit_amount: price.unit_amount || 0,
            currency: price.currency,
          };
        }
        return acc;
      }, {} as PricesResponse);

      return prices;
    } catch (error) {
      this.logger.error('Error fetching prices from Stripe', error);
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
