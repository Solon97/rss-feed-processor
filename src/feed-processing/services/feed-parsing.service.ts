import { Injectable } from '@nestjs/common';
import { RssParserService } from '../domain/services/rss-parser.service';
import { FeedValidationService } from './feed-validation.service';
import { FeedItemsResponse, Feed } from '@/feed/interfaces/feed.interface';
import {
  InvalidUrlException,
  FeedNotFoundException,
  FeedProcessingException,
  FeedTimeoutException,
  FeedNetworkException,
  FeedParsingException,
} from '@/common/exceptions/feed.exceptions';

/**
 * Service for Feed Parsing
 * Handles RSS feed parsing and data extraction
 */
@Injectable()
export class FeedParsingService {
  constructor(
    private readonly feedValidation: FeedValidationService,
    private readonly rssParser: RssParserService,
  ) {}

  /**
   * Gets URLs of the latest 5 feed items
   */
  async getFeedItems(url: string): Promise<FeedItemsResponse> {
    try {
      // Validate the feed URL first
      const validation = await this.feedValidation.validateFeed(url);

      if (!validation.isValid || !validation.feedUrl) {
        throw new FeedNotFoundException(url);
      }

      // Parse the feed and get the latest 5 items
      const feedData = await this.rssParser.parseFeed(validation.feedUrl);

      return {
        feedUrl: validation.feedUrl,
        feedType: validation.type,
        items: feedData.items.slice(0, 5).map((item) => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
        })),
      };
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(url);
      }
      if (error.message?.includes('Invalid XML')) {
        throw new FeedParsingException(url);
      }
      if (error.message?.includes('HTTP')) {
        throw new FeedNetworkException(url);
      }
      if (
        error instanceof InvalidUrlException ||
        error instanceof FeedNotFoundException
      ) {
        throw error;
      }
      throw new FeedProcessingException(url, error.message);
    }
  }

  /**
   * Parses an RSS feed and returns complete feed data with content
   */
  async parseFeed(url: string): Promise<Feed> {
    try {
      // Validate the feed URL first
      const validation = await this.feedValidation.validateFeed(url);

      if (!validation.isValid || !validation.feedUrl) {
        throw new FeedNotFoundException(url);
      }

      // Parse the complete feed
      return await this.rssParser.parseFeed(validation.feedUrl);
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(url);
      }
      if (error.message?.includes('Invalid XML')) {
        throw new FeedParsingException(url);
      }
      if (error.message?.includes('HTTP')) {
        throw new FeedNetworkException(url);
      }
      if (
        error instanceof InvalidUrlException ||
        error instanceof FeedNotFoundException
      ) {
        throw error;
      }
      throw new FeedProcessingException(url, error.message);
    }
  }
}
