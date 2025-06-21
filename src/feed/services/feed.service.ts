import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';
import { FeedValidatorService } from './feed-validator.service';
import { FeedDiscoveryService } from './feed-discovery.service';
import { RssParserService } from './rss-parser.service';
import { ContentExtractorService } from './content-extractor.service';
import { ThumbnailExtractorService } from './thumbnail-extractor.service';
import { PrismaService } from '../../prisma/prisma.service';

import {
  FeedValidationResult,
  FeedItemsResponse,
  ContentExtractionResult,
} from '../interfaces/feed.interface';

import {
  InvalidUrlException,
  FeedNotFoundException,
  FeedTimeoutException,
  FeedNetworkException,
  ContentNotFoundException,
  ContentExtractionException,
  UserAlreadySubscribedException,
  FeedParsingException,
  FeedProcessingException,
} from '../../common/exceptions/feed.exceptions';

@Injectable()
export class FeedService {
  constructor(
    private readonly feedValidator: FeedValidatorService,
    private readonly feedDiscovery: FeedDiscoveryService,
    private readonly rssParser: RssParserService,
    private readonly contentExtractor: ContentExtractorService,
    private readonly thumbnailExtractor: ThumbnailExtractorService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Valida uma URL e determina o tipo de feed
   */
  async validateFeed(url: string): Promise<FeedValidationResult> {
    try {
      new URL(url); // Valida URL
    } catch {
      throw new InvalidUrlException(url);
    }

    try {
      // Se for canal do YouTube, busca o RSS
      if (this.feedValidator.isYouTubeChannel(url)) {
        const rssUrl = await this.feedDiscovery.getYouTubeChannelRss(url);
        if (!rssUrl) {
          throw new FeedNotFoundException(url);
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

      throw new FeedNotFoundException(url);
    } catch (error) {
      if (
        error.name?.includes('TimeoutError') ||
        error.code === 'UND_ERR_CONNECT_TIMEOUT'
      ) {
        throw new FeedTimeoutException(url);
      }
      if (
        error instanceof InvalidUrlException ||
        error instanceof FeedNotFoundException
      ) {
        throw error;
      }
      throw new FeedNetworkException(url);
    }
  }

  /**
   * Obtém as URLs dos últimos 5 itens do feed
   */
  async getFeedItems(url: string): Promise<FeedItemsResponse> {
    const validation = await this.validateFeed(url);

    if (!validation.isValid || !validation.feedUrl) {
      throw new FeedNotFoundException(url);
    }

    try {
      const { title, urls } = await this.rssParser.getFeedItemUrls(
        validation.feedUrl,
      );

      return {
        type: validation.type,
        title,
        urls,
      };
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(validation.feedUrl);
      }
      throw new FeedParsingException(validation.feedUrl, error.message);
    }
  }

  /**
   * Extrai conteúdo de uma URL específica
   */
  async extractContent(url: string): Promise<ContentExtractionResult> {
    try {
      new URL(url); // Valida URL
    } catch {
      throw new InvalidUrlException(url);
    }

    try {
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
      if (!res.ok) {
        throw new ContentNotFoundException(url);
      }

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

  /**
   * Creates a user feed subscription
   * If feed doesn't exist, validates and creates it with the latest 5 items
   * If feed exists, just creates the user subscription
   */
  async createUserFeed(userId: string, feedUrl: string) {
    try {
      // Validate the feed URL first
      const validation = await this.validateFeed(feedUrl);

      if (!validation.isValid || !validation.feedUrl) {
        throw new FeedNotFoundException(feedUrl);
      }

      // Check if feed already exists in database
      let feed = await this.prisma.feeds.findUnique({
        where: { url: validation.feedUrl },
      });

      // If feed doesn't exist, create it
      if (!feed) {
        feed = await this.createFeedWithItems(validation.feedUrl);
      }

      // Check if user is already subscribed to this feed
      const existingUserFeed = await this.prisma.user_feeds.findUnique({
        where: {
          user_id_feed_id: {
            user_id: userId,
            feed_id: feed.id,
          },
        },
      });

      if (existingUserFeed) {
        throw new UserAlreadySubscribedException(feedUrl);
      }

      // Create user feed subscription
      const userFeed = await this.prisma.user_feeds.create({
        data: {
          user_id: userId,
          feed_id: feed.id,
          is_active: true,
          access_permissions: 'read',
          notification_enabled: true,
          notification_frequency: 'immediate',
        },
      });

      return {
        feed,
        userFeed,
        message: 'Feed criado e usuário inscrito com sucesso',
      };
    } catch (error) {
      if (
        error instanceof FeedNotFoundException ||
        error instanceof UserAlreadySubscribedException ||
        error instanceof InvalidUrlException ||
        error instanceof FeedTimeoutException ||
        error instanceof FeedNetworkException
      ) {
        throw error;
      }
      throw new FeedProcessingException('criação de inscrição', error.message);
    }
  }

  /**
   * Creates a new feed and extracts the latest 5 items
   */
  private async createFeedWithItems(feedUrl: string) {
    try {
      // Get feed metadata and items
      const feedData = await this.rssParser.getFeedItemUrls(feedUrl);

      // Create the feed record
      const feed = await this.prisma.feeds.create({
        data: {
          name: feedData.title || 'Feed sem título',
          url: feedUrl,
          is_active: true,
          status: 'active',
          last_fetched_at: new Date(),
        },
      });

      // Extract content for the first 5 items and save them
      const maxItems = parseInt(process.env.MAX_FEED_ITEMS || '5');
      const itemsToProcess = feedData.urls.slice(0, maxItems);

      const feedItems = [];
      for (const itemUrl of itemsToProcess) {
        try {
          const content = await this.extractContent(itemUrl);

          const feedItem = await this.prisma.feed_items.create({
            data: {
              feed_id: feed.id,
              title: content.title,
              url: content.link,
              content: content.content,
              thumbnail: content.thumbnail,
              published_at: content.pubDate
                ? new Date(content.pubDate)
                : new Date(),
            },
          });

          feedItems.push(feedItem);
        } catch (error) {
          console.error(`Erro ao processar item ${itemUrl}:`, error.message);
          // Continue with next item instead of failing completely
        }
      }

      return feed;
    } catch (error) {
      if (error.name?.includes('TimeoutError')) {
        throw new FeedTimeoutException(feedUrl);
      }
      throw new FeedProcessingException('criação do feed', error.message);
    }
  }
}
