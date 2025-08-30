import { IsString, IsUrl, IsOptional, IsNotEmpty, IsIn } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNotEmpty()
  @IsString()
  priceId: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  successUrl?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  cancelUrl?: string;

  @IsOptional()
  @IsIn(['payment', 'subscription', 'setup'])
  mode?: 'payment' | 'subscription' | 'setup';
}

export class ResponseDto<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
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

  @IsUrl({ require_tld: false })
  @IsOptional()
  returnUrl?: string;
}
