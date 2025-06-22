import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';
import {
  FeedTimeoutException,
  FeedNetworkException,
} from '@/common/exceptions/feed.exceptions';

@Injectable()
export class FeedValidatorService {
  /**
   * Valida se uma URL é um feed RSS válido
   */
  async isValidRssFeed(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          Accept:
            'application/rss+xml, application/atom+xml, application/xml, text/xml',
        },
      });

      if (!res.ok) {
        throw new FeedNetworkException(url, res.status);
      }

      const content = await res.text();
      return (
        content.includes('<rss') ||
        content.includes('<feed') ||
        content.includes('<?xml') ||
        (content.includes('<channel>') && content.includes('<item>')) ||
        content.includes('<entry>')
      );
    } catch (error) {
      if (error instanceof FeedNetworkException) {
        throw error;
      }
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(url);
      }
      return false;
    }
  }

  /**
   * Valida se é um canal do YouTube
   */
  isYouTubeChannel(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      return hostname.includes('youtube.com') || hostname.includes('youtu.be');
    } catch (error) {
      return false;
    }
  }
}
