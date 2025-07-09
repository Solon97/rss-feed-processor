import { Processor, Process } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { FeedParsingService } from '../../feed-processing/services/feed-parsing.service';
import { ContentExtractionService } from '../../feed-processing/services/content-extraction.service';
import {
  FeedProcessingJobData,
  FeedItemProcessingResult,
  QueueNames,
  JobTypes,
} from '../interfaces/job.interface';

@Processor(QueueNames.FEED_PROCESSING)
@Injectable()
export class FeedProcessingProcessor {
  private readonly logger = new Logger(FeedProcessingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly feedParsing: FeedParsingService,
    private readonly contentExtraction: ContentExtractionService,
  ) {}

  @Process(JobTypes.PROCESS_FEED)
  async processFeed(
    job: Job<FeedProcessingJobData>,
  ): Promise<FeedItemProcessingResult> {
    const { feedId, feedUrl, userCount } = job.data;
    const startTime = Date.now();

    this.logger.log(
      `Processing feed ${feedUrl} (${userCount} users) - Job ${job.id}`,
    );

    try {
      // Update feed last_fetched_at timestamp
      await this.prisma.feeds.update({
        where: { id: feedId },
        data: { last_fetched_at: new Date() },
      });

      // Parse the RSS feed
      const feedData = await this.feedParsing.parseFeed(feedUrl);

      if (!feedData || !feedData.items) {
        throw new Error('No feed data or items found');
      }

      // Get the 10 most recent items
      const recentItems = feedData.items.slice(0, 10);

      let processedItems = 0;
      let newItems = 0;
      const errors: string[] = [];

      for (const item of recentItems) {
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

          // Extract content for the item
          let content = item.content || '';
          let thumbnail = item.thumbnail || '';

          if (item.link) {
            try {
              const extractedContent =
                await this.contentExtraction.extractContent(item.link);
              content = extractedContent.content || content;
              thumbnail = extractedContent.thumbnail || thumbnail;
            } catch (contentError) {
              this.logger.warn(
                `Content extraction failed for ${item.link}: ${contentError.message}`,
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
              published_at: item.pubDate ? new Date(item.pubDate) : new Date(),
            },
          });

          newItems++;
          processedItems++;

          this.logger.debug(
            `Created new feed item: ${item.title} - ${item.link}`,
          );
        } catch (itemError) {
          const errorMsg = `Failed to process item "${item.title}": ${itemError.message}`;
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
}
