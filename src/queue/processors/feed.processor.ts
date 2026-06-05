import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedParsingService } from '../../feed-processing/services/feed-parsing.service';
import { ContentExtractionService } from '../../feed-processing/services/content-extraction.service';
import { YouTubeDataApiService } from '../../feed-processing/domain/services/youtube-data-api.service';
import { FeedItem } from '../../feed/interfaces/feed.interface';
import {
  FeedProcessingJobData,
  FeedItemProcessingResult,
  Message,
} from '../interfaces/job.interface';

@Injectable()
export class FeedProcessor {
  private logger = new Logger(FeedProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedParsing: FeedParsingService,
    private readonly contentExtraction: ContentExtractionService,
    private readonly youtubeApiService: YouTubeDataApiService,
  ) {}

  async processFeed(
    job: Message<FeedProcessingJobData>,
  ): Promise<FeedItemProcessingResult> {
    const { feedId, feedUrl, isInitialImport } = job.data;
    const startTime = Date.now();

    this.logger.log(
      `Processing feed ${feedUrl} - Job ${job.id}${isInitialImport ? ' (initial import)' : ''}`,
    );

    try {
      // Update feed last_fetched_at timestamp
      await this.prisma.feeds.update({
        where: { id: feedId },
        data: { last_fetched_at: new Date() },
      });

      // Fetch feed items — use YouTube Data API directly for YouTube feeds
      let feedItems: FeedItem[];
      const isYouTubeFeed = feedUrl.includes('youtube.com');

      if (isYouTubeFeed && this.youtubeApiService.isAvailable()) {
        const channelId =
          YouTubeDataApiService.extractChannelIdFromFeedUrl(feedUrl);
        if (!channelId) {
          throw new Error(
            `Could not extract channel ID from feed URL: ${feedUrl}`,
          );
        }
        // undefined = fetch all pages; 10 = regular sync limit
        const maxResults = isInitialImport ? undefined : 10;
        feedItems = await this.youtubeApiService.getChannelVideos(
          channelId,
          maxResults,
        );
        this.logger.debug(
          `Fetched ${feedItems.length} videos from YouTube Data API for channel ${channelId}`,
        );
      } else {
        const feedData = await this.feedParsing.parseFeed(feedUrl);
        if (!feedData?.items) {
          throw new Error('No feed data or items found');
        }
        feedItems = isInitialImport
          ? feedData.items
          : feedData.items.slice(0, 10);
      }

      let processedItems = 0;
      let newItems = 0;
      const errors: string[] = [];

      for (const item of feedItems) {
        try {
          // Check if item already exists
          const existingItem = await this.prisma.feed_items.findUnique({
            where: {
              feed_id_url: {
                feed_id: feedId,
                url: item.link || '',
              },
            },
          });

          if (existingItem) {
            this.logger.debug(
              `Item already exists: ${item.title} - ${item.link}`,
            );
            processedItems++;
            continue;
          }

          let content = item.content || '';
          let thumbnail = item.thumbnail || '';
          let duration = item.duration;

          // For non-YouTube feeds (or YouTube without API), extract content per item
          if (!isYouTubeFeed && item.link) {
            try {
              const extractedContent =
                await this.contentExtraction.extractContent(item.link);
              content = extractedContent.content || content;
              thumbnail = extractedContent.thumbnail || thumbnail;
              duration = extractedContent.duration;
            } catch (contentError) {
              this.logger.warn(
                `Content extraction failed for ${item.link}: ${(contentError as Error).message}`,
              );
            }
          }

          // Create the feed item
          await this.prisma.feed_items.create({
            data: {
              feed_id: feedId,
              title: item.title || 'Untitled',
              url: item.link || '',
              content,
              thumbnail,
              duration,
              published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
            },
          });

          newItems++;
          processedItems++;

          this.logger.debug(
            `Created new feed item: ${item.title} - ${item.link}`,
          );
        } catch (itemError) {
          const errorMsg = `Failed to process item "${item.title}": ${(itemError as Error).message}`;
          errors.push(errorMsg);
          this.logger.error(errorMsg);
          processedItems++;
        }
      }

      const duration = Date.now() - startTime;
      this.logger.log(
        `Completed processing feed ${feedUrl} in ${duration}ms - ${newItems}/${processedItems} new items`,
      );

      return {
        feedId,
        processedItems,
        newItems,
        errors,
      };
    } catch (error) {
      this.logger.error(
        `Failed to process feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async processNewFeed(
    job: Message<FeedProcessingJobData>,
  ): Promise<FeedItemProcessingResult> {
    const { feedId } = job.data;

    this.logger.log(
      `Processing new feed ${feedId} with high priority - Job ${job.id}`,
    );

    try {
      // Use the same processing logic as regular feeds but with higher priority
      const result = await this.processFeed(job);

      this.logger.log(
        `Completed priority processing for new feed ${feedId} - ${result.newItems} new items`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to process new feed ${feedId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
