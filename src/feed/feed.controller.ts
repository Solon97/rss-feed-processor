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
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import {
  CurrentUser,
  UserInfo,
} from '../auth/decorators/current-user.decorator';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { ErrorLoggingInterceptor } from '../common/interceptors/error-logging.interceptor';
import { CustomValidationPipe } from '../common/pipes/custom-validation.pipe';
import {
  CreateUserFeedDto,
  ExtractContentDto,
  FeedItemParamsDto,
  GetFeedItemsQueryDto,
  ParseFeedDto,
  UpdateNotificationSettingsDto,
  UpdateUserFeedStatusDto,
  UserFeedParamsDto,
  ValidateFeedDto,
} from './dto/feed.dto';
import { FeedService } from './feed.service';

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
   * Atualiza configurações de notificação de um feed do usuário
   * PUT /feed/user-feeds/:feed_id/notifications
   * Requer autenticação JWT do Supabase
   */
  @Put('user-feeds/:feed_id/notifications')
  @UsePipes(new CustomValidationPipe())
  async updateNotificationSettings(
    @Param() params: UserFeedParamsDto,
    @Body() body: UpdateNotificationSettingsDto,
    @CurrentUser() user: UserInfo,
  ) {
    await this.feedService.updateNotificationSettings(
      user.id,
      params.feed_id,
      body.notification_enabled,
      body.notification_frequency,
    );
    return { message: 'Configurações de notificação atualizadas com sucesso' };
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
   * Atualiza o timestamp de último acesso para todos os feeds do usuário
   * PUT /feed/user-feeds/last-viewed
   * Requer autenticação JWT do Supabase
   */
  @Put('user-feeds/last-viewed')
  async updateAllFeedsLastViewed(@CurrentUser() user: UserInfo) {
    // Para o HomePage, atualizamos todos os feeds do usuário de uma vez
    const userFeeds = await this.feedService.getUserFeeds(user.id);

    // Atualizamos todos os feeds ativos do usuário
    await Promise.all(
      userFeeds
        .filter((uf) => uf.is_active)
        .map((uf) => this.feedService.updateLastViewed(user.id, uf.feed_id)),
    );

    return { message: 'Timestamp de visualização atualizado com sucesso' };
  }

  /**
   * Atualiza o timestamp de último acesso para todos os feeds do usuário (rota alternativa)
   * PUT /feed/user-feeds/update-all-last-viewed
   * Requer autenticação JWT do Supabase
   */
  @Put('user-feeds/update-all-last-viewed')
  async updateAllFeedsLastViewedAlternative(@CurrentUser() user: UserInfo) {
    // Mesma implementação da rota anterior para compatibilidade
    const userFeeds = await this.feedService.getUserFeeds(user.id);

    // Atualizamos todos os feeds ativos do usuário
    await Promise.all(
      userFeeds
        .filter((uf) => uf.is_active)
        .map((uf) => this.feedService.updateLastViewed(user.id, uf.feed_id)),
    );

    return { message: 'Timestamp de visualização atualizado com sucesso' };
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
