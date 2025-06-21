import { fetch } from 'undici';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import {
  ContentNotFoundException,
  ContentExtractionException,
  FeedTimeoutException,
} from '@/common/exceptions/feed.exceptions';

/**
 * Utility class for content extraction operations
 * Contains pure functions and specific content extraction logic
 */
export class ContentExtractorUtil {
  /**
   * Extracts article content using Readability
   */
  static async scrapeArticleContent(url: string): Promise<string> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!res.ok) {
        throw new ContentNotFoundException(url);
      }

      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;
      const article = new Readability(document).parse();

      if (!article) {
        throw new ContentExtractionException(
          url,
          'Readability could not extract content',
        );
      }

      return article.content;
    } catch (error) {
      if (
        error instanceof ContentNotFoundException ||
        error instanceof ContentExtractionException
      ) {
        throw error;
      }
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(url);
      }
      throw new ContentExtractionException(url, error.message);
    }
  }

  /**
   * Extracts main title by removing common suffixes
   */
  static extractMainTitle(title: string): string {
    if (!title) return title;

    const separators = [
      ' | ',
      ' l ',
      ' │ ',
      ' – ',
      ' — ',
      ' - ',
      ' • ',
      ' :: ',
      ' : ',
      ' / ',
    ];

    const cleanTitle = title.trim();

    for (const separator of separators) {
      const separatorIndex = cleanTitle.indexOf(separator);
      if (separatorIndex > 0) {
        const firstPart = cleanTitle.substring(0, separatorIndex).trim();
        if (firstPart.length > 0) {
          return firstPart;
        }
      }
    }

    return cleanTitle;
  }

  /**
   * Extracts page title from HTML
   */
  static async extractPageTitle(url: string): Promise<string> {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new ContentNotFoundException(url);
      }

      const html = await res.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      return titleMatch
        ? this.extractMainTitle(titleMatch[1])
        : 'Título não encontrado';
    } catch (error) {
      throw new ContentExtractionException(url, error.message);
    }
  }
}
