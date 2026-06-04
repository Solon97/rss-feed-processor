import { Injectable } from '@nestjs/common';
import * as Parser from 'rss-parser';
import { Feed, FeedItem } from '@/feed/interfaces/feed.interface';
import { ContentExtractorUtil } from '../../utils/content-extractor.util';
import { ThumbnailExtractorUtil } from '../../utils/thumbnail-extractor.util';
import {
  FeedParsingException,
  FeedTimeoutException,
  FeedNetworkException,
} from '@/common/exceptions/feed.exceptions';
import { FeedType } from '@prisma/client';

@Injectable()
export class RssParserService {
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ['media:group', 'media:group'],
          ['media:thumbnail', 'media:thumbnail'],
        ],
      },
    });
  }

  /**
   * Processa feed RSS e retorna todos os itens disponíveis sem scraping de conteúdo.
   * O conteúdo completo é extraído posteriormente pelo FeedProcessor via ContentExtractionService.
   */
  async parseRssFeed(rssUrl: string, feedType: FeedType): Promise<Feed> {
    try {
      const feed = await this.parser.parseURL(rssUrl);
      const itemsWithThumbnails = await Promise.all(
        feed.items.map(async (item): Promise<FeedItem> => {
          const thumbnail =
            await ThumbnailExtractorUtil.extractThumbnailFromFeedItem(item);
          return {
            title: ContentExtractorUtil.extractMainTitle(item.title),
            link: item.link,
            pubDate: item.pubDate || item.isoDate,
            content:
              feedType === 'youtube'
                ? item['media:group']?.['media:description']?.join('')
                : item.content || item['contentSnippet'] || '',
            thumbnail: thumbnail,
          };
        }),
      );
      return {
        title: ContentExtractorUtil.extractMainTitle(feed.title),
        items: itemsWithThumbnails,
      };
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(rssUrl);
      }
      if (error.message?.includes('Non-whitespace')) {
        throw new FeedParsingException(rssUrl, 'Formato de feed inválido');
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new FeedNetworkException(rssUrl);
      }
      throw new FeedParsingException(rssUrl, error.message);
    }
  }

  /**
   * Retorna apenas as URLs dos 5 últimos itens
   */
  async getFeedItemUrls(
    rssUrl: string,
  ): Promise<{ title: string; urls: string[] }> {
    try {
      const feed = await this.parser.parseURL(rssUrl);
      const recentItems = feed.items.slice(0, 10);

      return {
        title: ContentExtractorUtil.extractMainTitle(feed.title),
        urls: recentItems.map((item) => item.link).filter(Boolean),
      };
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(rssUrl);
      }
      if (error.message?.includes('Non-whitespace')) {
        throw new FeedParsingException(rssUrl, 'Formato de feed inválido');
      }
      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new FeedNetworkException(rssUrl);
      }
      throw new FeedParsingException(rssUrl, error.message);
    }
  }

  /**
   * Simplified method to parse a feed URL and determine type automatically
   */
  async parseFeed(rssUrl: string): Promise<Feed> {
    // Determine feed type based on URL
    const feedType = rssUrl.includes('youtube.com') ? 'youtube' : 'rss';
    return this.parseRssFeed(rssUrl, feedType);
  }
}
