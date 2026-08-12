export type JobStatus = 'queued' | 'running' | 'done' | 'error' | 'cancelled';

export type JobType =
  | 'story_generate'
  | 'story_regenerate'
  | 'story_compose'
  | 'photo_analysis'
  | 'photo_analyze_single'
  | 'movie_generate'
  | 'movie_render'
  | 'movie_audio_plan'
  | 'movie_tts'
  | 'speech_synthesize';

export interface JobRecord {
  id: string;
  type: JobType;
  status: JobStatus;
  familyId: string | null;
  resourceId: string | null;
  userId: string | null;
  payload: Record<string, unknown>;
  progress: Record<string, unknown>;
  result: Record<string, unknown> | null;
  errorCode: string | null;
  errorMessage: string | null;
  idempotencyKey: string | null;
  retryCount: number;
  maxRetries: number;
  heartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CreateJobInput {
  type: JobType;
  familyId?: string;
  resourceId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
  idempotencyKey?: string;
  maxRetries?: number;
}

export interface JobProgressPatch {
  message?: string;
  percent?: number;
  [key: string]: unknown;
}
