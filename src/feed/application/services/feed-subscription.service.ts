import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeedValidationApplicationService } from './feed-validation.service';
import { ContentExtractionApplicationService } from './content-extraction.service';
import {
  UserAlreadySubscribedException,
  FeedNotFoundException,
  FeedProcessingException,
  InvalidUrlException,
  FeedTimeoutException,
  FeedNetworkException,
  FeedParsingException,
} from '../../../common/exceptions/feed.exceptions';
import { FeedItemsResponse } from '@/feed/interfaces/feed.interface';
import { RssParserService } from '@/feed/domain/services/rss-parser.service';

/**
 * Application Service for Feed Subscription Management
 * Handles user feed subscriptions and feed creation with content extraction
 */
@Injectable()
export class FeedSubscriptionApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedValidation: FeedValidationApplicationService,
    private readonly contentExtraction: ContentExtractionApplicationService,
    private readonly rssParser: RssParserService,
  ) {}

  /**
   * Creates a user feed subscription
   * If feed doesn't exist, validates and creates it with the latest 5 items
   * If feed exists, just creates the user subscription
   */
  async createUserFeed(userId: string, feedUrl: string) {
    try {
      // Validate the feed URL first
      const validation = await this.feedValidation.validateFeed(feedUrl);

      if (!validation.isValid || !validation.feedUrl) {
        throw new FeedNotFoundException(feedUrl);
      }

      // Check if feed already exists in database
      let feed = await this.prisma.feeds.findUnique({
        where: { url: validation.feedUrl },
      });

      // If feed doesn't exist, create it
      if (!feed) {
        feed = await this.createFeedWithItems(validation.feedUrl);
      }

      // Check if user is already subscribed to this feed
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feed.id,
          },
        },
      });

      if (existingUserFeed) {
        throw new UserAlreadySubscribedException(feedUrl);
      }

      // Create user feed subscription
      const userFeed = await this.prisma.user_feeds.create({
        data: {
          user_id: userId,
          feed_id: feed.id,
          is_active: true,
          access_permissions: 'read',
          notification_enabled: true,
          notification_frequency: 'immediate',
        },
      });

      return {
        feed,
        userFeed,
        message: 'Feed criado e usuário inscrito com sucesso',
      };
    } catch (error) {
      if (
        error instanceof FeedNotFoundException ||
        error instanceof UserAlreadySubscribedException ||
        error instanceof InvalidUrlException ||
        error instanceof FeedTimeoutException ||
        error instanceof FeedNetworkException
      ) {
        throw error;
      }
      throw new FeedProcessingException('criação de inscrição', error.message);
    }
  }

  /**
   * Creates a new feed and extracts the latest 5 items
   */
  private async createFeedWithItems(feedUrl: string) {
    try {
      // Get feed metadata and items
      const feedData = await this.getFeedItems(feedUrl);

      // Create the feed record
      const feed = await this.prisma.feeds.create({
        data: {
          name: feedData.title || 'Feed sem título',
          url: feedUrl,
          is_active: true,
          status: 'active',
          last_fetched_at: new Date(),
        },
      });

      // Extract content for the first 5 items and save them
      const maxItems = parseInt(process.env.MAX_FEED_ITEMS || '5');
      const itemsToProcess = feedData.urls.slice(0, maxItems);

      const feedItems = [];
      for (const itemUrl of itemsToProcess) {
        try {
          const content = await this.contentExtraction.extractContent(itemUrl);

          const feedItem = await this.prisma.feed_items.create({
            data: {
              feed_id: feed.id,
              title: content.title,
              url: content.link,
              content: content.content,
              thumbnail: content.thumbnail,
              published_at: content.pubDate
                ? new Date(content.pubDate)
                : new Date(),
            },
          });

          feedItems.push(feedItem);
        } catch (error) {
          console.error(`Erro ao processar item ${itemUrl}:`, error.message);
          // Continue with next item instead of failing completely
        }
      }

      return feed;
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(feedUrl);
      }
      throw new FeedProcessingException('criação do feed', error.message);
    }
  }

  /**
   * Gets URLs of the latest 5 feed items
   */
  async getFeedItems(url: string): Promise<FeedItemsResponse> {
    const validation = await this.feedValidation.validateFeed(url);

    if (!validation.isValid || !validation.feedUrl) {
      throw new FeedNotFoundException(url);
    }

    try {
      const { title, urls } = await this.rssParser.getFeedItemUrls(
        validation.feedUrl,
      );

      return {
        type: validation.type,
        title,
        urls,
      };
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(validation.feedUrl);
      }
      throw new FeedParsingException(validation.feedUrl, error.message);
    }
  }
}
