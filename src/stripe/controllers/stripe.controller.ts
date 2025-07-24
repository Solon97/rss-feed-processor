import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { StripeService } from '../services/stripe.service';
import { AppAuthGuard } from '@/auth/guards/auth.guard';

@Controller('stripe')
@UseGuards(AppAuthGuard)
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  /**
   * Get all available prices
   */
  @Get('prices')
  async getPrices() {
    const prices = this.stripeService.getActivePrices();
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
    const price = this.stripeService.getPrice(id);
    return {
      success: true,
      data: price,
    };
  }
}
