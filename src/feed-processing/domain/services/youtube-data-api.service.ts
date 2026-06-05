import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';
import { FeedItem } from '@/feed/interfaces/feed.interface';

interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    contentDetails: {
      duration: string;
    };
    snippet?: {
      title: string;
      description: string;
      publishedAt: string;
    };
  }>;
}

interface YouTubePlaylistItemsResponse {
  nextPageToken?: string;
  items: Array<{
    snippet: {
      title: string;
      description: string;
      publishedAt: string;
      thumbnails: {
        maxres?: { url: string };
        standard?: { url: string };
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
      resourceId: {
        videoId: string;
      };
    };
    contentDetails: {
      videoId: string;
      videoPublishedAt: string;
    };
  }>;
}

interface YouTubeVideosListResponse {
  items: Array<{
    id: string;
    contentDetails: {
      duration: string;
    };
  }>;
}

/**
 * Service for interacting with YouTube Data API v3
 * Handles video information retrieval including duration
 */
@Injectable()
export class YouTubeDataApiService {
  private readonly logger = new Logger(YouTubeDataApiService.name);
  private readonly apiKey: string | null;
  private readonly baseUrl = 'https://www.googleapis.com/youtube/v3';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('YOUTUBE_API_KEY');

    if (!this.apiKey) {
      this.logger.warn(
        'YOUTUBE_API_KEY not configured. YouTube duration extraction will be disabled.',
      );
    }
  }

  /**
   * Checks if YouTube Data API is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetches video duration from YouTube Data API
   * @param videoId YouTube video ID
   * @returns Duration in ISO 8601 format or null if not available
   */
  async getVideoDuration(videoId: string): Promise<string | null> {
    if (!this.isAvailable()) {
      this.logger.debug('YouTube API not available, skipping duration fetch');
      return null;
    }

    try {
      const url = `${this.baseUrl}/videos?id=${videoId}&part=contentDetails&key=${this.apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'RSS-Feed-Processor/1.0',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `YouTube API request failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = (await response.json()) as YouTubeVideoResponse;

      if (!data.items || data.items.length === 0) {
        this.logger.debug(`No video found for ID: ${videoId}`);
        return null;
      }

      const duration = data.items[0].contentDetails.duration;
      this.logger.debug(`Retrieved duration for video ${videoId}: ${duration}`);

      return duration;
    } catch (error) {
      this.logger.error(
        `Failed to fetch duration for video ${videoId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Fetches complete video information from YouTube Data API
   * @param videoId YouTube video ID
   * @returns Video information including duration, title, etc.
   */
  async getVideoInfo(videoId: string): Promise<{
    duration?: string;
    title?: string;
    description?: string;
    publishedAt?: string;
  } | null> {
    if (!this.isAvailable()) {
      this.logger.debug('YouTube API not available, skipping video info fetch');
      return null;
    }

    try {
      const url = `${this.baseUrl}/videos?id=${videoId}&part=contentDetails,snippet&key=${this.apiKey}`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: {
          'User-Agent': 'RSS-Feed-Processor/1.0',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `YouTube API request failed: ${response.status} ${response.statusText}`,
        );
        return null;
      }

      const data = (await response.json()) as YouTubeVideoResponse;

      if (!data.items || data.items.length === 0) {
        this.logger.debug(`No video found for ID: ${videoId}`);
        return null;
      }

      const video = data.items[0];

      return {
        duration: video.contentDetails.duration,
        title: video.snippet?.title,
        description: video.snippet?.description,
        publishedAt: video.snippet?.publishedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch video info for ${videoId}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  /**
   * Extracts channel ID from a YouTube RSS feed URL or channel URL.
   * Handles: youtube.com/feeds/videos.xml?channel_id=UC...
   *          youtube.com/channel/UC...
   */
  static extractChannelIdFromFeedUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      const channelId = parsed.searchParams.get('channel_id');
      if (channelId) return channelId;

      const match = parsed.pathname.match(/\/channel\/(UC[\w-]+)/);
      if (match) return match[1];
    } catch {
      // invalid URL
    }
    return null;
  }

  /**
   * Fetches videos for a channel via the YouTube Data API.
   * When maxResults is undefined, paginates through all available videos.
   * When maxResults is set, stops after collecting that many.
   * Uses the uploads playlist trick (UU prefix) to avoid an extra channels.list call.
   */
  async getChannelVideos(
    channelId: string,
    maxResults?: number,
  ): Promise<FeedItem[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const uploadsPlaylistId = 'UU' + channelId.slice(2);
    const pageSize = 50; // max allowed by YouTube API per request
    const requestDelayMs = 500; // delay between consecutive API requests

    const playlistItems: YouTubePlaylistItemsResponse['items'] = [];
    let pageToken: string | undefined;
    let isFirstPage = true;

    try {
      do {
        if (!isFirstPage) {
          await this.sleep(requestDelayMs);
        }
        isFirstPage = false;

        const playlistUrl =
          `${this.baseUrl}/playlistItems` +
          `?part=snippet,contentDetails` +
          `&playlistId=${uploadsPlaylistId}` +
          `&maxResults=${pageSize}` +
          `&key=${this.apiKey}` +
          (pageToken ? `&pageToken=${pageToken}` : '');

        const res = await fetch(playlistUrl, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'RSS-Feed-Processor/1.0' },
        });

        if (!res.ok) {
          this.logger.warn(
            `YouTube playlistItems request failed: ${res.status} ${res.statusText}`,
          );
          break;
        }

        const data = (await res.json()) as YouTubePlaylistItemsResponse;
        playlistItems.push(...(data.items ?? []));
        pageToken = data.nextPageToken;
      } while (
        pageToken &&
        (maxResults === undefined || playlistItems.length < maxResults)
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch playlist items for channel ${channelId}: ${(error as Error).message}`,
      );
      return [];
    }

    const limitedItems =
      maxResults !== undefined
        ? playlistItems.slice(0, maxResults)
        : playlistItems;

    if (limitedItems.length === 0) return [];

    const videoIds = limitedItems.map((i) => i.contentDetails.videoId);

    // videos.list accepts max 50 IDs per request — batch if needed
    const durationMap = new Map<string, string>();
    try {
      for (let i = 0; i < videoIds.length; i += pageSize) {
        if (i > 0) await this.sleep(requestDelayMs);
        const batch = videoIds.slice(i, i + pageSize);
        const videosUrl =
          `${this.baseUrl}/videos` +
          `?part=contentDetails` +
          `&id=${batch.join(',')}` +
          `&key=${this.apiKey}`;

        const res = await fetch(videosUrl, {
          signal: AbortSignal.timeout(10000),
          headers: { 'User-Agent': 'RSS-Feed-Processor/1.0' },
        });

        if (res.ok) {
          const data = (await res.json()) as YouTubeVideosListResponse;
          for (const video of data.items ?? []) {
            durationMap.set(video.id, video.contentDetails.duration);
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch video durations for channel ${channelId}: ${(error as Error).message}`,
      );
    }

    return limitedItems.map((item) => {
      const videoId = item.contentDetails.videoId;
      const thumbnails = item.snippet.thumbnails;
      const thumbnail = (
        thumbnails.maxres ??
        thumbnails.standard ??
        thumbnails.high ??
        thumbnails.medium ??
        thumbnails.default
      )?.url;

      return {
        title: item.snippet.title,
        link: `https://www.youtube.com/watch?v=${videoId}`,
        pubDate:
          item.contentDetails.videoPublishedAt || item.snippet.publishedAt,
        content: item.snippet.description,
        thumbnail,
        duration: durationMap.get(videoId),
      };
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Converts ISO 8601 duration to human-readable format
   * @param isoDuration ISO 8601 duration string (e.g., "PT10M30S")
   * @returns Human-readable duration (e.g., "10:30")
   */
  static formatDuration(isoDuration: string): string {
    if (!isoDuration) return '';

    // Parse ISO 8601 duration format (PT[hours]H[minutes]M[seconds]S)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

    if (!match) return isoDuration;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
