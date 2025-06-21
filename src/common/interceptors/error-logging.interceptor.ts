import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, query, user } = request;

    return next.handle().pipe(
      catchError((error) => {
        // Log do erro com contexto
        this.logger.error(`Error in ${method} ${url}`, {
          error: error.message,
          stack: error.stack,
          body,
          query,
          userId: user?.id,
          timestamp: new Date().toISOString(),
        });

        // Re-throw o erro para que seja tratado pelo exception filter
        return throwError(() => error);
      }),
    );
  }
}
