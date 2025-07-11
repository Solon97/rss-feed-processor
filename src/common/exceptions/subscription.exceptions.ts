import { NotFoundException } from '@nestjs/common';

/**
 * Exception para feed não encontrado ou inválido
 */
export class SubscriptionNotFoundException extends NotFoundException {
  constructor() {
    super({
      error: 'SUBSCRIPTION_NOT_FOUND',
      message: 'Subscription not found',
    });
  }
}
