import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UserAlreadySubscribedException,
  FeedNotFoundException,
  FeedProcessingException,
} from '../../../common/exceptions/feed.exceptions';

/**
 * Service for Feed Subscription Management
 * Handles user feed subscriptions and database operations
 * This service focuses on CRUD operations and delegates feed processing to the FeedProcessingModule
 */
@Injectable()
export class FeedSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a user feed subscription
   * Assumes the feed has already been validated and created by the processing module
   */
  async createUserFeedSubscription(
    userId: string,
    feedId: string,
    feedUrl: string,
  ) {
    try {
      // Check if user is already subscribed to this feed
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
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
          feed_id: feedId,
          is_active: true,
          access_permissions: 'read',
          notification_enabled: true,
          notification_frequency: 'immediate',
        },
      });

      return userFeed;
    } catch (error) {
      if (
        error instanceof UserAlreadySubscribedException ||
        error instanceof FeedNotFoundException
      ) {
        throw error;
      }
      throw new FeedProcessingException('criação de inscrição', error.message);
    }
  }

  /**
   * Creates a new feed record in the database
   */
  async createFeedRecord(feedData: {
    name: string;
    url: string;
    items: Array<{
      title: string;
      link: string;
      content?: string;
      thumbnail?: string;
      pubDate?: string;
    }>;
  }) {
    try {
      // Create the feed record
      const feed = await this.prisma.feeds.create({
        data: {
          name: feedData.name || 'Feed sem título',
          url: feedData.url,
          is_active: true,
          status: 'active',
          last_fetched_at: new Date(),
        },
      });

      // Save the feed items
      const feedItems = [];
      for (const item of feedData.items) {
        try {
          const feedItem = await this.prisma.feed_items.create({
            data: {
              feed_id: feed.id,
              title: item.title,
              url: item.link,
              content: item.content || '',
              thumbnail: item.thumbnail,
              published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
            },
          });

          feedItems.push(feedItem);
        } catch (error) {
          console.error(`Erro ao salvar item ${item.link}:`, error.message);
          // Continue with next item instead of failing completely
        }
      }

      return feed;
    } catch (error) {
      throw new FeedProcessingException('criação do feed', error.message);
    }
  }

  /**
   * Gets a feed by URL
   */
  async getFeedByUrl(url: string) {
    return this.prisma.feeds.findUnique({
      where: { url },
    });
  }
}
