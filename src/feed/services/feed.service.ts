import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';
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

    // Primeira tentativa: usar a API oembed do YouTube
    let title = await this.getYouTubeVideoTitleFromOEmbed(videoId);

    if (!title || title === 'Vídeo do YouTube') {
      // Segunda tentativa: scraping da página
      title = await this.getYouTubeVideoTitleFromPage(url);
    }

    // Thumbnail em alta qualidade
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    return {
      title: title || 'Vídeo do YouTube',
      link: url,
      content: '',
      thumbnail,
    };
  }

  /**
   * Extrai título usando a API oembed do YouTube
   */
  private async getYouTubeVideoTitleFromOEmbed(
    videoId: string,
  ): Promise<string | null> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        console.log(`OEmbed API falhou: ${res.status}`);
        return null;
      }

      const data = (await res.json()) as { title?: string };
      console.log(`Título via OEmbed: ${data.title}`);
      return data.title || null;
    } catch (error) {
      console.log(`Erro ao buscar título via OEmbed: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrai título fazendo scraping da página do YouTube
   */
  private async getYouTubeVideoTitleFromPage(
    url: string,
  ): Promise<string | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          DNT: '1',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      if (!res.ok) {
        console.log(`Scraping falhou: ${res.status}`);
        return null;
      }

      const html = await res.text();

      // Múltiplas estratégias para extrair o título
      let title = null;

      // 1. Buscar por og:title
      const ogTitleMatch = html.match(
        /<meta property="og:title" content="([^"]+)"/i,
      );
      if (ogTitleMatch) {
        title = ogTitleMatch[1];
        console.log(`Título via og:title: ${title}`);
      }

      // 2. Buscar por twitter:title
      if (!title) {
        const twitterTitleMatch = html.match(
          /<meta name="twitter:title" content="([^"]+)"/i,
        );
        if (twitterTitleMatch) {
          title = twitterTitleMatch[1];
          console.log(`Título via twitter:title: ${title}`);
        }
      }

      // 3. Buscar no JSON-LD
      if (!title) {
        const jsonLdMatch = html.match(
          /<script type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i,
        );
        if (jsonLdMatch) {
          try {
            const jsonData = JSON.parse(jsonLdMatch[1]);
            if (jsonData.name) {
              title = jsonData.name;
              console.log(`Título via JSON-LD: ${title}`);
            }
          } catch (e) {
            // Ignora erro de parsing
          }
        }
      }

      // 4. Buscar no ytInitialData
      if (!title) {
        const ytDataMatch = html.match(/var ytInitialData = ({.+?});/);
        if (ytDataMatch) {
          try {
            const ytData = JSON.parse(ytDataMatch[1]);
            const videoDetails =
              ytData?.contents?.twoColumnWatchNextResults?.results?.results
                ?.contents?.[0]?.videoPrimaryInfoRenderer?.title?.runs?.[0]
                ?.text;
            if (videoDetails) {
              title = videoDetails;
              console.log(`Título via ytInitialData: ${title}`);
            }
          } catch (e) {
            // Ignora erro de parsing
          }
        }
      }

      // 5. Fallback para title tag (menos confiável)
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) {
          title = titleMatch[1].replace(' - YouTube', '').trim();
          console.log(`Título via title tag: ${title}`);
        }
      }

      return title;
    } catch (error) {
      console.log(`Erro ao fazer scraping: ${error.message}`);
      return null;
    }
  }
}
