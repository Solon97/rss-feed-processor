import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';
import { JSDOM } from 'jsdom';
import { FeedValidatorService } from './feed-validator.service';

@Injectable()
export class FeedDiscoveryService {
  constructor(private readonly feedValidator: FeedValidatorService) {}

  /**
   * Encontra feed RSS em um website
   */
  async findRssFeedInWebsite(url: string): Promise<string | null> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!res.ok) return null;

      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;

      // Busca por links de feed RSS/Atom no HTML
      const feedSelectors = [
        'link[type="application/rss+xml"]',
        'link[type="application/atom+xml"]',
        'link[rel="alternate"][type*="rss"]',
        'link[rel="alternate"][type*="atom"]',
      ];

      for (const selector of feedSelectors) {
        const element = document.querySelector(selector);
        if (!element) continue;

        let feedUrl = element.getAttribute('href');
        if (!feedUrl) continue;

        // Converte URL relativa para absoluta
        feedUrl = this.resolveUrl(feedUrl, url);

        // Valida se é um feed válido
        if (await this.feedValidator.isValidRssFeed(feedUrl)) {
          return feedUrl;
        }
      }

      // Se não encontrou, tenta URLs comuns de feed
      const baseUrl = new URL(url);
      const commonPaths = [
        '/feed',
        '/rss',
        '/feed.xml',
        '/rss.xml',
        '/atom.xml',
        '/blog/feed',
        '/blog/rss',
        '/blog/feed.xml',
        '/blog/rss.xml',
      ];

      for (const path of commonPaths) {
        const testUrl = `${baseUrl.protocol}//${baseUrl.host}${path}`;
        if (
          await this.feedValidator.isValidRssFeed(testUrl).catch(() => false)
        ) {
          return testUrl;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtém URL RSS do canal do YouTube
   */
  async getYouTubeChannelRss(channelUrl: string): Promise<string | null> {
    if (channelUrl.includes('youtube.com/feeds/videos.xml')) {
      return channelUrl; // Já é um feed RSS válido
    }
    try {
      const res = await fetch(channelUrl, {
        signal: AbortSignal.timeout(10000),
      });
      const html = await res.text();
      const match = html.match(
        /<link rel="alternate" type="application\/rss\+xml"[^>]*href="([^"]+)"/,
      );
      return match ? match[1] : null;
    } catch (error) {
      throw new Error(`Erro ao buscar RSS do canal YouTube: ${error.message}`);
    }
  }

  /**
   * Converte URL do Medium para feed RSS
   * Exemplo: https://medium.com/engage -> https://medium.com/feed/engage
   */
  getMediumFeedUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Se já é um feed, retorna a URL original
      if (path.includes('/feed/')) {
        return url;
      }

      // Para perfis de usuário: medium.com/@username -> medium.com/feed/@username
      if (path.startsWith('/@')) {
        return `${urlObj.protocol}//${urlObj.host}/feed${path}`;
      }

      // Para publicações: medium.com/publication -> medium.com/feed/publication
      if (path !== '/' && path !== '') {
        return `${urlObj.protocol}//${urlObj.host}/feed${path}`;
      }

      // Para domínio raiz: medium.com -> medium.com/feed
      return `${urlObj.protocol}//${urlObj.host}/feed`;
    } catch (error) {
      throw new Error(`Erro ao converter URL do Medium: ${error.message}`);
    }
  }

  /**
   * Converte URL do Dev.to para feed RSS
   * Exemplo: https://dev.to/ben -> https://dev.to/feed/ben
   */
  getDevToFeedUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;

      // Se já é um feed, retorna a URL original
      if (path.includes('/feed/')) {
        return url;
      }

      // Para perfis de usuário: dev.to/username -> dev.to/feed/username
      if (path !== '/' && path !== '') {
        return `${urlObj.protocol}//${urlObj.host}/feed${path}`;
      }

      // Para domínio raiz: dev.to -> dev.to/feed
      return `${urlObj.protocol}//${urlObj.host}/feed`;
    } catch (error) {
      throw new Error(`Erro ao converter URL do Dev.to: ${error.message}`);
    }
  }

  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http')) {
      return href;
    }

    const base = new URL(baseUrl);
    if (href.startsWith('//')) {
      return `${base.protocol}${href}`;
    } else if (href.startsWith('/')) {
      return `${base.protocol}//${base.host}${href}`;
    } else {
      return `${base.protocol}//${base.host}/${href}`;
    }
  }
}
