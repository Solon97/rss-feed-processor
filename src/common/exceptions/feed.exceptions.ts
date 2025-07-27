import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Exception for invalid URL
 */
export class InvalidUrlException extends BadRequestException {
  constructor(url?: string) {
    super({
      error: 'INVALID_URL',
      message: 'The provided URL is invalid',
      details: url ? `URL: ${url}` : undefined,
    });
  }
}

/**
 * Exception for feed not found or invalid
 */
export class FeedNotFoundException extends NotFoundException {
  constructor(url: string) {
    super({
      error: 'FEED_NOT_FOUND',
      message: 'RSS feed not found or invalid',
      details: `URL: ${url}`,
    });
  }
}

/**
 * Exception for request timeout
 */
export class FeedTimeoutException extends RequestTimeoutException {
  constructor(url: string) {
    super({
      error: 'FEED_TIMEOUT',
      message: 'Timeout while accessing the feed',
      details: `URL: ${url}`,
    });
  }
}

/**
 * Exception for network error when accessing feed
 */
export class FeedNetworkException extends BadRequestException {
  constructor(url: string, statusCode?: number) {
    super({
      error: 'FEED_NETWORK_ERROR',
      message: 'Network error while accessing the feed',
      details: `URL: ${url}${statusCode ? `, Status: ${statusCode}` : ''}`,
    });
  }
}

/**
 * Exception for content not found or inaccessible
 */
export class ContentNotFoundException extends NotFoundException {
  constructor(url: string) {
    super({
      error: 'CONTENT_NOT_FOUND',
      message: 'Content not found or inaccessible',
      details: `URL: ${url}`,
    });
  }
}

/**
 * Exception for content extraction failure
 */
export class ContentExtractionException extends UnprocessableEntityException {
  constructor(url: string, reason?: string) {
    super({
      error: 'CONTENT_EXTRACTION_FAILED',
      message: 'Failed to extract content from the page',
      details: `URL: ${url}${reason ? `, Reason: ${reason}` : ''}`,
    });
  }
}

/**
 * Exception for user already subscribed to feed
 */
export class UserAlreadySubscribedException extends ConflictException {
  constructor(feedUrl: string) {
    super({
      error: 'USER_ALREADY_SUBSCRIBED',
      message: 'User is already subscribed to this feed',
      details: `Feed: ${feedUrl}`,
    });
  }
}

/**
 * Exception for feed parsing error
 */
export class FeedParsingException extends UnprocessableEntityException {
  constructor(url: string, reason?: string) {
    super({
      error: 'FEED_PARSING_ERROR',
      message: 'Error processing feed content',
      details: `URL: ${url}${reason ? `, Reason: ${reason}` : ''}`,
    });
  }
}

/**
 * Exception for non-specific internal error
 */
export class FeedProcessingException extends InternalServerErrorException {
  constructor(operation: string, reason?: string) {
    super({
      error: 'FEED_PROCESSING_ERROR',
      message: `Internal error during ${operation}`,
      details: reason,
    });
  }
}

/**
 * Exception for inactive or disabled feed
 */
export class FeedInactiveException extends BadRequestException {
  constructor(feedUrl: string) {
    super({
      error: 'FEED_INACTIVE',
      message: 'Feed is inactive or disabled',
      details: `URL: ${feedUrl}`,
    });
  }
}

/**
 * Exception for subscription limit exceeded
 */
export class SubscriptionLimitExceededException extends ForbiddenException {
  constructor(currentLimit: number = 1) {
    super({
      error: 'SUBSCRIPTION_LIMIT_EXCEEDED',
      message: 'Feed subscription limit exceeded for your current plan',
      details: `Current limit: ${currentLimit} feed(s). Please upgrade your subscription to add more feeds.`,
    });
  }
}
