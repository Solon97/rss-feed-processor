import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './services/feed.service';
import { FeedValidatorService } from './services/feed-validator.service';
import { FeedDiscoveryService } from './services/feed-discovery.service';
import { RssParserService } from './services/rss-parser.service';
import { ContentExtractorService } from './services/content-extractor.service';
import { ThumbnailExtractorService } from './services/thumbnail-extractor.service';

@Module({
  controllers: [FeedController],
  providers: [
    FeedService,
    FeedValidatorService,
    FeedDiscoveryService,
    RssParserService,
    ContentExtractorService,
    ThumbnailExtractorService,
  ],
  exports: [FeedService],
})
export class FeedModule {}
