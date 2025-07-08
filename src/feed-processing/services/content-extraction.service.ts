import { Injectable } from '@nestjs/common';
import { ContentExtractionResult } from '@/feed/interfaces/feed.interface';
import { ContentExtractorUtil } from '../utils/content-extractor.util';
import { ThumbnailExtractorUtil } from '../utils/thumbnail-extractor.util';
import { YouTubeExtractorUtil } from '../utils/youtube-extractor.util';
import {
  InvalidUrlException,
  ContentNotFoundException,
  ContentExtractionException,
  FeedTimeoutException,
} from '@/common/exceptions/feed.exceptions';

/**
 * Service for Content Extraction
 * Handles content extraction from URLs with different strategies
 */
@Injectable()
export class ContentExtractionService {
  /**
   * Extracts content from a specific URL
   */
  async extractContent(url: string): Promise<ContentExtractionResult> {
    try {
      new URL(url); // Validate URL
    } catch {
      throw new InvalidUrlException(url);
    }

    try {
      // Check if it's a YouTube video
      const youtubeVideoId = ThumbnailExtractorUtil.extractYouTubeVideoId(url);
      if (youtubeVideoId) {
        return await YouTubeExtractorUtil.extractVideoInfo(url, youtubeVideoId);
      }

      // For other content, extract using Readability
      const content = await ContentExtractorUtil.scrapeArticleContent(url);
      const thumbnail = await ThumbnailExtractorUtil.getThumbnailFromPage(url);

      // Extract page title
      const title = await ContentExtractorUtil.extractPageTitle(url);

      return {
        title,
        link: url,
        content,
        thumbnail,
      };
    } catch (error) {
      if (
        error instanceof InvalidUrlException ||
        error instanceof ContentNotFoundException
      ) {
        throw error;
      }
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(url);
      }
      if (error.message?.includes('HTTP')) {
        throw new ContentNotFoundException(url);
      }
      throw new ContentExtractionException(url, error.message);
    }
  }
}
