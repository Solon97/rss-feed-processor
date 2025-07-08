import { Injectable } from '@nestjs/common';
import { FeedValidatorService } from '../domain/services/feed-validator.service';
import { FeedDiscoveryService } from '../domain/services/feed-discovery.service';
import { RssParserService } from '../domain/services/rss-parser.service';
import { FeedValidationResult } from '@/feed/interfaces/feed.interface';
import {
  InvalidUrlException,
  FeedNotFoundException,
  FeedTimeoutException,
  FeedNetworkException,
} from '@/common/exceptions/feed.exceptions';

/**
 * Service for Feed Validation
 * Handles feed validation and item retrieval operations
 */
@Injectable()
export class FeedValidationService {
  constructor(
    private readonly feedValidator: FeedValidatorService,
    private readonly feedDiscovery: FeedDiscoveryService,
    private readonly rssParser: RssParserService,
  ) {}

  /**
   * Validates a URL and determines feed type
   */
  async validateFeed(url: string): Promise<FeedValidationResult> {
    try {
      new URL(url); // Validate URL
    } catch {
      throw new InvalidUrlException(url);
    }

    try {
      // If YouTube channel, get RSS URL
      if (this.feedValidator.isYouTubeChannel(url)) {
        const rssUrl = await this.feedDiscovery.getYouTubeChannelRss(url);
        if (!rssUrl) {
          throw new FeedNotFoundException(url);
        }
        return { isValid: true, type: 'youtube', feedUrl: rssUrl };
      }

      // If Medium publication/profile, convert to feed URL
      if (this.feedValidator.isMediumPublication(url)) {
        const feedUrl = this.feedDiscovery.getMediumFeedUrl(url);
        if (feedUrl && (await this.feedValidator.isValidRssFeed(feedUrl))) {
          return { isValid: true, type: 'rss', feedUrl };
        }
        throw new FeedNotFoundException(url);
      }

      // If Dev.to profile, convert to feed URL
      if (this.feedValidator.isDevToProfile(url)) {
        const feedUrl = this.feedDiscovery.getDevToFeedUrl(url);
        if (feedUrl && (await this.feedValidator.isValidRssFeed(feedUrl))) {
          return { isValid: true, type: 'rss', feedUrl };
        }
        throw new FeedNotFoundException(url);
      }

      // Check if it's a valid RSS feed directly
      if (await this.feedValidator.isValidRssFeed(url)) {
        return { isValid: true, type: 'rss', feedUrl: url };
      }

      // Try to find RSS feed in website
      const rssUrl = await this.feedDiscovery.findRssFeedInWebsite(url);
      if (rssUrl) {
        return { isValid: true, type: 'rss', feedUrl: rssUrl };
      }

      throw new FeedNotFoundException(url);
    } catch (error) {
      if (
        error.name?.includes('TimeoutError') ||
        error.code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        throw new FeedTimeoutException(url);
      }
      if (
        error instanceof InvalidUrlException ||
        error instanceof FeedNotFoundException
      ) {
        throw error;
      }
      throw new FeedNetworkException(url);
    }
  }
}
