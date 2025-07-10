export interface FeedProcessingJobData {
  feedId: string;
  feedUrl: string;
  priority: number;
  userCount: number;
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

export interface JobData<T> {
  id: string;
  data: T;
}
