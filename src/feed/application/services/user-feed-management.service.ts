import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  FeedNotFoundException,
  FeedProcessingException,
} from '../../../common/exceptions/feed.exceptions';
import { GetFeedItemsQueryDto } from '../../dto/feed.dto';
import { TopicResponseDto } from '../../dto/topic.dto';
import { FeedType } from '@prisma/client';

export interface UserFeedWithFeed {
  feed_id: string;
  is_active: boolean;
  access_permissions: 'read' | 'write' | 'admin';
  last_viewed_at: string | null;
  notification_enabled: boolean;
  notification_frequency: 'immediate' | 'daily' | 'weekly' | 'never';
  created_at: string;
  feed: {
    id: string;
    name: string;
    url: string;
    feed_type: FeedType;
    status: 'active' | 'inactive' | 'error';
    created_at: string;
    last_fetched_at: string | null;
  };
}

export interface FeedItemWithFeed {
  id: string;
  title: string;
  url: string;
  content: string | null;
  thumbnail: string | null;
  duration: string | null;
  published_at: string | null;
  created_at: string;
  feed: {
    id: string;
    name: string;
    url: string;
    feed_type: FeedType;
    topic?: TopicResponseDto;
  };
}

/**
 * Service for User Feed Management
 * Handles user feed subscriptions, status updates, and notification settings
 */
@Injectable()
export class UserFeedManagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Gets all feeds for a specific user
   */
  async getUserFeeds(userId: string): Promise<UserFeedWithFeed[]> {
    try {
      const userFeeds = await this.prisma.user_feeds.findMany({
        where: { user_id: userId },
        include: {
          feeds: {
            select: {
              id: true,
              name: true,
              url: true,
              feed_type: true,
              status: true,
              created_at: true,
              last_fetched_at: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      });

      return userFeeds.map((userFeed) => ({
        feed_id: userFeed.feed_id,
        is_active: userFeed.is_active,
        access_permissions: userFeed.access_permissions as
          | 'read'
          | 'write'
          | 'admin',
        last_viewed_at: userFeed.last_viewed_at?.toISOString() || null,
        notification_enabled: userFeed.notification_enabled,
        notification_frequency: userFeed.notification_frequency as
          | 'immediate'
          | 'daily'
          | 'weekly'
          | 'never',
        created_at: userFeed.created_at.toISOString(),
        feed: {
          id: userFeed.feeds.id,
          name: userFeed.feeds.name,
          url: userFeed.feeds.url,
          feed_type: userFeed.feeds.feed_type,
          status: userFeed.feeds.status as 'active' | 'inactive' | 'error',
          created_at: userFeed.feeds.created_at.toISOString(),
          last_fetched_at:
            userFeed.feeds.last_fetched_at?.toISOString() || null,
        },
      }));
    } catch (error) {
      throw new FeedProcessingException(
        'busca de feeds do usuário',
        error.message,
      );
    }
  }

  /**
   * Updates the active status of a user feed
   */
  async updateUserFeedStatus(
    userId: string,
    feedId: string,
    isActive: boolean,
  ): Promise<void> {
    try {
      // Verify that the user feed exists
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
      });

      if (!existingUserFeed) {
        throw new FeedNotFoundException(`User feed with ID ${feedId}`);
      }

      await this.prisma.user_feeds.update({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
        data: {
          is_active: isActive,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof FeedNotFoundException) {
        throw error;
      }
      throw new FeedProcessingException(
        'atualização de status do feed',
        error.message,
      );
    }
  }

  /**
   * Removes a user feed subscription
   */
  async unsubscribeUserFromFeed(userId: string, feedId: string): Promise<void> {
    try {
      // Verify that the user feed exists
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
      });

      if (!existingUserFeed) {
        throw new FeedNotFoundException(`User feed with ID ${feedId}`);
      }

      await this.prisma.user_feeds.delete({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
      });
    } catch (error) {
      if (error instanceof FeedNotFoundException) {
        throw error;
      }
      throw new FeedProcessingException(
        'remoção de inscrição do feed',
        error.message,
      );
    }
  }

  /**
   * Updates notification settings for a user feed
   */
  async updateNotificationSettings(
    userId: string,
    feedId: string,
    notificationEnabled: boolean,
    notificationFrequency: 'immediate' | 'daily' | 'weekly' | 'never',
  ): Promise<void> {
    try {
      // Verify that the user feed exists
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
      });

      if (!existingUserFeed) {
        throw new FeedNotFoundException(`User feed with ID ${feedId}`);
      }

      await this.prisma.user_feeds.update({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
        data: {
          notification_enabled: notificationEnabled,
          notification_frequency: notificationFrequency,
          updated_at: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof FeedNotFoundException) {
        throw error;
      }
      throw new FeedProcessingException(
        'atualização de configurações de notificação',
        error.message,
      );
    }
  }

  /**
   * Gets aggregated feed items from all active user feeds
   */
  async getUserFeedItems(
    userId: string,
    {
      limit = 20,
      offset = 0,
      sort,
      order,
      title,
      feedId,
      feedType,
      topicId,
    }: GetFeedItemsQueryDto,
  ): Promise<FeedItemWithFeed[]> {
    try {
      // Build optimized where clause with proper indexing
      const whereClause: any = {
        feeds: {
          user_feeds: {
            some: {
              user_id: userId,
              is_active: true,
              ...(topicId && { topic_id: topicId }),
            },
          },
        },
      };

      // Add title filter with proper text search
      if (title) {
        whereClause.title = {
          contains: title,
          mode: 'insensitive',
        };
      }

      // Add feed_id filter (most selective first)
      if (feedId) {
        whereClause.feed_id = feedId;
      }

      // Add feed_type filter using the enum field
      if (feedType) {
        whereClause.feeds.feed_type = feedType;
      }

      const feedItems = await this.prisma.feed_items.findMany({
        where: whereClause,
        select: {
          id: true,
          title: true,
          url: true,
          content: true,
          thumbnail: true,
          duration: true,
          published_at: true,
          created_at: true,
          feeds: {
            select: {
              id: true,
              name: true,
              url: true,
              feed_type: true,
              user_feeds: {
                select: {
                  topics: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
                where: {
                  user_id: userId,
                },
                take: 1,
              },
            },
          },
        },
        orderBy: {
          [sort]: order,
        },
        take: limit,
        skip: offset,
      });

      return feedItems.map((item) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        content: item.content,
        thumbnail: item.thumbnail,
        duration: item.duration,
        published_at: item.published_at?.toISOString() || null,
        created_at: item.created_at.toISOString(),
        feed: {
          id: item.feeds.id,
          name: item.feeds.name,
          url: item.feeds.url,
          feed_type: item.feeds.feed_type,
          topic: item.feeds.user_feeds[0]?.topics
            ? {
                id: item.feeds.user_feeds[0].topics.id,
                name: item.feeds.user_feeds[0].topics.name,
                color: item.feeds.user_feeds[0].topics.color,
                created_at:
                  item.feeds.user_feeds[0].topics.created_at.toISOString(),
                updated_at:
                  item.feeds.user_feeds[0].topics.updated_at.toISOString(),
              }
            : null,
        },
      }));
    } catch (error) {
      throw new FeedProcessingException(
        'busca de itens de feed do usuário',
        error.message,
      );
    }
  }

  /**
   * Updates the last_viewed_at timestamp for a user feed
   */
  async updateLastViewed(userId: string, feedId: string): Promise<void> {
    try {
      // Verify that the user feed exists
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
      });

      if (!existingUserFeed) {
        throw new FeedNotFoundException(`User feed with ID ${feedId}`);
      }

      await this.prisma.user_feeds.update({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feedId,
          },
        },
        data: {
          last_viewed_at: new Date(),
          updated_at: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof FeedNotFoundException) {
        throw error;
      }
      throw new FeedProcessingException(
        'atualização de último acesso visualizado',
        error.message,
      );
    }
  }

  /**
   * Gets a specific feed item by ID (only if user has access to it)
   */
  async getFeedItemById(
    userId: string,
    feedItemId: string,
  ): Promise<FeedItemWithFeed | null> {
    try {
      const feedItem = await this.prisma.feed_items.findFirst({
        where: {
          id: feedItemId,
          feeds: {
            user_feeds: {
              some: {
                user_id: userId,
                is_active: true,
              },
            },
          },
        },
        select: {
          id: true,
          title: true,
          url: true,
          content: true,
          thumbnail: true,
          duration: true,
          published_at: true,
          created_at: true,
          feeds: {
            select: {
              id: true,
              name: true,
              url: true,
              feed_type: true,
              user_feeds: {
                select: {
                  topics: {
                    select: {
                      id: true,
                      name: true,
                      color: true,
                      created_at: true,
                      updated_at: true,
                    },
                  },
                },
                where: {
                  user_id: userId,
                },
                take: 1,
              },
            },
          },
        },
      });

      if (!feedItem) {
        return null;
      }

      return {
        id: feedItem.id,
        title: feedItem.title,
        url: feedItem.url,
        content: feedItem.content,
        thumbnail: feedItem.thumbnail,
        duration: feedItem.duration,
        published_at: feedItem.published_at?.toISOString() || null,
        created_at: feedItem.created_at.toISOString(),
        feed: {
          id: feedItem.feeds.id,
          name: feedItem.feeds.name,
          url: feedItem.feeds.url,
          feed_type: feedItem.feeds.feed_type,
          topic: feedItem.feeds.user_feeds[0]?.topics
            ? {
                id: feedItem.feeds.user_feeds[0].topics.id,
                name: feedItem.feeds.user_feeds[0].topics.name,
                color: feedItem.feeds.user_feeds[0].topics.color,
                created_at:
                  feedItem.feeds.user_feeds[0].topics.created_at.toISOString(),
                updated_at:
                  feedItem.feeds.user_feeds[0].topics.updated_at.toISOString(),
              }
            : null,
        },
      };
    } catch (error) {
      throw new FeedProcessingException(
        'busca de item de feed por ID',
        error.message,
      );
    }
  }
}
