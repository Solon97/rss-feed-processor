import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class IsStripeEnabledGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    if (process.env.ENABLE_STRIPE !== 'true') {
      throw new ForbiddenException('Stripe integration is disabled');
    }
    return true;
  }
}
