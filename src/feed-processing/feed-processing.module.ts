import { Module } from '@nestjs/common';

// Domain Services (RSS Processing)
import { FeedValidatorService } from './domain/services/feed-validator.service';
import { FeedDiscoveryService } from './domain/services/feed-discovery.service';
import { RssParserService } from './domain/services/rss-parser.service';

// Application Services (Feed Processing)
import { FeedValidationService } from './services/feed-validation.service';
import { ContentExtractionService } from './services/content-extraction.service';
import { FeedParsingService } from './services/feed-parsing.service';

@Module({
  providers: [
    // Application Services
    FeedValidationService,
    ContentExtractionService,
    FeedParsingService,

    // Domain Services
    FeedValidatorService,
    FeedDiscoveryService,
    RssParserService,
  ],
  exports: [
    FeedValidationService,
    ContentExtractionService,
    FeedParsingService,
  ],
})
export class FeedProcessingModule {}
