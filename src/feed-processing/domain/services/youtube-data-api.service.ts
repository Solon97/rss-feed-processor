import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch } from 'undici';

/**
 * YouTube Data API response interfaces
 */
interface YouTubeVideoResponse {
  items: Array<{
    id: string;
    contentDetails: {
      duration: string; // ISO 8601 format (e.g., "PT10M30S")
    };
    snippet?: {
      title: string;
      description: string;
      publishedAt: string;
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
        `Failed to fetch duration for video ${videoId}: ${error.message}`,
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
        `Failed to fetch video info for ${videoId}: ${error.message}`,
      );
      return null;
    }
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
