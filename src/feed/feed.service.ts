import { Injectable } from '@nestjs/common';
import { ContentExtractionApplicationService } from './application/services/content-extraction.service';
import { FeedSubscriptionApplicationService } from './application/services/feed-subscription.service';
import { FeedValidationApplicationService } from './application/services/feed-validation.service';
import {
  ContentExtractionResult,
  FeedValidationResult,
} from './interfaces/feed.interface';

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
}
