import { IsString, IsUrl, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  priceId: string;

  @IsUrl()
  @IsOptional()
  successUrl?: string;

  @IsUrl()
  @IsOptional()
  cancelUrl?: string;

  @IsOptional()
  @IsIn(['payment', 'subscription', 'setup'])
  mode?: 'payment' | 'subscription' | 'setup';
}

export class CheckoutSessionResponseDto {
  sessionId: string;
  checkoutUrl: string;
  customerId: string;
  expiresAt: number;
}

export class PortalSessionDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsUrl()
  @IsOptional()
  returnUrl?: string;
}
