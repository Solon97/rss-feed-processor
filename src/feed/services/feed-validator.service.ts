import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';

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

      if (!res.ok) return false;

      const content = await res.text();
      return (
        content.includes('<rss') ||
        content.includes('<feed') ||
        content.includes('<?xml') ||
        (content.includes('<channel>') && content.includes('<item>')) ||
        content.includes('<entry>')
      );
    } catch (error) {
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
      const pathname = urlObj.pathname;

      return (
        (hostname.includes('youtube.com') || hostname.includes('youtu.be')) &&
        (pathname.includes('/@') ||
          pathname.includes('/channel/') ||
          pathname.includes('/c/') ||
          pathname.includes('/user/'))
      );
    } catch (error) {
      return false;
    }
  }
}
