import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss = require('pg-boss');
import {
  QueueAdapter,
  QueueJobData,
  EmailQueueJobData,
} from '../interfaces/queue-adapter.interface';

@Injectable()
export class PgBossAdapter implements QueueAdapter {
  private readonly logger = new Logger(PgBossAdapter.name);
  private boss: PgBoss;

  constructor(private readonly configService: ConfigService) {
    const connectionString = this.configService.get<string>('DATABASE_URL');

    this.boss = new PgBoss({
      connectionString,
      schema: 'pgboss',
      retryLimit: 3,
      retryDelay: 30,
      retryBackoff: true,
      deleteAfterDays: 7,
    });

    this.boss.on('error', (error) => {
      this.logger.error('PgBoss error:', error);
    });
  }

  async start(): Promise<void> {
    try {
      await this.boss.start();
      this.logger.log('PgBoss started successfully');
    } catch (error) {
      this.logger.error('Failed to start PgBoss:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.boss.stop();
      this.logger.log('PgBoss stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop PgBoss:', error);
      throw error;
    }
  }

  async addJob(
    queueName: string,
    jobData: QueueJobData | EmailQueueJobData,
  ): Promise<string> {
    try {
      const jobId = await this.boss.send(queueName, jobData);
      this.logger.log(`Job ${jobId} added to queue ${queueName}`);
      return jobId;
    } catch (error) {
      this.logger.error(
        `Failed to add job to queue ${queueName}:`,
        error.message,
      );
      throw error;
    }
  }

  async registerWorker<T>(
    queueName: string,
    handler: (jobData: T) => Promise<any>,
  ): Promise<void> {
    try {
      await this.boss.work(queueName, async (jobs) => {
        // pg-boss passes an array of jobs, we'll process them one by one
        for (const job of jobs) {
          this.logger.log(`Processing job ${job.id} from queue ${queueName}`);

          try {
            await handler(job.data as T);
            this.logger.log(`Job ${job.id} completed successfully`);
          } catch (error) {
            this.logger.error(`Job ${job.id} failed:`, error.message);
            throw error;
          }
        }
      });

      this.logger.log(`Worker registered for queue ${queueName}`);
    } catch (error) {
      this.logger.error(
        `Failed to register worker for queue ${queueName}:`,
        error.message,
      );
      throw error;
    }
  }

  async createQueue(queueName: string): Promise<void> {
    try {
      await this.boss.createQueue(queueName);
      this.logger.log(`Queue ${queueName} created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create queue ${queueName}:`, error.message);
      throw error;
    }
  }
}
