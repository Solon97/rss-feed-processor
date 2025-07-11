import {
  Controller,
  Get,
  Param,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Authenticated } from '../../auth/decorators/auth.decorators';
import { ErrorLoggingInterceptor } from '../../common/interceptors/error-logging.interceptor';
import { CustomValidationPipe } from '../../common/pipes/custom-validation.pipe';
import {
  GetUserSubscriptionParamsDto,
  UserSubscriptionResponseDto,
} from '../dto/subscription.dto';
import { SubscriptionService } from '../services/subscription.service';

@Controller('subscriptions')
@UseInterceptors(ErrorLoggingInterceptor)
@UsePipes(CustomValidationPipe)
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /**
   * Busca todas as inscrições de um usuário específico
   * GET /subscriptions/user/:userId
   */
  @Get('user/:userId')
  @Authenticated()
  async getUserSubscriptions(
    @Param() params: GetUserSubscriptionParamsDto,
  ): Promise<UserSubscriptionResponseDto[]> {
    return this.subscriptionService.findByUserId(params.userId);
  }

  /**
   * Busca a inscrição ativa de um usuário específico
   * GET /subscriptions/user/:userId/active
   */
  @Get('user/:userId/active')
  @Authenticated()
  async getUserActiveSubscription(
    @Param() params: GetUserSubscriptionParamsDto,
  ): Promise<UserSubscriptionResponseDto | null> {
    return this.subscriptionService.findActiveByUserId(params.userId);
  }
}
