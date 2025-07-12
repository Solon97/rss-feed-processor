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
  type: 'rss' | 'youtube' | null;
  feedUrl?: string;
}

export interface FeedItemsResponse {
  feedUrl: string;
  feedType: 'rss' | 'youtube';
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
