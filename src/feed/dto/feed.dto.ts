import {
  IsUrl,
  IsNotEmpty,
  IsBoolean,
  IsEnum,
  IsUUID,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class ValidateFeedDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'URL deve ser uma URL válida com protocolo (http/https)' },
  )
  @IsNotEmpty({ message: 'URL é obrigatória' })
  url: string;
}

export class ExtractContentDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'URL deve ser uma URL válida com protocolo (http/https)' },
  )
  @IsNotEmpty({ message: 'URL é obrigatória' })
  url: string;
}

export class CreateUserFeedDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'URL deve ser uma URL válida com protocolo (http/https)' },
  )
  @IsNotEmpty({ message: 'URL é obrigatória' })
  url: string;

  @IsUUID(4, { message: 'topic_id deve ser um UUID válido' })
  @IsNotEmpty({ message: 'topic_id é obrigatório' })
  topic_id: string;

  get topicId(): string {
    return this.topic_id;
  }
}

export class UpdateUserFeedStatusDto {
  @IsBoolean({ message: 'is_active deve ser um valor booleano' })
  is_active: boolean;
}

export class UpdateNotificationSettingsDto {
  @IsBoolean({ message: 'notification_enabled deve ser um valor booleano' })
  notification_enabled: boolean;

  @IsEnum(['immediate', 'daily', 'weekly', 'never'], {
    message:
      'notification_frequency deve ser immediate, daily, weekly ou never',
  })
  notification_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
}

export class UserFeedParamsDto {
  @IsUUID(4, { message: 'feed_id deve ser um UUID válido' })
  feed_id: string;
}

export class GetFeedItemsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro' })
  @Min(1, { message: 'limit deve ser no mínimo 1' })
  @Max(100, { message: 'limit deve ser no máximo 100' })
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsInt({ message: 'offset deve ser um número inteiro' })
  @Min(0, { message: 'offset deve ser no mínimo 0' })
  offset?: number = 0;

  @IsOptional()
  @IsString({ message: 'sort deve ser uma string' })
  @IsEnum(['created_at', 'published_at'], {
    message: 'sort deve ser created_at ou published_at',
  })
  sort?: 'created_at' | 'published_at' = 'published_at';

  @IsOptional()
  @IsString({ message: 'order deve ser uma string' })
  @IsEnum(['asc', 'desc'], {
    message: 'order deve ser asc ou desc',
  })
  order?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString({ message: 'title deve ser uma string' })
  title?: string;

  @IsOptional()
  @IsUUID(4, { message: 'feed_id deve ser um UUID válido' })
  feed_id?: string;

  @IsOptional()
  @IsString({ message: 'feed_type deve ser uma string' })
  @IsEnum(['rss', 'youtube'], {
    message: 'feed_type deve ser rss ou youtube',
  })
  feed_type?: 'rss' | 'youtube';

  @IsOptional()
  @IsUUID(4, { message: 'topic_id deve ser um UUID válido' })
  topic_id?: string;

  get feedId(): string | undefined {
    return this.feed_id;
  }

  get feedType(): 'rss' | 'youtube' | undefined {
    return this.feed_type;
  }

  get topicId(): string | undefined {
    return this.topic_id;
  }
}

export class ParseFeedDto {
  @IsUrl(
    { require_protocol: true },
    { message: 'URL deve ser uma URL válida com protocolo (http/https)' },
  )
  @IsNotEmpty({ message: 'URL é obrigatória' })
  url: string;
}

export class FeedItemParamsDto {
  @IsUUID(4, { message: 'feed_item_id deve ser um UUID válido' })
  feed_item_id: string;
}
