export interface FeedItem {
  title: string;
  link: string;
  pubDate?: string;
  content?: string;
  thumbnail?: string;
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
  type: 'rss' | 'youtube';
  title: string;
  urls: string[];
}

export interface ContentExtractionResult {
  title: string;
  link: string;
  pubDate?: string;
  content: string;
  thumbnail?: string;
}
