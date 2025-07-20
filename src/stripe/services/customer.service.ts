import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';
import { UserInfo } from '../../auth/decorators/current-user.decorator';
import { StripeCustomerData } from '../interfaces/stripe.interfaces';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  /**
   * Get or create a Stripe customer for the user
   */
  async getOrCreateCustomer(user: UserInfo): Promise<StripeCustomerData> {
    try {
      // First, check if customer already exists in our database
      const existingCustomer = await this.prisma.stripe_customers.findUnique({
        where: { user_id: user.id },
      });

      if (existingCustomer) {
        this.logger.log(`Using existing customer for user ${user.id}`, {
          customerId: existingCustomer.stripe_customer_id,
        });

        return {
          stripeCustomerId: existingCustomer.stripe_customer_id,
          email: existingCustomer.email,
        };
      }

      // If no customer exists, create one in Stripe
      const stripeCustomer = await this.createStripeCustomer(user);

      // Store the customer relationship in our database
      await this.storeCustomerRelationship(user.id, stripeCustomer);

      this.logger.log(`Created new customer for user ${user.id}`, {
        customerId: stripeCustomer.id,
      });

      return {
        stripeCustomerId: stripeCustomer.id,
        email: stripeCustomer.email!,
      };
    } catch (error) {
      this.logger.error(
        `Error getting or creating customer for user ${user.id}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create customer in Stripe
   */
  private async createStripeCustomer(user: UserInfo): Promise<Stripe.Customer> {
    if (!user.email) {
      const error = new Error(
        'User email is required to create Stripe customer',
      );
      this.logger.error(
        `Cannot create Stripe customer for user ${user.id}: missing email`,
      );
      throw error;
    }

    try {
      this.logger.log(
        `Creating Stripe customer for user ${user.id} with email ${user.email}`,
      );

      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
          created_by: 'subscription_service',
        },
      });

      this.logger.log(
        `Successfully created Stripe customer ${customer.id} for user ${user.id}`,
      );
      return customer;
    } catch (error) {
      this.logger.error(`Error creating Stripe customer for user ${user.id}:`, {
        error: error.message,
        userId: user.id,
        email: user.email,
        type: error.constructor.name,
      });

      if (error instanceof Stripe.errors.StripeError) {
        throw new Error(
          `Stripe API error: ${error.message} (Code: ${error.code})`,
        );
      }

      throw error;
    }
  }

  /**
   * Store customer relationship in database
   */
  private async storeCustomerRelationship(
    userId: string,
    stripeCustomer: Stripe.Customer,
  ): Promise<void> {
    try {
      await this.prisma.stripe_customers.create({
        data: {
          user_id: userId,
          stripe_customer_id: stripeCustomer.id,
          email: stripeCustomer.email!,
        },
      });
    } catch (error) {
      // If storing the relationship fails, we should clean up the Stripe customer
      this.logger.error(
        `Error storing customer relationship for user ${userId}. Attempting cleanup...`,
        error,
      );

      try {
        await this.stripe.customers.del(stripeCustomer.id);
        this.logger.log(`Cleaned up Stripe customer ${stripeCustomer.id}`);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to cleanup Stripe customer ${stripeCustomer.id}`,
          cleanupError,
        );
      }

      throw error;
    }
  }

  /**
   * Get customer by user ID
   */
  async getCustomerByUserId(
    userId: string,
  ): Promise<StripeCustomerData | null> {
    try {
      const customer = await this.prisma.stripe_customers.findUnique({
        where: { user_id: userId },
      });

      if (!customer) {
        return null;
      }

      return {
        stripeCustomerId: customer.stripe_customer_id,
        email: customer.email,
      };
    } catch (error) {
      this.logger.error(`Error fetching customer for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Delete customer relationship (for cleanup purposes)
   */
  async deleteCustomerRelationship(userId: string): Promise<void> {
    try {
      await this.prisma.stripe_customers.delete({
        where: { user_id: userId },
      });

      this.logger.log(`Deleted customer relationship for user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Error deleting customer relationship for user ${userId}`,
        error,
      );
      throw error;
    }
  }
}
