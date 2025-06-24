import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Authenticated } from '../auth/decorators/auth.decorators';
import {
  CurrentUser,
  UserInfo,
} from '../auth/decorators/current-user.decorator';
import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { CustomValidationPipe } from '../common/pipes/custom-validation.pipe';
import {
  CreateUserFeedDto,
  FeedItemParamsDto,
  GetFeedItemsQueryDto,
  ParseFeedDto,
  UpdateUserFeedStatusDto,
  UserFeedParamsDto,
  ValidateFeedDto,
} from './dto/feed.dto';
import { FeedService } from './feed.service';

@Controller('feed')
@Authenticated()
@UseInterceptors(ErrorLoggingInterceptor)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Valida a url, para confirmar se é um feed RSS válido
   * GET /feed/validate?url=https://example.com/feed
   * Requer autenticação JWT do Supabase
   */
  @Get('validate')
  @UsePipes(new CustomValidationPipe())
  async validateFeed(@Query() query: ValidateFeedDto) {
    return this.feedService.getFeedItems(query.url);
  }

  /**
   * Processa feed RSS completo e retorna conteúdo dos 5 itens mais recentes
   * GET /feed/parse?url=https://example.com/feed&feedType=rss
   * Requer autenticação JWT do Supabase
   */
  @Get('parse')
  @UsePipes(new CustomValidationPipe())
  async parseFeed(@Query() query: ParseFeedDto) {
    return this.feedService.parseFeed(query.url);
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

  /**
   * Lista todos os feeds do usuário
   * GET /feed/user-feeds
   * Requer autenticação JWT do Supabase
   */
  @Get('user-feeds')
  async getUserFeeds(@CurrentUser() user: UserInfo) {
    const result = await this.feedService.getUserFeeds(user.id);
    return result;
  }

  /**
   * Atualiza o status ativo/inativo de um feed do usuário
   * PUT /feed/user-feeds/:feed_id/status
   * Requer autenticação JWT do Supabase
   */
  @Put('user-feeds/:feed_id/status')
  @UsePipes(new CustomValidationPipe())
  async updateUserFeedStatus(
    @Param() params: UserFeedParamsDto,
    @Body() body: UpdateUserFeedStatusDto,
    @CurrentUser() user: UserInfo,
  ) {
    await this.feedService.updateUserFeedStatus(
      user.id,
      params.feed_id,
      body.is_active,
    );
    return { message: 'Status do feed atualizado com sucesso' };
  }

  /**
   * Remove inscrição do usuário em um feed
   * DELETE /feed/user-feeds/:feed_id
   * Requer autenticação JWT do Supabase
   */
  @Delete('user-feeds/:feed_id')
  @UsePipes(new CustomValidationPipe())
  async unsubscribeFromFeed(
    @Param() params: UserFeedParamsDto,
    @CurrentUser() user: UserInfo,
  ) {
    await this.feedService.unsubscribeUserFromFeed(user.id, params.feed_id);
    return { message: 'Inscrição removida com sucesso' };
  }

  /**
   * Busca itens agregados dos feeds ativos do usuário
   * GET /feed/user-feed-items?limit=20&offset=0&sort=published_at&order=desc
   * Requer autenticação JWT do Supabase
   */
  @Get('user-feed-items')
  @UsePipes(new CustomValidationPipe())
  async getUserFeedItems(
    @Query() query: GetFeedItemsQueryDto,
    @CurrentUser() user: UserInfo,
  ) {
    const items = await this.feedService.getUserFeedItems(
      user.id,
      query.limit,
      query.offset,
      query.sort,
      query.order,
    );
    return items;
  }

  /**
   * Busca um feed item específico por ID
   * GET /feed/feed-item/:feed_item_id
   * Requer autenticação JWT do Supabase
   */
  @Get('feed-item/:feed_item_id')
  @UsePipes(new CustomValidationPipe())
  async getFeedItemById(
    @Param() params: FeedItemParamsDto,
    @CurrentUser() user: UserInfo,
  ) {
    const feedItem = await this.feedService.getFeedItemById(
      user.id,
      params.feed_item_id,
    );

    if (!feedItem) {
      throw new NotFoundException(
        'Feed item não encontrado nos feeds do usuário',
      );
    }

    return feedItem;
  }
}
