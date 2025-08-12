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

      // Create JSDOM with conservative settings to avoid CSS parsing errors
      const dom = new JSDOM(html, {
        url,
        pretendToBeVisual: false,
        resources: undefined, // Disable external resource loading including CSS
        runScripts: 'outside-only',
      });
      const document = dom.window.document;
      const article = new Readability(document).parse();

      if (!article) {
        throw new ContentExtractionException(
          url,
          'Readability could not extract content',
        );
      }

      // Sanitize first paragraph embeds in HTML (minimal) – result is not used directly
      // but helps when falling back from textContent to HTML-to-text extraction
      const minimallySanitizedHtml = this.sanitizeFirstParagraphEmbeds(
        article.content,
      );

      // Use textContent when available; fallback to stripped HTML
      const text = article.textContent?.trim()
        ? article.textContent
        : this.stripHtmlToText(minimallySanitizedHtml);

      const summary = this.generateSummaryFromText(text, {
        min: 250,
        max: 400,
      });

      return summary;
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

  // =====================
  // Text/Summary utilities
  // =====================

  /**
   * Minimal sanitizer to remove embeds (iframe, img, figure) from the first paragraph only
   * leaving the rest untouched. Used as a helper before text extraction.
   */
  private static sanitizeFirstParagraphEmbeds(html: string): string {
    if (!html) return '';
    try {
      const dom = new JSDOM(html);
      const doc = dom.window.document;
      const firstP = doc.body.querySelector('p');
      if (firstP) {
        // Remove embed elements inside first paragraph
        firstP
          .querySelectorAll('iframe, img, figure')
          .forEach((el) => el.remove());
      }
      return doc.body.innerHTML;
    } catch {
      return html;
    }
  }

  /**
   * Remove all HTML tags, decode entities and normalize whitespace
   */
  private static stripHtmlToText(html: string): string {
    if (!html) return '';
    try {
      const dom = new JSDOM(`<body>${html}</body>`);
      const text = dom.window.document.body.textContent || '';
      return this.normalizeWhitespaces(text);
    } catch {
      // Fallback regex-based stripping
      const txt = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      return this.normalizeWhitespaces(txt);
    }
  }

  /**
   * Normalize whitespaces, collapse spaces, trim, ensure capitalized start and
   * avoid trailing connective words
   */
  private static normalizeWhitespaces(text: string): string {
    if (!text) return '';
    let t = text
      .replace(/\r\n|\r/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width
      .replace(/ +/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (t.length > 0) {
      t = t[0].toUpperCase() + t.slice(1);
    }

    // Remove trailing connectors if present
    t = t.replace(/(?:\s+(?:e|ou|mas|porém|contudo|que|de))[,;:]?\s*$/i, '');
    return t;
  }

  /**
   * Split into paragraphs based on double newlines; filter empty and very short entries (<40 chars)
   */
  private static splitIntoParagraphs(text: string): string[] {
    if (!text) return [];
    const raw = text
      .replace(/\r\n|\r/g, '\n')
      .split(/\n\s*\n+/)
      .map((p) => this.normalizeWhitespaces(p))
      .filter((p) => p.length > 0);

    const filtered = raw.filter((p) => p.length >= 40);
    return filtered.length > 0 ? filtered : raw;
  }

  /**
   * Remove boilerplate lines and CTAs from the text
   */
  private static removeBoilerplateAndCtas(text: string): string {
    if (!text) return '';
    const lines = text
      .replace(/\r\n|\r/g, '\n')
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => {
        const lower = l.toLowerCase();
        // pure URLs
        if (/^https?:\/\//i.test(lower)) return false;
        // social / CTA / boilerplate / comments / cookie / paywall
        const patterns = [
          'assine',
          'assinante',
          'assinantes',
          'subscribe',
          'cookies',
          'compartilhe',
          'compartilhar',
          'siga',
          'siga-nos',
          'comentários',
          'comentarios',
          'rodapé',
          'rodape',
          'leia mais',
          'leia mais no',
          'para assinantes',
          'conteúdo exclusivo',
          'conteudo exclusivo',
          'política de privacidade',
          'politica de privacidade',
        ];
        if (patterns.some((p) => lower.includes(p))) return false;
        // generic social mentions
        if (
          /facebook|twitter|instagram|tiktok|youtube/.test(lower) &&
          /(siga|compartilhe|seguir|inscreva-se|inscreva|assista|veja)/.test(
            lower,
          )
        )
          return false;
        return true;
      });
    return lines.join('\n');
  }

  /**
   * Concatenate paragraphs until reaching the minimum length, preserving order and spacing
   */
  private static buildBaseSummary(paragraphs: string[], min = 250): string {
    let acc = '';
    for (const p of paragraphs) {
      if (acc.length >= min) break;
      acc = acc ? `${acc}\n\n${p}` : p;
    }
    return acc;
  }

  /**
   * Clamp text to sentence boundary before max; if none, cut at last word and add ellipsis
   */
  private static clampToSentenceBoundary(
    text: string,
    max = 400,
  ): { text: string; truncated: boolean } {
    const t = this.normalizeWhitespaces(text);
    if (t.length <= max) return { text: t, truncated: false };

    // Find last sentence delimiter before max
    const delimiters = /[\.!?;]/g;
    let lastGood = -1;
    let match: RegExpExecArray | null;
    while ((match = delimiters.exec(t)) !== null) {
      if (match.index < max)
        lastGood = match.index + 1; // include delimiter
      else break;
    }

    let out: string;
    if (lastGood > 50) {
      out = t.slice(0, lastGood).trim();
    } else {
      // fallback: cut at last space before max
      const cut = t.lastIndexOf(' ', max - 1);
      out = (cut > 0 ? t.slice(0, cut) : t.slice(0, max)).trim();
    }
    return { text: out, truncated: true };
  }

  /**
   * If first block is a list and the following text is short, merge first two items into one sentence
   */
  private static coalesceInitialListIfPresent(paragraphs: string[]): string[] {
    if (!paragraphs || paragraphs.length === 0) return paragraphs;
    const first = paragraphs[0];
    const lines = first.split(/\n+/);
    const isListLine = (s: string) =>
      /^(?:[-•\u2022\u25CF]|\d+\.|\*)\s+/.test(s.trim());
    const listItems = lines.filter((l) => isListLine(l));
    if (listItems.length >= 2) {
      const nextText = paragraphs[1] || '';
      if (nextText.length < 120) {
        const cleanItem = (s: string) =>
          s.replace(/^(?:[-•\u2022\u25CF]|\d+\.|\*)\s+/, '').trim();
        const sentence = `${cleanItem(listItems[0])}; ${cleanItem(listItems[1])}.`;
        const rest = lines
          .filter((l) => !isListLine(l))
          .join(' ')
          .trim();
        const mergedFirst = this.normalizeWhitespaces(
          [sentence, rest].filter(Boolean).join(' '),
        );
        const newParas = [mergedFirst, ...paragraphs.slice(1)];
        return newParas;
      }
    }
    return paragraphs;
  }

  /**
   * Remove or replace early embed references (YouTube/Twitter) near the start of the text
   */
  private static dropEarlyEmbedMentions(paragraphs: string[]): {
    paragraphs: string[];
    hadEmbed: boolean;
  } {
    if (!paragraphs || paragraphs.length === 0)
      return { paragraphs, hadEmbed: false };
    const embedRe =
      /(youtube|twitter|x\.com|tiktok|vídeo|video|trailer|player|assista|veja)/i;
    let had = false;
    const out: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      if (i <= 1 && embedRe.test(p) && p.length < 220) {
        // drop it
        had = true;
        continue;
      }
      out.push(p);
    }
    return { paragraphs: out, hadEmbed: had };
  }

  /**
   * Build a concise summary from raw text
   */
  private static generateSummaryFromText(
    rawText: string,
    opts?: { min?: number; max?: number },
  ): string {
    const min = opts?.min ?? 250;
    const max = opts?.max ?? 400;

    const clean0 = this.removeBoilerplateAndCtas(rawText);
    const clean = this.normalizeWhitespaces(clean0);

    let paragraphs = this.splitIntoParagraphs(clean);
    if (paragraphs.length === 0) {
      return '';
    }

    paragraphs = this.coalesceInitialListIfPresent(paragraphs);
    const { paragraphs: noEmbeds, hadEmbed } =
      this.dropEarlyEmbedMentions(paragraphs);
    paragraphs = noEmbeds;

    // Remove paywall paragraphs
    paragraphs = paragraphs.filter(
      (p) =>
        !/(para assinantes|conteúdo exclusivo|conteudo exclusivo)/i.test(p),
    );

    if (paragraphs.length === 0) return '';

    let base = this.buildBaseSummary(paragraphs, min);
    let { text: clamped, truncated } = this.clampToSentenceBoundary(base, max);

    // If too short and we have more paragraphs, try to include the next and clamp again
    let idx = 1;
    while (clamped.length < min && idx < paragraphs.length) {
      base = this.normalizeWhitespaces(`${base}\n\n${paragraphs[idx++]}`);
      const res = this.clampToSentenceBoundary(base, max);
      clamped = res.text;
      truncated = res.truncated;
      if (clamped.length >= min) break;
    }

    // Optionally add a short embed mention if we dropped one and text is still very short
    if (hadEmbed && clamped.length < min && paragraphs.length <= 2) {
      const withMention = `${clamped} Veja o trailer no artigo original.`;
      const res = this.clampToSentenceBoundary(withMention, max);
      clamped = res.text;
      truncated = res.truncated || withMention.length > clamped.length;
    }

    // Add ellipsis when truncated OR when shorter than the minimum target,
    // to encourage clicking the original article.
    if (truncated || clamped.length < min) {
      return `${clamped} [...]`;
    }
    return clamped;
  }
}
