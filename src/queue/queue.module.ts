import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { FeedProcessingModule } from '../feed-processing/feed-processing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueController } from './controllers/queue.controller';
import { WebhookController } from './controllers/webhook.controller';
import { EmailProcessor } from './processors/email.processor';
import { FeedProcessor } from './processors/feed.processor';
import { FeedQueueService } from './services/feed-queue.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    EmailModule,
    ScheduleModule.forRoot(),
    forwardRef(() => FeedProcessingModule),
  ],
  controllers: [QueueController, WebhookController],
  providers: [FeedQueueService, FeedProcessor, EmailProcessor],
  exports: [FeedQueueService],
})
export class QueueModule {}
