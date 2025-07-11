import { IsUUID } from 'class-validator';

export class GetUserSubscriptionParamsDto {
  @IsUUID('4', { message: 'user_id deve ser um UUID válido' })
  userId: string;
}

export class UserSubscriptionResponseDto {
  id?: string;
  user_id: string;
  status: string;
  current_period_start?: Date;
  current_period_end?: Date;
}
