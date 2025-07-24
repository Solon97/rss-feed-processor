import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  CurrentUser,
  UserInfo,
} from '../../auth/decorators/current-user.decorator';
import { AppAuthGuard } from '../../auth/guards/auth.guard';
import {
  CheckoutSessionResponseDto,
  CreateCheckoutSessionDto,
  ResponseDto,
} from '../dto/checkout.dto';
import { CheckoutService } from '../services/checkout.service';

@Controller('stripe/checkout')
@UseGuards(AppAuthGuard)
export class CheckoutController {
  private readonly logger = new Logger(CheckoutController.name);

  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('')
  async createCheckoutSession(
    @CurrentUser() user: UserInfo,
    @Body() createCheckoutDto: CreateCheckoutSessionDto,
  ): Promise<ResponseDto<CheckoutSessionResponseDto>> {
    this.logger.log(`Creating checkout session for user ${user.id}`);

    const checkoutData =
      await this.checkoutService.createSubscriptionCheckoutSession(
        user,
        createCheckoutDto,
      );
    return {
      success: true,
      data: checkoutData,
    };
  }

  @Get('session/:sessionId')
  async getCheckoutSession(@Param('sessionId') sessionId: string) {
    this.logger.log(`Retrieving checkout session ${sessionId}`);

    return this.checkoutService.getCheckoutSession(sessionId);
  }
}
