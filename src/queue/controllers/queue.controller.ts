import { Controller, Post, UseGuards } from '@nestjs/common';
import { QStashSchedulerGuard } from '../../auth/guards/qstash-scheduler.guard';
import { FeedQueueService } from '../services/feed-queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly feedQueueService: FeedQueueService) {}

  /**
   * Endpoint para agendar processamento de todos os feeds
   * Autenticado via header Upstash-Schedule-Id do QStash scheduler
   */
  @Post('schedule-all')
  @UseGuards(QStashSchedulerGuard)
  async scheduleAllFeeds() {
    await this.feedQueueService.scheduleAllFeedsProcessing();
    return { message: 'All feeds scheduled for processing' };
  }
}
