import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { FeedService } from '../../feed/feed.service';
import Stripe from 'stripe';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly feedService: FeedService,
  ) {}

  /**
   * Process Stripe webhook events
   */
  async processWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.resumed':
        case 'customer.subscription.paused':
          this.logger.log(`Processing webhook event: ${event.type}`, {
            eventId: event.id,
          });
          await this.handleSubscriptionUpsert(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'customer.subscription.deleted':
          this.logger.log(`Processing webhook event: ${event.type}`, {
            eventId: event.id,
          });
          await this.handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
          );
          break;

        case 'invoice.payment_succeeded':
        case 'invoice.paid': // Novo evento que substitui invoice.payment_succeeded
          this.logger.log(`Processing webhook event: ${event.type}`, {
            eventId: event.id,
          });
          await this.handlePaymentSucceeded(
            event.data.object as Stripe.Invoice,
          );
          break;

        case 'invoice.payment_failed':
          this.logger.log(`Processing webhook event: ${event.type}`, {
            eventId: event.id,
          });
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'checkout.session.completed':
          this.logger.log(`Processing webhook event: ${event.type}`, {
            eventId: event.id,
          });
          await this.handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
          );
          break;

        // Adiciona suporte para invoice_payment.paid (novo formato do Stripe)
        case 'invoice_payment.paid':
          this.logger.log(`Processing webhook event: ${event.type}`, {
            eventId: event.id,
          });
          await this.handleInvoicePaymentPaid(event.data.object as any);
          break;

        default:
          this.logger.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Error processing webhook event ${event.type}`, error);
      throw error;
    }
  }

  /**
   * Handle checkout session completion
   */
  private async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    this.logger.log('Processing checkout session completion', {
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
    });

    // Se a session tem subscription, vamos buscar e atualizar os metadados
    if (session.subscription && session.client_reference_id) {
      try {
        // O client_reference_id deve conter o user_id
        const userId = session.client_reference_id;

        this.logger.log('Updating subscription metadata with user_id', {
          subscriptionId: session.subscription,
          userId,
        });

        // Atualizar os metadados da subscription com o user_id
        // Isso será usado quando o webhook de subscription.created for processado
        await this.subscriptionService.updateSubscriptionMetadata(
          session.subscription as string,
          userId,
        );
      } catch (error) {
        this.logger.error(
          `Error updating subscription metadata from checkout session ${session.id}`,
          error,
        );
      }
    }
  }

  /**
   * Handle subscription creation/update
   */
  private async handleSubscriptionUpsert(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log('Processing subscription upsert', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });

    await this.subscriptionService.upsertUserSubscription(subscription);

    const activeStatuses = ['active', 'trialing'];
    if (!activeStatuses.includes(subscription.status)) {
      await this.deactivateAllUserFeeds(subscription.id);
    }
  }

  /**
   * Handle subscription deletion
   */
  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    this.logger.log('Processing subscription deletion', {
      subscriptionId: subscription.id,
    });

    // Update subscription status
    await this.subscriptionService.updateSubscriptionStatus(
      subscription.id,
      'canceled',
    );

    await this.deactivateAllUserFeeds(subscription.id);
  }

  /**
   * Handle successful payment
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    // Para invoices, o subscription está diretamente no campo 'subscription'
    const subscriptionId = (invoice as any).subscription;

    if (subscriptionId && typeof subscriptionId === 'string') {
      this.logger.log('Processing successful payment', {
        invoiceId: invoice.id,
        subscriptionId,
      });

      await this.subscriptionService.updateSubscriptionStatus(
        subscriptionId,
        'active',
      );
    } else {
      this.logger.warn(
        'No subscription ID found in successful payment invoice',
        {
          invoiceId: invoice.id,
          subscription: subscriptionId,
        },
      );
    }
  }

  /**
   * Handle failed payment
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription;

    if (subscriptionId && typeof subscriptionId === 'string') {
      this.logger.log('Processing failed payment', {
        invoiceId: invoice.id,
        subscriptionId,
      });

      await this.subscriptionService.updateSubscriptionStatus(
        subscriptionId,
        'past_due',
      );

      await this.deactivateAllUserFeeds(subscriptionId);
    } else {
      this.logger.warn('No subscription ID found in failed payment invoice', {
        invoiceId: invoice.id,
        subscription: subscriptionId,
      });
    }
  }

  private async deactivateAllUserFeeds(subscriptionId: string): Promise<void> {
    const userId =
      await this.subscriptionService.getUserIdFromSubscription(subscriptionId);

    if (userId) {
      await this.feedService.deactivateAllUserFeeds(userId);
      this.logger.warn(
        'All feeds deactivated due to subscription status change',
      );
    }
  }

  /**
   * Handle invoice_payment.paid event
   */
  private async handleInvoicePaymentPaid(invoicePayment: any): Promise<void> {
    // O evento invoice_payment.paid tem uma estrutura diferente
    // Vamos extrair o subscription_id se disponível
    const subscriptionId = invoicePayment.subscription;

    if (subscriptionId && typeof subscriptionId === 'string') {
      this.logger.log('Processing invoice payment paid', {
        invoicePaymentId: invoicePayment.id,
        subscriptionId,
      });

      await this.subscriptionService.updateSubscriptionStatus(
        subscriptionId,
        'active',
      );
    } else {
      this.logger.warn(
        'No subscription ID found in invoice payment paid event',
        {
          invoicePaymentId: invoicePayment.id,
          subscription: subscriptionId,
        },
      );
    }
  }
}
