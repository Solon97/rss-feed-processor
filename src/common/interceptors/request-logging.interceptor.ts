import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UserInfo } from '../../auth/decorators/current-user.decorator';

interface AuthenticatedRequest extends Request {
  user?: UserInfo;
}

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const { method, url } = request;

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`Request completed: ${method} ${url}`);
      }),
    );
  }
}
