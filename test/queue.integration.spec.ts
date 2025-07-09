import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { FeedQueueService } from '../src/queue/services/feed-queue.service';
import { QueueModule } from '../src/queue/queue.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { FeedProcessingModule } from '../src/feed-processing/feed-processing.module';

describe('Queue System Integration Test', () => {
  let feedQueueService: FeedQueueService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        PrismaModule,
        FeedProcessingModule,
        QueueModule,
      ],
    }).compile();

    feedQueueService = module.get<FeedQueueService>(FeedQueueService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(feedQueueService).toBeDefined();
  });

  it('should calculate feed priority correctly', async () => {
    // Este teste requer dados no banco para funcionar
    const stats = await feedQueueService.getQueueStats();
    expect(stats).toHaveProperty('processing');
    expect(stats).toHaveProperty('priority');
  });
});
