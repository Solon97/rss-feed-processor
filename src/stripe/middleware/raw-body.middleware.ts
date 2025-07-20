import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: any, res: any, next: any) {
    if (req.originalUrl === '/stripe/webhooks') {
      let data = '';
      req.setEncoding('utf8');

      req.on('data', (chunk) => {
        data += chunk;
      });

      req.on('end', () => {
        (req as any).rawBody = data;
        req.body = Buffer.from(data, 'utf8');
        next();
      });
    } else {
      next();
    }
  }
}
