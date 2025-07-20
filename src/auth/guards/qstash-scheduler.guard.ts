import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QStashSchedulerGuard implements CanActivate {
  private readonly logger = new Logger(QStashSchedulerGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const scheduleId = request.headers['upstash-schedule-id'] as string;
    const expectedScheduleId =
      this.configService.get<string>('QSTASH_SCHEDULE_ID');

    if (!scheduleId) {
      this.logger.warn('Missing Upstash-Schedule-Id header in request');
      throw new UnauthorizedException('Invalid scheduler authentication');
    }

    if (!expectedScheduleId) {
      this.logger.error(
        'QSTASH_SCHEDULE_ID environment variable not configured',
      );
      throw new UnauthorizedException('Invalid scheduler authentication');
    }

    if (scheduleId !== expectedScheduleId) {
      this.logger.warn(`Invalid Upstash-Schedule-Id`);
      throw new UnauthorizedException('Invalid scheduler authentication');
    }

    this.logger.debug('QStash scheduler authentication successful');
    return true;
  }
}
