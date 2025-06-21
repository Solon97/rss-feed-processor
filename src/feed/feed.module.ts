import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

// Domain Services
import { FeedValidatorService } from './domain/services/feed-validator.service';
import { FeedDiscoveryService } from './domain/services/feed-discovery.service';
import { RssParserService } from './domain/services/rss-parser.service';

// Application Services
import { FeedValidationApplicationService } from './application/services/feed-validation.service';
import { ContentExtractionApplicationService } from './application/services/content-extraction.service';
import { FeedSubscriptionApplicationService } from './application/services/feed-subscription.service';

@Module({
  controllers: [FeedController],
  providers: [
    // Main Service (Facade)
    FeedService,

    // Application Services
    FeedValidationApplicationService,
    ContentExtractionApplicationService,
    FeedSubscriptionApplicationService,

    // Domain Services
    FeedValidatorService,
    FeedDiscoveryService,
    RssParserService,
  ],
  exports: [FeedService],
})
export class FeedModule {}
