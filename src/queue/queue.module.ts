import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { FeedProcessingModule } from '../feed-processing/feed-processing.module';
import { QueueNames } from './interfaces/job.interface';
import { FeedQueueService } from './services/feed-queue.service';
import { FeedSchedulerService } from './services/feed-scheduler.service';
import { QueueHealthService } from './services/queue-health.service';
import { FeedProcessingProcessor } from './processors/feed-processing.processor';
import { FeedPriorityProcessor } from './processors/feed-priority.processor';
import { QueueController } from './controllers/queue.controller';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    forwardRef(() => FeedProcessingModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      {
        name: QueueNames.FEED_PROCESSING,
        defaultJobOptions: {
          removeOnComplete: 10,
          removeOnFail: 5,
        },
      },
      {
        name: QueueNames.FEED_PRIORITY,
        defaultJobOptions: {
          removeOnComplete: 5,
          removeOnFail: 3,
        },
      },
    ),
  ],
  controllers: [QueueController],
  providers: [
    FeedQueueService,
    FeedSchedulerService,
    QueueHealthService,
    FeedProcessingProcessor,
    FeedPriorityProcessor,
  ],
  exports: [FeedQueueService],
})
export class QueueModule {}
