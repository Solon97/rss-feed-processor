import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class WebhookAuthGuard implements CanActivate {
  private readonly logger = new Logger(WebhookAuthGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('Webhook request without authorization token');
      throw new UnauthorizedException('Authorization token is required');
    }

    const validToken = this.configService.get<string>('WEBHOOK_AUTH_TOKEN');

    if (!validToken) {
      this.logger.error('WEBHOOK_AUTH_TOKEN not configured in environment');
      throw new UnauthorizedException('Webhook authentication not configured');
    }

    if (token !== validToken) {
      this.logger.warn(
        `Invalid webhook token attempt: ${token.substring(0, 8)}...`,
      );
      throw new UnauthorizedException('Invalid authorization token');
    }

    this.logger.log('Webhook request authenticated successfully');
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    const webhookTokenHeader = request.headers['x-webhook-token'] as string;

    if (webhookTokenHeader) {
      return webhookTokenHeader;
    }

    if (authHeader) {
      const [type, token] = authHeader.split(' ');

      if (type === 'Bearer' && token) {
        return token;
      }

      return authHeader;
    }

    return undefined;
  }
}
