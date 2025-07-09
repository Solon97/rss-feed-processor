import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QueueNames } from '../interfaces/job.interface';

@Injectable()
export class QueueHealthService {
  private readonly logger = new Logger(QueueHealthService.name);

  constructor(
    @InjectQueue(QueueNames.FEED_PROCESSING)
    private readonly feedProcessingQueue: Queue,
    @InjectQueue(QueueNames.FEED_PRIORITY)
    private readonly feedPriorityQueue: Queue,
  ) {}

  async getHealthStatus() {
    try {
      const [processingHealth, priorityHealth] = await Promise.all([
        this.getQueueHealth(this.feedProcessingQueue, 'Processing'),
        this.getQueueHealth(this.feedPriorityQueue, 'Priority'),
      ]);

      const overallHealth = this.determineOverallHealth([
        processingHealth,
        priorityHealth,
      ]);

      return {
        status: overallHealth,
        queues: {
          processing: processingHealth,
          priority: priorityHealth,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Health check failed: ${error.message}`, error.stack);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async getQueueHealth(queue: Queue, name: string) {
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      const totalJobs = waiting.length + active.length + delayed.length;
      const failureRate =
        failed.length > 0
          ? failed.length / (failed.length + completed.length)
          : 0;

      // Determine health based on various metrics
      let status = 'healthy';

      if (failureRate > 0.5) {
        status = 'unhealthy';
      } else if (failureRate > 0.2 || totalJobs > 1000) {
        status = 'degraded';
      }

      return {
        name,
        status,
        metrics: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          delayed: delayed.length,
          failureRate: Math.round(failureRate * 100),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get health for ${name} queue: ${error.message}`,
      );
      return {
        name,
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private determineOverallHealth(queueHealths: any[]): string {
    const statuses = queueHealths.map((q) => q.status);

    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    if (statuses.includes('degraded')) {
      return 'degraded';
    }

    return 'healthy';
  }

  async clearFailedJobs() {
    try {
      const [processingFailed, priorityFailed] = await Promise.all([
        this.feedProcessingQueue.getFailed(),
        this.feedPriorityQueue.getFailed(),
      ]);

      await Promise.all([
        ...processingFailed.map((job) => job.remove()),
        ...priorityFailed.map((job) => job.remove()),
      ]);

      const totalCleared = processingFailed.length + priorityFailed.length;

      this.logger.log(`Cleared ${totalCleared} failed jobs`);

      return {
        cleared: totalCleared,
        processing: processingFailed.length,
        priority: priorityFailed.length,
      };
    } catch (error) {
      this.logger.error(
        `Failed to clear failed jobs: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
