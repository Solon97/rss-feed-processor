import { Injectable } from '@nestjs/common';
import { fetch } from 'undici';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

@Injectable()
export class ContentExtractorService {
  /**
   * Extrai o conteúdo do artigo usando Readability
   */
  async scrapeArticleContent(url: string): Promise<string> {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15000),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const html = await res.text();
      const dom = new JSDOM(html, { url });
      const document = dom.window.document;
      const article = new Readability(document).parse();

      if (!article) {
        throw new Error('Readability não conseguiu extrair o conteúdo.');
      }

      return article.content;
    } catch (error) {
      throw new Error(`Erro ao extrair conteúdo: ${error.message}`);
    }
  }

  /**
   * Extrai o título principal removendo sufixos comuns
   */
  extractMainTitle(title: string): string {
    if (!title) return title;

    // Lista de separadores comuns ordenados por prioridade
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

    let cleanTitle = title.trim();

    // Procura pelo primeiro separador encontrado na ordem de prioridade
    for (const separator of separators) {
      const separatorIndex = cleanTitle.indexOf(separator);
      // Se encontrou o separador e não está no início da string
      if (separatorIndex > 0) {
        // Extrai a primeira parte e remove espaços extras
        const firstPart = cleanTitle.substring(0, separatorIndex).trim();
        // Só retorna se a primeira parte não estiver vazia
        if (firstPart.length > 0) {
          return firstPart;
        }
      }
    }

    // Se nenhum separador foi encontrado, retorna o título original limpo
    return cleanTitle;
  }
}
