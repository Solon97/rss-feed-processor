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
  // YouTube thumbnail patterns
  private static readonly YOUTUBE_THUMBNAIL_PATTERNS = [
    /https?:\/\/i\.ytimg\.com\/vi\/([a-zA-Z0-9_-]+)\/[^/]+\.jpg/g,
    /https?:\/\/img\.youtube\.com\/vi\/([a-zA-Z0-9_-]+)\/[^/]+\.jpg/g,
  ];

  // Responsive styles for media elements
  private static readonly MEDIA_STYLES = `
    max-width: 100%;
    height: auto;
    display: block;
    margin: 20px auto;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  `;

  private static readonly IFRAME_STYLES = `
    width: 100%;
    max-width: 560px;
    height: 315px;
    display: block;
    margin: 20px auto;
    border: none;
    border-radius: 8px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  `;

  private static readonly FIGCAPTION_STYLES = `
    text-align: center;
    font-style: italic;
    color: #666;
    font-size: 0.9em;
    margin-top: 8px;
    line-height: 1.4;
    max-width: 100%;
  `;

  /**
   * Processes HTML content to replace YouTube thumbnails with iframes
   * and apply responsive styling to all media elements
   */
  static processContentMedia(htmlContent: string): string {
    if (!htmlContent) return htmlContent;

    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Replace YouTube thumbnails with iframes
    this.replaceYouTubeThumbnailsInDOM(document);

    // Apply responsive styling to images and iframes
    this.applyResponsiveMediaStylesInDOM(document);

    // Apply styling to figcaptions
    this.applyFigcaptionStylesInDOM(document);

    return document.body.innerHTML;
  }

  /**
   * Replaces YouTube thumbnail images with embedded iframe videos using DOM
   */
  private static replaceYouTubeThumbnailsInDOM(document: Document): void {
    const images = document.querySelectorAll('img');

    images.forEach((img) => {
      const src = img.src || img.getAttribute('src') || '';

      // Check if this is a YouTube thumbnail
      for (const pattern of this.YOUTUBE_THUMBNAIL_PATTERNS) {
        pattern.lastIndex = 0; // Reset regex state
        const match = pattern.exec(src);

        if (match && match[1]) {
          const videoId = match[1];
          const embedUrl = `https://www.youtube.com/embed/${videoId}`;

          // Create iframe element
          const iframe = document.createElement('iframe');
          iframe.src = embedUrl;
          iframe.style.cssText = this.IFRAME_STYLES;
          iframe.setAttribute('allowfullscreen', '');
          iframe.setAttribute('title', 'YouTube video player');
          iframe.setAttribute('frameborder', '0');

          // Replace img with iframe
          img.parentNode?.replaceChild(iframe, img);
          break;
        }
      }
    });
  }

  /**
   * Applies responsive styles to images and iframes using DOM
   */
  private static applyResponsiveMediaStylesInDOM(document: Document): void {
    // Style all remaining images (non-YouTube thumbnails)
    const images = document.querySelectorAll('img');
    images.forEach((img) => {
      img.style.cssText = this.MEDIA_STYLES;

      // Add responsive attributes
      if (!img.hasAttribute('loading')) {
        img.setAttribute('loading', 'lazy');
      }
    });

    // Style all iframes
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      iframe.style.cssText = this.IFRAME_STYLES;

      // Add responsive attributes for YouTube iframes
      if (iframe.src && iframe.src.includes('youtube.com/embed')) {
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute(
          'title',
          iframe.getAttribute('title') || 'YouTube video player',
        );
        iframe.setAttribute('frameborder', '0');
      }
    });
  }

  /**
   * Applies styling to figcaption elements for better readability
   */
  private static applyFigcaptionStylesInDOM(document: Document): void {
    const figcaptions = document.querySelectorAll('figcaption');
    figcaptions.forEach((figcaption) => {
      figcaption.style.cssText = this.FIGCAPTION_STYLES;
    });
  }

  /**
   * Extracts YouTube video ID from various YouTube URL formats
   */
  static extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]+)/,
      /i\.ytimg\.com\/vi\/([a-zA-Z0-9_-]+)\//,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

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

      // Process content to handle YouTube thumbnails and apply responsive styles
      const processedContent = this.processContentMedia(article.content);

      return processedContent;
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
