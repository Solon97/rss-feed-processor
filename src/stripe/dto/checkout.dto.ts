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
  sessionId?: string; // Optional for trial
  checkoutUrl?: string; // Optional for trial
  customerId?: string; // Optional for trial (only after Stripe customer exists)
  expiresAt?: number; // Unix timestamp
  isTrial?: boolean; // Indicates this is a local trial record
}

export class PortalSessionDto {
  @IsNotEmpty()
  @IsString()
  customerId: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  returnUrl?: string;
}
