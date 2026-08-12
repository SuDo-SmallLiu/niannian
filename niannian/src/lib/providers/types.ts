export interface AiVisionInput {
  imageUrl: string;
  prompt: string;
}

export interface AiTextInput {
  prompt: string;
  system?: string;
}

export interface AiProvider {
  analyzeVision(input: AiVisionInput): Promise<string>;
  generateText(input: AiTextInput): Promise<string>;
}

export interface TtsSynthesizeInput {
  text: string;
  voice?: string;
  outputPath?: string;
}

export interface TtsResult {
  url: string;
  durationMs: number;
  cached: boolean;
}

export interface TtsProvider {
  synthesize(input: TtsSynthesizeInput): Promise<TtsResult>;
}

export interface SttTranscribeInput {
  audioBlob: Blob;
  mimeType?: string;
}

export interface SttProvider {
  transcribe(input: SttTranscribeInput): Promise<string>;
}

export interface MediaRenderInput {
  movieId: string;
  plan: unknown;
}

export interface MediaRenderResult {
  mediaUrl: string;
  durationMs?: number;
}

export interface MediaRenderer {
  renderMovie(input: MediaRenderInput): Promise<MediaRenderResult>;
}

export interface ObjectStoragePutInput {
  key: string;
  data: Buffer | Uint8Array;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface ObjectStorage {
  put(input: ObjectStoragePutInput): Promise<string>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}

export interface JobQueueEnqueueInput {
  type: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  familyId?: string;
  resourceId?: string;
}

export interface JobQueue {
  enqueue(input: JobQueueEnqueueInput): Promise<{ jobId: string }>;
}
