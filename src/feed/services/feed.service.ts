import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';
import { JSDOM } from 'jsdom';
import { FeedValidatorService } from './feed-validator.service';
import { FeedDiscoveryService } from './feed-discovery.service';
import { RssParserService } from './rss-parser.service';
import { ContentExtractorService } from './content-extractor.service';
import { ThumbnailExtractorService } from './thumbnail-extractor.service';
import {
  FeedValidationResult,
  FeedItemsResponse,
  ContentExtractionResult,
} from '../interfaces/feed.interface';

@Injectable()
export class FeedService {
  constructor(
    private readonly feedValidator: FeedValidatorService,
    private readonly feedDiscovery: FeedDiscoveryService,
    private readonly rssParser: RssParserService,
    private readonly contentExtractor: ContentExtractorService,
    private readonly thumbnailExtractor: ThumbnailExtractorService,
  ) {}

  /**
   * Valida uma URL e determina o tipo de feed
   */
  async validateFeed(url: string): Promise<FeedValidationResult> {
    try {
      new URL(url); // Valida URL
    } catch {
      return { isValid: false, type: null };
    }

    // Se for canal do YouTube, busca o RSS
    if (this.feedValidator.isYouTubeChannel(url)) {
      const rssUrl = await this.feedDiscovery.getYouTubeChannelRss(url);
      if (!rssUrl) {
        return { isValid: false, type: null };
      }
      return { isValid: true, type: 'youtube', feedUrl: rssUrl };
    }

    // Verifica se é um feed RSS direto válido
    if (await this.feedValidator.isValidRssFeed(url)) {
      return { isValid: true, type: 'rss', feedUrl: url };
    }

    // Tenta encontrar feed RSS no website
    const rssUrl = await this.feedDiscovery.findRssFeedInWebsite(url);
    if (rssUrl) {
      return { isValid: true, type: 'rss', feedUrl: rssUrl };
    }

    return { isValid: false, type: null };
  }

  /**
   * Obtém as URLs dos últimos 5 itens do feed
   */
  async getFeedItems(url: string): Promise<FeedItemsResponse> {
    const validation = await this.validateFeed(url);

    if (!validation.isValid || !validation.feedUrl) {
      throw new Error('Feed inválido ou não encontrado');
    }

    const { title, urls } = await this.rssParser.getFeedItemUrls(
      validation.feedUrl,
    );

    return {
      type: validation.type,
      title,
      urls,
    };
  }

  /**
   * Extrai conteúdo de uma URL específica
   */
  async extractContent(url: string): Promise<ContentExtractionResult> {
    try {
      new URL(url); // Valida URL
    } catch {
      throw new Error('URL inválida');
    }

    // Verifica se é um vídeo do YouTube
    const youtubeVideoId = this.thumbnailExtractor.extractYouTubeVideoId(url);
    if (youtubeVideoId) {
      // Para vídeos do YouTube, extraímos informações da página
      return await this.extractYouTubeVideoInfo(url, youtubeVideoId);
    }

    // Para outros conteúdos, extrai usando Readability
    const content = await this.contentExtractor.scrapeArticleContent(url);
    const thumbnail = await this.thumbnailExtractor.getThumbnailFromPage(url);

    // Extrai título da página
    const res = await fetch(url);
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch
      ? this.contentExtractor.extractMainTitle(titleMatch[1])
      : 'Título não encontrado';

    return {
      title,
      link: url,
      content,
      thumbnail,
    };
  }

  /**
   * Extrai informações de um vídeo do YouTube
   */
  private async extractYouTubeVideoInfo(
    url: string,
    videoId: string,
  ): Promise<ContentExtractionResult> {
    console.log(`Extraindo informações do vídeo do YouTube: ${videoId}`);
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Extrai título do vídeo
      let title = 'Vídeo do YouTube';
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const titleTag = document.querySelector('title');
      console.log(`Título TAG: ${titleTag?.textContent}`);
      console.log(`Título OG: ${ogTitle.getAttribute('content')}`);
      if (ogTitle?.getAttribute('content')) {
        title = ogTitle.getAttribute('content')!.replace(' - YouTube', '');
      } else if (titleTag?.textContent) {
        title = titleTag.textContent.replace(' - YouTube', '');
      }

      // Thumbnail em alta qualidade
      const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

      return {
        title,
        link: url,
        content: '',
        thumbnail,
      };
    } catch (error) {
      // Fallback em caso de erro
      return {
        title: 'Vídeo do YouTube',
        link: url,
        content: '',
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }
}
