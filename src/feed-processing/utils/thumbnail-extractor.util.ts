import { fetch } from 'undici';
import { JSDOM } from 'jsdom';

/**
 * Utility class for thumbnail extraction operations
 * Contains pure functions for image extraction from various sources
 */
export class ThumbnailExtractorUtil {
  /**
   * Extracts thumbnail from web page
   */
  static async getThumbnailFromPage(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!res.ok) return null;

      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      const selectors = [
        'meta[property="og:image"]',
        'meta[name="twitter:image"]',
        'meta[name="twitter:image:src"]',
        'meta[name="image"]',
        'meta[name="thumbnail"]',
        'link[rel="image_src"]',
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const imageUrl =
            element.getAttribute('content') || element.getAttribute('href');
          if (imageUrl) {
            return this.resolveImageUrl(imageUrl, url);
          }
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts YouTube video ID from URL
   */
  static extractYouTubeVideoId(url: string): string | null {
    try {
      const urlObj = new URL(url);
      if (
        urlObj.hostname.includes('youtube.com') &&
        urlObj.searchParams.has('v')
      ) {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts thumbnail from RSS feed item
   */
  static async extractThumbnailFromFeedItem(item: any): Promise<string | null> {
    // 1. Enclosure (common in RSS)
    if (item.enclosure?.url) {
      return item.enclosure.url;
    }

    // 2. YouTube media thumbnail
    if (item['media:group']?.['media:thumbnail']) {
      const thumbnails = item['media:group']['media:thumbnail'];
      if (Array.isArray(thumbnails)) {
        return thumbnails.sort((a, b) => (b.$.width || 0) - (a.$.width || 0))[0]
          .$.url;
      } else if (thumbnails.$.url) {
        return thumbnails.$.url;
      }
    }

    // 3. YouTube video ID
    if (item.link?.includes('youtube.com/watch')) {
      const videoId = this.extractYouTubeVideoId(item.link);
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }
    }

    // 4. Search in article page
    if (item.link) {
      try {
        return await this.getThumbnailFromPage(item.link);
      } catch (error) {
        // Silent failure
      }
    }

    return null;
  }

  /**
   * Generates YouTube thumbnail URL from video ID
   */
  static getYouTubeThumbnail(videoId: string): string {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }

  /**
   * Resolves relative image URL to absolute
   */
  private static resolveImageUrl(imageUrl: string, baseUrl: string): string {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    const base = new URL(baseUrl);
    if (imageUrl.startsWith('//')) {
      return `${base.protocol}${imageUrl}`;
    } else if (imageUrl.startsWith('/')) {
      return `${base.protocol}//${base.host}${imageUrl}`;
    }

    return imageUrl;
  }
}
