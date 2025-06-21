import { Injectable } from '@nestjs/common';
import * as Parser from 'rss-parser';
import { Feed, FeedItem } from '../interfaces/feed.interface';
import { ContentExtractorService } from './content-extractor.service';
import { ThumbnailExtractorService } from './thumbnail-extractor.service';
import {
  FeedParsingException,
  FeedTimeoutException,
  FeedNetworkException,
} from '../../common/exceptions/feed.exceptions';

@Injectable()
export class RssParserService {
  private parser: Parser;

  constructor(
    private readonly contentExtractor: ContentExtractorService,
    private readonly thumbnailExtractor: ThumbnailExtractorService,
  ) {
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
   * Processa feed RSS e retorna os 5 itens mais recentes
   */
  async parseRssFeed(
    rssUrl: string,
    feedType: 'rss' | 'youtube',
  ): Promise<Feed> {
    try {
      const feed = await this.parser.parseURL(rssUrl);

      // Processa apenas os 5 itens mais recentes
      const recentItems = feed.items.slice(0, 5);
      const itemsWithThumbnails = await Promise.all(
        recentItems.map(async (item): Promise<FeedItem> => {
          const thumbnail =
            await this.thumbnailExtractor.extractThumbnail(item);
          return {
            title: this.contentExtractor.extractMainTitle(item.title),
            link: item.link,
            pubDate: item.pubDate || item.isoDate,
            content:
              feedType === 'youtube'
                ? item['media:group']?.['media:description']?.join('')
                : await this.contentExtractor.scrapeArticleContent(item.link),
            thumbnail: thumbnail,
          };
        }),
      );

      return {
        title: this.contentExtractor.extractMainTitle(feed.title),
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
      const recentItems = feed.items.slice(0, 5);

      return {
        title: this.contentExtractor.extractMainTitle(feed.title),
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
}
