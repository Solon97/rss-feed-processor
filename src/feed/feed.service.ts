import { Injectable } from '@nestjs/common';
import { ContentExtractionApplicationService } from './application/services/content-extraction.service';
import { FeedSubscriptionApplicationService } from './application/services/feed-subscription.service';
import { FeedValidationApplicationService } from './application/services/feed-validation.service';
import { UserFeedManagementApplicationService } from './application/services/user-feed-management.service';
import {
  ContentExtractionResult,
  FeedItemsResponse,
  FeedValidationResult,
} from './interfaces/feed.interface';
import { UserFeedWithFeed } from './application/services/user-feed-management.service';

/**
 * Main Feed Service - Orchestrates all feed-related operations
 * Acts as a facade for all feed application services
 * This is the main entry point for feed operations from controllers
 */
@Injectable()
export class FeedService {
  constructor(
    private readonly feedValidation: FeedValidationApplicationService,
    private readonly contentExtraction: ContentExtractionApplicationService,
    private readonly feedSubscription: FeedSubscriptionApplicationService,
    private readonly userFeedManagement: UserFeedManagementApplicationService,
  ) {}

  /**
   * Validates a feed URL and determines its type
   */
  async validateFeed(url: string): Promise<FeedValidationResult> {
    return this.feedValidation.validateFeed(url);
  }

  /**
   * Extracts content from a specific URL
   */
  async extractContent(url: string): Promise<ContentExtractionResult> {
    return this.contentExtraction.extractContent(url);
  }

  /**
   * Creates a user feed subscription
   */
  async createUserFeed(userId: string, feedUrl: string) {
    return this.feedSubscription.createUserFeed(userId, feedUrl);
  }

  /**
   * Gets all feeds for a specific user
   */
  async getUserFeeds(userId: string): Promise<UserFeedWithFeed[]> {
    return this.userFeedManagement.getUserFeeds(userId);
  }

  /**
   * Updates the active status of a user feed
   */
  async updateUserFeedStatus(
    userId: string,
    feedId: string,
    isActive: boolean,
  ): Promise<void> {
    return this.userFeedManagement.updateUserFeedStatus(
      userId,
      feedId,
      isActive,
    );
  }

  /**
   * Removes a user feed subscription
   */
  async unsubscribeUserFromFeed(userId: string, feedId: string): Promise<void> {
    return this.userFeedManagement.unsubscribeUserFromFeed(userId, feedId);
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
    return this.userFeedManagement.updateNotificationSettings(
      userId,
      feedId,
      notificationEnabled,
      notificationFrequency,
    );
  }

  /**
   * Gets aggregated feed items from all active user feeds
   */
  async getUserFeedItems(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    sort: 'created_at' | 'published_at' = 'published_at',
    order: 'asc' | 'desc' = 'desc',
  ) {
    return this.userFeedManagement.getUserFeedItems(
      userId,
      limit,
      offset,
      sort,
      order,
    );
  }

  /**
   * Updates the last_viewed_at timestamp for a user feed
   */
  async updateLastViewed(userId: string, feedId: string): Promise<void> {
    return this.userFeedManagement.updateLastViewed(userId, feedId);
  }

  /**
   * Gets URLs of the latest 5 feed items
   */
  async getFeedItems(url: string): Promise<FeedItemsResponse> {
    return this.feedSubscription.getFeedItems(url);
  }
}
