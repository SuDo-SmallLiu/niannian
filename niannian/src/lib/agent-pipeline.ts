import { getDb } from '@/lib/db';
import { aggregateCompletion, computeMemoryCardCompletion } from '@/lib/memory-card-completion';
import type { PipelineStats } from '@/lib/agent-types';

export type { PipelineStats };

export function getAgentPipelineStats(): PipelineStats {
  const database = getDb();

  const photoCount =
    (database.prepare('SELECT COUNT(*) as c FROM photos').get() as { c: number }).c || 0;

  const memoryRows = database
    .prepare(
      `SELECT mc.analysis_status, mc.significance, mc.user_notes, mc.voice_transcript, mc.ai_questions
       FROM memory_cards mc`
    )
    .all() as Array<{
    analysis_status: string;
    significance: string | null;
    user_notes: string | null;
    voice_transcript: string | null;
    ai_questions: string | null;
  }>;

  const analyzedCount = memoryRows.filter((r) => r.analysis_status === 'analyzed').length;
  const pendingCount = Math.max(0, photoCount - analyzedCount);
  const completionAvg =
    analyzedCount > 0
      ? aggregateCompletion(
          memoryRows
            .filter((r) => r.analysis_status === 'analyzed')
            .map((r) => ({
              analysis_status: r.analysis_status,
              significance: r.significance,
              user_notes: r.user_notes,
              voice_transcript: r.voice_transcript,
              ai_questions: r.ai_questions,
            }))
        )
      : 0;

  const storyCount =
    (database.prepare('SELECT COUNT(*) as c FROM stories').get() as { c: number }).c || 0;

  const movieCount =
    (database.prepare('SELECT COUNT(*) as c FROM life_movies').get() as { c: number }).c || 0;

  let pipelineStage: 0 | 1 | 2 | 3 = 0;
  if (photoCount > 0) pipelineStage = 1;
  if (analyzedCount > 0 && completionAvg >= 40) pipelineStage = 1;
  if (storyCount > 0) pipelineStage = 2;
  if (movieCount > 0) pipelineStage = 3;

  let pipelineProgress = 0;
  if (photoCount > 0) pipelineProgress += 20;
  if (analyzedCount > 0) pipelineProgress += Math.round(completionAvg * 0.3);
  if (storyCount > 0) pipelineProgress += 25;
  if (movieCount > 0) pipelineProgress += 25;
  pipelineProgress = Math.min(100, pipelineProgress);

  return {
    photoCount,
    pendingCount,
    analyzedCount,
    completionAvg,
    storyCount,
    movieCount,
    pipelineStage,
    pipelineProgress,
  };
}


export function getPhotoCompletion(photoId: string): number {
  const database = getDb();
  const row = database
    .prepare(
      `SELECT analysis_status, significance, user_notes, voice_transcript, ai_questions
       FROM memory_cards WHERE photo_id = ?`
    )
    .get(photoId) as {
    analysis_status: string;
    significance: string | null;
    user_notes: string | null;
    voice_transcript: string | null;
    ai_questions: string | null;
  } | null;

  return computeMemoryCardCompletion(row);
}
