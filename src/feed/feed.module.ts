import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { FeedProcessingModule } from '../feed-processing/feed-processing.module';

// Application Services
import { FeedSubscriptionService } from './application/services/feed-subscription.service';
import { UserFeedManagementService } from './application/services/user-feed-management.service';

@Module({
  imports: [FeedProcessingModule],
  controllers: [FeedController],
  providers: [
    // Main Service (Facade)
    FeedService,

    // Application Services
    FeedSubscriptionService,
    UserFeedManagementService,
  ],
  exports: [FeedService],
})
export class FeedModule {}
