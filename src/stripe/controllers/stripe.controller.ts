import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AppAuthGuard } from '@/auth/guards/auth.guard';
import { IsStripeEnabledGuard } from '../../common/guards/stripe-enabled.guard';
import { StripeService } from '../services/stripe.service';

@Controller('stripe')
@UseGuards(IsStripeEnabledGuard, AppAuthGuard)
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * Get all available prices
   */
  @Get('prices')
  async getPrices() {
    const prices = await this.stripeService.getActivePrices();
    return {
      success: true,
      data: prices,
    };
  }

  /**
   * Get a specific price
   */
  @Get('prices/:id')
  async getPrice(@Param('id') id: string) {
    const price = await this.stripeService.getPrice(id);
    return {
      success: true,
      data: price,
    };
  }
}
