import {
  Controller,
  Post,
  Body,
  UseGuards,
  Logger,
  Get,
  Param,
} from '@nestjs/common';
import { AppAuthGuard } from '../../auth/guards/auth.guard';
import {
  CurrentUser,
  UserInfo,
} from '../../auth/decorators/current-user.decorator';
import { CheckoutService } from '../services/checkout.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
} from '../dto/checkout.dto';

@Controller('stripe/checkout')
@UseGuards(AppAuthGuard)
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);

  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('')
  async createCheckoutSession(
    @CurrentUser() user: UserInfo,
    @Body() createCheckoutDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(`Creating checkout session for user ${user.id}`);

    return this.checkoutService.createSubscriptionCheckoutSession(
      user,
      createCheckoutDto,
    );
  }

  @Get('session/:sessionId')
  async getCheckoutSession(@Param('sessionId') sessionId: string) {
    this.logger.log(`Retrieving checkout session ${sessionId}`);

    return this.checkoutService.getCheckoutSession(sessionId);
  }
}
