import { FeedType } from '@prisma/client';

/**
 * Determines the feed type based on the URL
 * @param url - The feed URL
 * @returns The feed type ('youtube' or 'rss')
 */
export function determineFeedType(url: string): FeedType {
  // Check if it's a YouTube feed
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  // Default to RSS for all other feeds
  return 'rss';
}
