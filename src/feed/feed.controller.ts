import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { FeedService } from './services/feed.service';
import { ValidateFeedDto, ExtractContentDto } from './dto/feed.dto';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import {
  CurrentUser,
  UserInfo,
} from '../auth/decorators/current-user.decorator';

@Controller('feed')
@UseGuards(SupabaseJwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Valida feed e retorna URLs dos últimos 5 itens
   * GET /feed/validate?url=https://example.com/feed
   * Requer autenticação JWT do Supabase
   */
  @Get('validate')
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateFeed(
    @Query() query: ValidateFeedDto,
    @CurrentUser() user: UserInfo,
  ) {
    try {
      const result = await this.feedService.getFeedItems(query.url);
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Extrai conteúdo de uma URL específica
   * GET /feed/extract?url=https://example.com/article
   * Requer autenticação JWT do Supabase
   */
  @Get('extract')
  @UsePipes(new ValidationPipe({ transform: true }))
  async extractContent(
    @Query() query: ExtractContentDto,
    @CurrentUser() user: UserInfo,
  ) {
    try {
      const result = await this.feedService.extractContent(query.url);
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
