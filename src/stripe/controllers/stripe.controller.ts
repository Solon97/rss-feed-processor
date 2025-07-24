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
    return this.stripeService.getActivePrices();
  }

  /**
   * Get a specific price
   */
  @Get('prices/:id')
  async getPrice(@Param('id') id: string) {
    return this.stripeService.getPrice(id);
  }
}
