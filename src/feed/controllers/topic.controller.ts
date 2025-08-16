import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import { Authenticated } from '../../auth/decorators/auth.decorators';
import {
  CurrentUser,
  UserInfo,
} from '../../auth/decorators/current-user.decorator';
import { ErrorLoggingInterceptor } from '../../common/interceptors/error-logging.interceptor';
import { CustomValidationPipe } from '../../common/pipes/custom-validation.pipe';
import {
  TopicAlreadyExistsException,
  TopicHasActiveFeedsException,
  TopicManagementService,
  TopicNotFoundException,
} from '../application/services/topic-management.service';
import { CreateTopicDto, TopicResponseDto } from '../dto/topic.dto';

@Controller('topics')
@Authenticated()
@UseInterceptors(ErrorLoggingInterceptor)
export class TopicController {
  constructor(
    private readonly topicManagementService: TopicManagementService,
  ) {}

  /**
   * Cria um novo tópico para o usuário
   * POST /topics
   * Requer autenticação JWT do Supabase
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new CustomValidationPipe())
  async createTopic(
    @Body() createTopicDto: CreateTopicDto,
    @CurrentUser() user: UserInfo,
  ): Promise<TopicResponseDto> {
    try {
      return await this.topicManagementService.createTopic(
        user.id,
        createTopicDto.name,
        createTopicDto.color,
      );
    } catch (error) {
      if (error instanceof TopicAlreadyExistsException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }

  /**
   * Lista todos os tópicos do usuário
   * GET /topics
   * Requer autenticação JWT do Supabase
   */
  @Get()
  async getUserTopics(
    @CurrentUser() user: UserInfo,
    @Query('has_active_feeds') hasActiveFeeds: boolean,
  ): Promise<TopicResponseDto[]> {
    return this.topicManagementService.getUserTopics(user.id, hasActiveFeeds);
  }

  /**
   * Exclui um tópico do usuário
   * DELETE /topics/:id
   * Requer autenticação JWT do Supabase
   * Valida se o tópico não possui feeds relacionados antes da exclusão
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTopic(
    @Param('id') topicId: string,
    @CurrentUser() user: UserInfo,
  ): Promise<void> {
    try {
      await this.topicManagementService.deleteTopic(user.id, topicId);
    } catch (error) {
      if (error instanceof TopicNotFoundException) {
        throw new NotFoundException(error.message);
      }
      if (error instanceof TopicHasActiveFeedsException) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}
