export interface QueueJobData {
  feedId: string;
  feedUrl: string;
  jobType: string;
}

export interface EmailQueueJobData {
  template: string;
  variables: Record<string, any>;
  to: string;
  toName?: string;
}

export interface QueueAdapter {
  /**
   * Initializes the queue adapter
   */
  start(): Promise<void>;

  /**
   * Stops the queue adapter gracefully
   */
  stop(): Promise<void>;

  /**
   * Adds a job to the queue
   */
  /**
   * Adds a job to the queue
   */
  addJob(
    queueName: string,
    jobData: QueueJobData | EmailQueueJobData,
  ): Promise<string>;

  /**
   * Registers a worker for a specific queue
   */
  registerWorker<T>(
    queueName: string,
    handler: (jobData: T) => Promise<any>,
  ): Promise<void>;

  /**
   * Creates a queue if it doesn't exist
   */
  createQueue(queueName: string): Promise<void>;
}
