import {
  IsEmail,
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EmailActionType {
  SIGNUP = 'signup',
  RECOVERY = 'recovery',
  EMAIL_CHANGE = 'email_change',
}

export class UserDto {
  @IsString()
  id: string;

  @IsString()
  aud: string;

  @IsString()
  role: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsObject()
  app_metadata: Record<string, any>;

  @IsObject()
  user_metadata: Record<string, any>;

  @IsArray()
  identities: Record<string, any>[];

  @IsString()
  created_at: string;

  @IsString()
  updated_at: string;

  @IsBoolean()
  is_anonymous: boolean;
}

export class EmailDataDto {
  @IsString()
  token: string;

  @IsString()
  token_hash: string;

  @IsString()
  redirect_to: string;

  @IsEnum(EmailActionType)
  email_action_type: EmailActionType;

  @IsString()
  site_url: string;

  @IsOptional()
  @IsString()
  token_new?: string;

  @IsOptional()
  @IsString()
  token_hash_new?: string;
}

export class SupabaseEmailHookDto {
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto;

  @ValidateNested()
  @Type(() => EmailDataDto)
  email_data: EmailDataDto;
}
