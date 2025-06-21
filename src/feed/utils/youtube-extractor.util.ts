import { fetch } from 'undici';
import { ContentExtractionResult } from '../interfaces/feed.interface';
import { ThumbnailExtractorUtil } from './thumbnail-extractor.util';

/**
 * Utility class for YouTube-specific operations
 * Contains specialized logic for YouTube video processing
 */
export class YouTubeExtractorUtil {
  /**
   * Extracts YouTube video information
   */
  static async extractVideoInfo(
    url: string,
    videoId: string,
  ): Promise<ContentExtractionResult> {
    // First attempt: use YouTube oembed API
    let title = await this.getVideoTitleFromOEmbed(videoId);

    if (!title || title === 'Vídeo do YouTube') {
      // Second attempt: page scraping
      title = await this.getVideoTitleFromPage(url);
    }

    // High quality thumbnail
    const thumbnail = ThumbnailExtractorUtil.getYouTubeThumbnail(videoId);

    return {
      title: title || 'Vídeo do YouTube',
      link: url,
      content: '',
      thumbnail,
    };
  }

  /**
   * Extracts title using YouTube oembed API
   */
  private static async getVideoTitleFromOEmbed(
    videoId: string,
  ): Promise<string | null> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return null;
      }

      const data = (await res.json()) as { title?: string };
      return data.title || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts title by scraping YouTube page
   */
  private static async getVideoTitleFromPage(
    url: string,
  ): Promise<string | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!res.ok) {
        return null;
      }

      const html = await res.text();

      // Multiple strategies to extract title
      let title = null;

      // 1. Search for og:title
      const ogTitleMatch = html.match(
        /<meta property="og:title" content="([^"]+)"/i,
      );
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
      }

      // 2. Search for twitter:title
      if (!title) {
        const twitterTitleMatch = html.match(
          /<meta name="twitter:title" content="([^"]+)"/i,
        );
        if (twitterTitleMatch) {
          title = twitterTitleMatch[1];
        }
      }

      // 3. Search in JSON-LD
      if (!title) {
        const jsonLdMatch = html.match(
          /<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i,
        );
        if (jsonLdMatch) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            if (jsonData.name) {
              title = jsonData.name;
            }
          } catch (e) {
            // Ignore parsing error
          }
        }
      }

      // 4. Search in ytInitialData
      if (!title) {
        const ytDataMatch = html.match(/var ytInitialData = ({.+?});/);
        if (ytDataMatch) {
          try {
            const ytData = JSON.parse(ytDataMatch[1]);
            const videoDetails =
              ytData?.contents?.twoColumnWatchNextResults?.results?.results
                ?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.runs?.[0]
                ?.text;
            if (videoDetails) {
              title = videoDetails;
            }
          } catch (e) {
            // Ignore parsing error
          }
        }
      }

      // 5. Fallback to title tag (less reliable)
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(' - YouTube', '').trim();
        }
      }

      return title;
    } catch (error) {
      return null;
    }
  }
}
