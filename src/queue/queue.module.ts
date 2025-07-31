import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../email/email.module';
import { FeedProcessingModule } from '../feed-processing/feed-processing.module';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueController } from './controllers/queue.controller';
import { EmailProcessor } from './processors/email.processor';
import { FeedProcessor } from './processors/feed.processor';
import { EmailQueueService } from './services/email-queue.service';
import { FeedQueueService } from './services/feed-queue.service';
import { FeedSchedulerService } from './services/feed-scheduler.service';
import { WorkerService } from './services/worker.service';
import { PgBossAdapter } from './adapters/pg-boss.adapter';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    AuthModule,
    EmailModule,
    ScheduleModule.forRoot(),
    forwardRef(() => FeedProcessingModule),
  ],
  controllers: [QueueController],
  providers: [
    {
      provide: 'QueueAdapter',
      useClass: PgBossAdapter,
    },
    FeedQueueService,
    EmailQueueService,
    FeedProcessor,
    EmailProcessor,
    WorkerService,
    FeedSchedulerService,
  ],
  exports: [FeedQueueService, EmailQueueService, 'QueueAdapter'],
})
export class QueueModule {}
