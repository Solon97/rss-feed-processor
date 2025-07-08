import { Injectable } from '@nestjs/common';
import { ContentExtractionService } from '../feed-processing/services/content-extraction.service';
import { FeedValidationService } from '../feed-processing/services/feed-validation.service';
import { FeedParsingService } from '../feed-processing/services/feed-parsing.service';
import { FeedSubscriptionService } from './application/services/feed-subscription.service';
import { UserFeedManagementService } from './application/services/user-feed-management.service';
import {
  ContentExtractionResult,
  FeedItemsResponse,
  FeedValidationResult,
  Feed,
} from './interfaces/feed.interface';
import {
  UserFeedWithFeed,
  FeedItemWithFeed,
} from './application/services/user-feed-management.service';

/**
 * Main Feed Service - Orchestrates all feed-related operations
 * Acts as a facade for both CRUD operations and feed processing
 * This is the main entry point for feed operations from controllers
 */
@Injectable()
export class FeedService {
  constructor(
    private readonly feedValidation: FeedValidationService,
    private readonly contentExtraction: ContentExtractionService,
    private readonly feedParsing: FeedParsingService,
    private readonly feedSubscription: FeedSubscriptionService,
    private readonly userFeedManagement: UserFeedManagementService,
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
    // First, validate the feed using the processing module
    const validation = await this.feedValidation.validateFeed(feedUrl);

    if (!validation.isValid || !validation.feedUrl) {
      throw new Error('Invalid feed URL');
    }

    // Check if feed already exists in database
    let feed = await this.feedSubscription.getFeedByUrl(validation.feedUrl);

    // If feed doesn't exist, create it using the processing module
    if (!feed) {
      const feedData = await this.feedParsing.parseFeed(validation.feedUrl);
      feed = await this.feedSubscription.createFeedRecord({
        name: feedData.title,
        url: validation.feedUrl,
        items: feedData.items.slice(0, 5), // Only save the latest 5 items
      });
    }

    // Create the user subscription
    const userFeed = await this.feedSubscription.createUserFeedSubscription(
      userId,
      feed.id,
      feedUrl,
    );

    return {
      feed,
      userFeed,
      message: 'Feed criado e usuário inscrito com sucesso',
    };
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
    title?: string,
    feedId?: string,
    feedType?: 'rss' | 'youtube',
  ) {
    return this.userFeedManagement.getUserFeedItems(
      userId,
      limit,
      offset,
      sort,
      order,
      title,
      feedId,
      feedType,
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
    return this.feedParsing.getFeedItems(url);
  }

  /**
   * Parses an RSS feed and returns complete feed data with content
   */
  async parseFeed(url: string): Promise<Feed> {
    return this.feedParsing.parseFeed(url);
  }

  /**
   * Gets a specific feed item by ID
   */
  async getFeedItemById(
    userId: string,
    feedItemId: string,
  ): Promise<FeedItemWithFeed | null> {
    return this.userFeedManagement.getFeedItemById(userId, feedItemId);
  }
}
