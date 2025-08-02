import { IsString, IsEmail, IsOptional, IsObject } from 'class-validator';

export class UserMetaData {
  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  full_name?: string;
}

export class UserRecord {
  @IsObject()
  raw_user_meta_data: UserMetaData;
}

export class WebhookUserDto {
  @IsObject()
  record: UserRecord;
}
