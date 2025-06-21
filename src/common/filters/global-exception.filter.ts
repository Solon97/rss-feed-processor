import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_SERVER_ERROR';
    let message = 'Erro interno do servidor';
    let details: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const errorObj = exceptionResponse as any;
        errorCode = errorObj.error || exception.constructor.name;
        message = errorObj.message || exception.message;
        details = errorObj.details;
      } else {
        message = exception.message;
        errorCode = exception.constructor.name;
      }
    } else {
      // Para erros não HTTP (ex: erros de banco de dados, etc.)
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      );
    }

    const errorResponse: ErrorResponse = {
      success: false,
      error: errorCode,
      message,
      details,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log do erro
    this.logger.error(`HTTP ${status} ${errorCode}: ${message}`, {
      path: request.url,
      method: request.method,
      details,
      userId: request.user?.id,
    });

    response.status(status).json(errorResponse);
  }
}
