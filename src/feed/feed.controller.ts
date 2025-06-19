import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { FeedService } from './services/feed.service';
import { ValidateFeedDto, ExtractContentDto } from './dto/feed.dto';

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Valida feed e retorna URLs dos últimos 5 itens
   * GET /feed/validate?url=https://example.com/feed
   */
  @Get('validate')
  @UsePipes(new ValidationPipe({ transform: true }))
  async validateFeed(@Query() query: ValidateFeedDto) {
    try {
      const result = await this.feedService.getFeedItems(query.url);
      return {
        success: true,
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
   */
  @Get('extract')
  @UsePipes(new ValidationPipe({ transform: true }))
  async extractContent(@Query() query: ExtractContentDto) {
    try {
      const result = await this.feedService.extractContent(query.url);
      return {
        success: true,
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
