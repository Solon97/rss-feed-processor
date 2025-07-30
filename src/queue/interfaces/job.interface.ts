export interface FeedProcessingJobData {
  feedId: string;
  feedUrl: string;
}

export interface EmailJobData {
  template: string;
  variables: Record<string, any>;
  to: string;
  toName?: string;
}

export interface EmailJobResult {
  emailId: string;
  success: boolean;
  message?: string;
}

export interface FeedItemProcessingResult {
  feedId: string;
  processedItems: number;
  newItems: number;
  errors: string[];
}

export enum JobPriority {
  HIGH = 10,
  MEDIUM = 5,
  LOW = 1,
}

export enum JobTypes {
  PROCESS_FEED = 'process-feed',
  PROCESS_NEW_FEED = 'process-new-feed',
}

export interface Message<T> {
  id: string;
  data: T;
}

export interface Job<T> {
  jobType?: JobTypes;
  jobData: T;
  jobId: string;
}
