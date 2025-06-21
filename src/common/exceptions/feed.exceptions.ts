import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  UnprocessableEntityException,
} from '@nestjs/common';

/**
 * Exception para URL inválida
 */
export class InvalidUrlException extends BadRequestException {
  constructor(url?: string) {
    super({
      error: 'INVALID_URL',
      message: 'A URL fornecida é inválida',
      details: url ? `URL: ${url}` : undefined,
    });
  }
}

/**
 * Exception para feed não encontrado ou inválido
 */
export class FeedNotFoundException extends NotFoundException {
  constructor(url: string) {
    super({
      error: 'FEED_NOT_FOUND',
      message: 'Feed RSS não encontrado ou inválido',
      details: `URL: ${url}`,
    });
  }
}

/**
 * Exception para timeout de requisição
 */
export class FeedTimeoutException extends RequestTimeoutException {
  constructor(url: string) {
    super({
      error: 'FEED_TIMEOUT',
      message: 'Timeout ao acessar o feed',
      details: `URL: ${url}`,
    });
  }
}

/**
 * Exception para erro de rede ao acessar feed
 */
export class FeedNetworkException extends BadRequestException {
  constructor(url: string, statusCode?: number) {
    super({
      error: 'FEED_NETWORK_ERROR',
      message: 'Erro de rede ao acessar o feed',
      details: `URL: ${url}${statusCode ? `, Status: ${statusCode}` : ''}`,
    });
  }
}

/**
 * Exception para conteúdo não encontrado ou inacessível
 */
export class ContentNotFoundException extends NotFoundException {
  constructor(url: string) {
    super({
      error: 'CONTENT_NOT_FOUND',
      message: 'Conteúdo não encontrado ou inacessível',
      details: `URL: ${url}`,
    });
  }
}

/**
 * Exception para falha na extração de conteúdo
 */
export class ContentExtractionException extends UnprocessableEntityException {
  constructor(url: string, reason?: string) {
    super({
      error: 'CONTENT_EXTRACTION_FAILED',
      message: 'Falha ao extrair o conteúdo da página',
      details: `URL: ${url}${reason ? `, Motivo: ${reason}` : ''}`,
    });
  }
}

/**
 * Exception para usuário já inscrito no feed
 */
export class UserAlreadySubscribedException extends ConflictException {
  constructor(feedUrl: string) {
    super({
      error: 'USER_ALREADY_SUBSCRIBED',
      message: 'Usuário já está inscrito neste feed',
      details: `Feed: ${feedUrl}`,
    });
  }
}

/**
 * Exception para erro de parsing do feed
 */
export class FeedParsingException extends UnprocessableEntityException {
  constructor(url: string, reason?: string) {
    super({
      error: 'FEED_PARSING_ERROR',
      message: 'Erro ao processar o conteúdo do feed',
      details: `URL: ${url}${reason ? `, Motivo: ${reason}` : ''}`,
    });
  }
}

/**
 * Exception para erro interno não específico
 */
export class FeedProcessingException extends InternalServerErrorException {
  constructor(operation: string, reason?: string) {
    super({
      error: 'FEED_PROCESSING_ERROR',
      message: `Erro interno durante ${operation}`,
      details: reason,
    });
  }
}

/**
 * Exception para feed inativo ou desabilitado
 */
export class FeedInactiveException extends BadRequestException {
  constructor(feedUrl: string) {
    super({
      error: 'FEED_INACTIVE',
      message: 'Feed está inativo ou desabilitado',
      details: `URL: ${feedUrl}`,
    });
  }
}
