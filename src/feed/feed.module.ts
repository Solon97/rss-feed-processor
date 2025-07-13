import { Module, forwardRef } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { TopicController } from './controllers/topic.controller';
import { FeedService } from './feed.service';
import { FeedProcessingModule } from '../feed-processing/feed-processing.module';
import { QueueModule } from '../queue/queue.module';

// Application Services
import { FeedSubscriptionService } from './application/services/feed-subscription.service';
import { UserFeedManagementService } from './application/services/user-feed-management.service';
import { TopicManagementService } from './application/services/topic-management.service';

@Module({
  imports: [FeedProcessingModule, forwardRef(() => QueueModule)],
  controllers: [FeedController, TopicController],
  providers: [
    // Main Service (Facade)
    FeedService,

    // Application Services
    FeedSubscriptionService,
    UserFeedManagementService,
    TopicManagementService,
  ],
  exports: [FeedService],
})
export class FeedModule {}
