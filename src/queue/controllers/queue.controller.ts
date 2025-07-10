import { Controller, Post, UseGuards } from '@nestjs/common';
import { AppAuthGuard } from '../../auth/guards/auth.guard';
import { FeedQueueService } from '../services/feed-queue.service';

@Controller('queue')
@UseGuards(AppAuthGuard)
export class QueueController {
  constructor(private readonly feedQueueService: FeedQueueService) {}

  @Post('schedule-all')
  async scheduleAllFeeds() {
    await this.feedQueueService.scheduleAllFeedsProcessing();
    return { message: 'All feeds scheduled for processing' };
  }
}
