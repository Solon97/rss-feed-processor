import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UsePipes,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import {
  ValidateFeedDto,
  ExtractContentDto,
  CreateUserFeedDto,
} from './dto/feed.dto';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import {
  CurrentUser,
  UserInfo,
} from '../auth/decorators/current-user.decorator';
import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { CustomValidationPipe } from '../common/pipes/custom-validation.pipe';

@Controller('feed')
@UseGuards(SupabaseJwtAuthGuard)
@UseInterceptors(ErrorLoggingInterceptor)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Valida feed e retorna URLs dos últimos 5 itens
   * GET /feed/validate?url=https://example.com/feed
   * Requer autenticação JWT do Supabase
   */
  @Get('validate')
  @UsePipes(new CustomValidationPipe())
  async validateFeed(@Query() query: ValidateFeedDto) {
    const result = await this.feedService.validateFeed(query.url);
    return result;
  }

  /**
   * Extrai conteúdo de uma URL específica
   * GET /feed/extract?url=https://example.com/article
   * Requer autenticação JWT do Supabase
   */
  @Get('extract')
  @UsePipes(new CustomValidationPipe())
  async extractContent(@Query() query: ExtractContentDto) {
    const result = await this.feedService.extractContent(query.url);
    return result;
  }

  /**
   * Cria uma inscrição de feed para o usuário
   * POST /feed/subscribe
   * Body: { url: "https://example.com/feed" }
   * Requer autenticação JWT do Supabase
   */
  @Post('subscribe')
  @UsePipes(new CustomValidationPipe())
  async createUserFeed(
    @Body() body: CreateUserFeedDto,
    @CurrentUser() user: UserInfo,
  ) {
    const result = await this.feedService.createUserFeed(user.id, body.url);
    return result;
  }
}
