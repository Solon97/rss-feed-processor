import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { FeedProcessingModule } from '../feed-processing/feed-processing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueController } from './controllers/queue.controller';
import { WebhookController } from './controllers/webhook.controller';
import { FeedPriorityProcessor } from './processors/feed-priority.processor';
import { FeedDefaultProcessor } from './processors/feed-default.processor';
import { FeedQueueService } from './services/feed-queue.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    forwardRef(() => FeedProcessingModule),
  ],
  controllers: [QueueController, WebhookController],
  providers: [FeedQueueService, FeedDefaultProcessor, FeedPriorityProcessor],
  exports: [FeedQueueService],
})
export class QueueModule {}
