import { FeedType } from '@prisma/client';

export interface FeedData {
  name?: string;
  url: string;
  feed_type?: FeedType; // Optional, will be determined based on URL
}
export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  thumbnail?: string;
  duration?: string; // Duration in ISO 8601 format (e.g., "PT10M30S")
}

export interface Feed {
  title: string;
  items: FeedItem[];
}

export interface FeedValidationResult {
  isValid: boolean;
  type: FeedType | null;
  feedUrl?: string;
}

export interface FeedItemsResponse {
  feedUrl: string;
  feedType: FeedType;
  items: Array<{
    title: string;
    link: string;
    pubDate?: string;
  }>;
}

export interface ContentExtractionResult {
  title: string;
  link: string;
  pubDate?: string;
  content: string;
  thumbnail?: string;
  duration?: string; // Duration in ISO 8601 format (e.g., "PT10M30S")
}
