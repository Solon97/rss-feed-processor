import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Stripe from 'stripe';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('STRIPE_CLIENT') private readonly stripe: Stripe,
  ) {}

  /**
   * Create or update user subscription from Stripe webhook data
   */
  async upsertUserSubscription(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const userId = subscription.metadata?.user_id;

    if (!userId) {
      this.logger.warn('Subscription missing user_id in metadata', {
        subscriptionId: subscription.id,
      });
      return;
    }
    const item = subscription.items.data[0];
    try {
      // Log do objeto subscription para ver propriedades disponíveis
      this.logger.log('Subscription object properties', {
        subscriptionId: subscription.id,
        availableProps: Object.keys(subscription),
        itemCount: subscription.items.data.length,
        firstItemProps: subscription.items.data[0]
          ? Object.keys(subscription.items.data[0])
          : [],
        periodStart: subscription.items.data[0]?.current_period_start,
        periodEnd: subscription.items.data[0]?.current_period_end,
      });

      // Usar current_period_start e current_period_end dos itens da subscription
      const currentPeriodStart = item.current_period_start
        ? new Date(item.current_period_start * 1000)
        : new Date(subscription.created * 1000);

      const currentPeriodEnd = item.current_period_end
        ? new Date(item.current_period_end * 1000)
        : new Date(subscription.created * 1000);

      await this.prisma.user_subscriptions.upsert({
        where: {
          stripe_subscription_id: subscription.id,
        },
        update: {
          status: subscription.status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          updated_at: new Date(),
        },
        create: {
          user_id: userId,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer as string,
          status: subscription.status,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
        },
      });

      this.logger.log(`User subscription upserted for user ${userId}`, {
        subscriptionId: subscription.id,
        status: subscription.status,
      });
    } catch (error) {
      this.logger.error('Error upserting user subscription', error);
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(
    stripeSubscriptionId: string,
    status: string,
  ): Promise<void> {
    try {
      // Primeiro tenta fazer o update
      const updateResult = await this.prisma.user_subscriptions.updateMany({
        where: {
          stripe_subscription_id: stripeSubscriptionId,
        },
        data: {
          status,
          updated_at: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Se não encontrou registro para atualizar, vamos buscar informações do Stripe
        this.logger.warn(
          `Subscription not found in database: ${stripeSubscriptionId}. Fetching from Stripe...`,
        );

        try {
          const stripeSubscription =
            await this.stripe.subscriptions.retrieve(stripeSubscriptionId);

          // Busca o customer para obter mais informações
          const customer = await this.stripe.customers.retrieve(
            stripeSubscription.customer as string,
          );

          // Cria o registro da subscription se temos as informações necessárias
          if (customer && !customer.deleted && (customer as any).email) {
            this.logger.log(
              `Creating subscription record for: ${(customer as any).email}`,
            );

            // Aqui você pode implementar a lógica para criar o registro da subscription
            // Por enquanto, vamos só logar o problema
            this.logger.error(
              `Subscription ${stripeSubscriptionId} exists in Stripe but not in database. Manual intervention may be required.`,
              {
                customerId: customer.id,
                customerEmail: (customer as any).email,
                subscriptionStatus: stripeSubscription.status,
              },
            );
          }
        } catch (stripeError) {
          this.logger.error(
            `Error fetching subscription from Stripe: ${stripeSubscriptionId}`,
            stripeError,
          );
        }
      } else {
        this.logger.log(`Subscription status updated`, {
          subscriptionId: stripeSubscriptionId,
          status,
        });
      }
    } catch (error) {
      this.logger.error('Error updating subscription status', error);
      throw error;
    }
  }

  /**
   * Update subscription metadata in Stripe
   */
  async updateSubscriptionMetadata(
    subscriptionId: string,
    userId: string,
  ): Promise<void> {
    try {
      this.logger.log('Updating subscription metadata in Stripe', {
        subscriptionId,
        userId,
      });

      await this.stripe.subscriptions.update(subscriptionId, {
        metadata: {
          user_id: userId,
        },
      });

      this.logger.log('Successfully updated subscription metadata', {
        subscriptionId,
        userId,
      });
    } catch (error) {
      this.logger.error(
        `Error updating subscription metadata for ${subscriptionId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user subscription by user ID
   */
  async getUserSubscription(userId: string) {
    try {
      const now = new Date();
      const subscription = await this.prisma.user_subscriptions.findFirst({
        where: {
          user_id: userId,
          status: {
            in: ['active', 'trialing'],
          },
        },
        orderBy: { created_at: 'desc' },
      });

      if (!subscription) return null;

      // If trialing and expired -> mark expired_trial
      if (
        subscription.status === 'trialing' &&
        subscription.current_period_end.getTime() <= now.getTime()
      ) {
        await this.prisma.user_subscriptions.update({
          where: { id: subscription.id },
          data: { status: 'expired_trial', updated_at: now },
        });
        this.logger.log(`Expired trial updated for user ${userId}`, {
          subscriptionId: subscription.id,
        });
        return null; // No active subscription anymore
      }

      return subscription;
    } catch (error) {
      this.logger.error(
        `Error fetching subscription for user ${userId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      return !!subscription;
    } catch (error) {
      this.logger.error(
        `Error checking subscription for user ${userId}`,
        error,
      );
      return false;
    }
  }

  /**
   * Get user ID from Stripe subscription ID
   */
  async getUserIdFromSubscription(
    stripeSubscriptionId: string,
  ): Promise<string | null> {
    try {
      const subscription = await this.prisma.user_subscriptions.findUnique({
        where: {
          stripe_subscription_id: stripeSubscriptionId,
        },
        select: {
          user_id: true,
        },
      });

      return subscription?.user_id || null;
    } catch (error) {
      this.logger.error(
        `Error fetching user ID for subscription ${stripeSubscriptionId}`,
        error,
      );
      return null;
    }
  }
}
