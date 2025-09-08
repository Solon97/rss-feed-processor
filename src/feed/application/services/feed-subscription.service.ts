import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { FeedQueueService } from '../../../queue/services/feed-queue.service';
import {
  UserAlreadySubscribedException,
  FeedNotFoundException,
  FeedProcessingException,
  SubscriptionLimitExceededException,
} from '../../../common/exceptions/feed.exceptions';
import { determineFeedType } from '../../utils/feed-type.utils';

const FREE_PLAN_LIMIT = 3;

/**
 * Service for Feed Subscription Management
 * Handles user feed subscriptions and database operations
 * This service focuses on CRUD operations and delegates feed processing to the FeedProcessingModule
 */
@Injectable()
export class FeedSubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly feedQueueService: FeedQueueService,
  ) {}

  /**
   * Creates a user feed subscription
   * Assumes the feed has already been validated and created by the processing module
   */
  async createUserFeedSubscription(
    userId: string,
    feedId: string,
    topicId: string,
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

      await this.canActivateNewFeed(userId);

      // Create user feed subscription
      const userFeed = await this.prisma.user_feeds.create({
        data: {
          user_id: userId,
          feed_id: feedId,
          topic_id: topicId,
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
      throw new FeedProcessingException('subscription creation', error.message);
    }
  }

  /**
   * Creates a feed record in the database
   * This method is called after the feed has been validated and processed by the processing module
   */
  async createFeedRecord(feedData: {
    name: string;
    url: string;
    items: Array<{
      title: string;
      link: string;
      pubDate?: string;
      content?: string;
      thumbnail?: string;
    }>;
  }) {
    try {
      // Determine the feed type based on URL
      const feedType = determineFeedType(feedData.url);

      // Create the feed record
      const feed = await this.prisma.feeds.create({
        data: {
          name: feedData.name || 'Untitled Feed',
          url: feedData.url,
          feed_type: feedType,
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
          console.error(`Error saving item ${item.link}:`, error.message);
          // Continue with next item instead of failing completely
        }
      }

      // Add the newly created feed to the priority queue for immediate processing
      await this.feedQueueService.addNewFeedToPriorityQueue(feed.id, feed.url);

      return feed;
    } catch (error) {
      throw new FeedProcessingException('feed creation', error.message);
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

  async canActivateNewFeed(userId: string) {
    const activeSubscription = await this.prisma.user_subscriptions.findFirst({
      where: {
        user_id: userId,
        status: {
          in: ['active', 'trialing'],
        },
        current_period_end: {
          gte: new Date(),
        },
      },
    });

    if (activeSubscription) {
      return;
    }

    const activeFeeds = await this.prisma.user_feeds.count({
      where: {
        user_id: userId,
        is_active: true,
      },
    });

    if (activeFeeds >= FREE_PLAN_LIMIT) {
      throw new SubscriptionLimitExceededException(FREE_PLAN_LIMIT);
    }
  }
}
