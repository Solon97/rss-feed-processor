import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { QStashSchedulerGuard } from './qstash-scheduler.guard';

describe('QStashSchedulerGuard', () => {
  let guard: QStashSchedulerGuard;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const createMockContext = (headers: Record<string, string> = {}) => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QStashSchedulerGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<QStashSchedulerGuard>(QStashSchedulerGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access with valid schedule ID', () => {
      const expectedScheduleId = 'test-schedule-id-123';
      mockConfigService.get.mockReturnValue(expectedScheduleId);

      const context = createMockContext({
        'upstash-schedule-id': expectedScheduleId,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(configService.get).toHaveBeenCalledWith('QSTASH_SCHEDULE_ID');
    });

    it('should throw UnauthorizedException when header is missing', () => {
      mockConfigService.get.mockReturnValue('test-schedule-id-123');

      const context = createMockContext({});

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Missing scheduler authentication header'),
      );
    });

    it('should throw UnauthorizedException when environment variable is not configured', () => {
      mockConfigService.get.mockReturnValue(undefined);

      const context = createMockContext({
        'upstash-schedule-id': 'some-id',
      });

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Scheduler authentication not configured'),
      );
    });

    it('should throw UnauthorizedException when schedule ID does not match', () => {
      const expectedScheduleId = 'correct-schedule-id';
      const receivedScheduleId = 'wrong-schedule-id';

      mockConfigService.get.mockReturnValue(expectedScheduleId);

      const context = createMockContext({
        'upstash-schedule-id': receivedScheduleId,
      });

      expect(() => guard.canActivate(context)).toThrow(
        new UnauthorizedException('Invalid scheduler authentication'),
      );
    });

    it('should handle case-sensitive header names correctly', () => {
      const expectedScheduleId = 'test-schedule-id-123';
      mockConfigService.get.mockReturnValue(expectedScheduleId);

      const context = createMockContext({
        'upstash-schedule-id': expectedScheduleId,
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
