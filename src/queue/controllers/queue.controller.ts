import { Controller, Get, Post, Delete, UseGuards } from '@nestjs/common';
import { AppAuthGuard } from '../../auth/guards/auth.guard';
import { FeedQueueService } from '../services/feed-queue.service';
import { QueueHealthService } from '../services/queue-health.service';

@Controller('queue')
@UseGuards(AppAuthGuard)
export class QueueController {
  constructor(
    private readonly feedQueueService: FeedQueueService,
    private readonly queueHealthService: QueueHealthService,
  ) {}

  @Get('stats')
  async getQueueStats() {
    return await this.feedQueueService.getQueueStats();
  }

  @Get('health')
  async getQueueHealth() {
    return await this.queueHealthService.getHealthStatus();
  }

  @Post('schedule-all')
  async scheduleAllFeeds() {
    await this.feedQueueService.scheduleAllFeedsProcessing();
    return { message: 'All feeds scheduled for processing' };
  }

  @Delete('failed-jobs')
  async clearFailedJobs() {
    const result = await this.queueHealthService.clearFailedJobs();
    return {
      message: `Cleared ${result.cleared} failed jobs`,
      details: result,
    };
  }
}
