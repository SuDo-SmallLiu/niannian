import { getDb } from '@/lib/db';
import { aggregateCompletion, computeMemoryCardCompletion, getMemoryCardStatus } from '@/lib/memory-card-completion';
import type { PipelineStats } from '@/lib/agent-types';
import { getCurrentStepIndex } from '@/lib/agent-steps';

export type { PipelineStats };

export interface ExtendedPipelineStats extends PipelineStats {
  needsSupplementCount: number;
  /** 统计范围：某家庭 ID；缺省为全库（兼容旧逻辑） */
  familyId?: string;
}

function buildPipelineStats(
  photoCount: number,
  pendingCount: number,
  analyzedRows: Array<{
    analysis_status: string;
    significance: string | null;
    user_notes: string | null;
    voice_transcript: string | null;
    ai_questions: string | null;
  }>,
  storyCount: number,
  movieCount: number,
  familyId?: string
): ExtendedPipelineStats {
  const analyzedCount = analyzedRows.length;
  const needsSupplementCount = analyzedRows.filter(
    (r) => getMemoryCardStatus(r) === 'needs_supplement'
  ).length;
  const completionAvg =
    analyzedCount > 0 ? aggregateCompletion(analyzedRows) : 0;

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
    needsSupplementCount,
    familyId,
  };
}

/** 按家庭统计 Agent 进度（避免其他家庭的待解析/已有作品干扰当前步骤） */
export function getAgentPipelineStats(familyId?: string): ExtendedPipelineStats {
  const database = getDb();

  if (familyId) {
    const photoCount =
      (
        database
          .prepare('SELECT COUNT(*) as c FROM photos WHERE family_id = ?')
          .get(familyId) as { c: number }
      ).c || 0;

    const pendingCount =
      (
        database
          .prepare(
            `SELECT COUNT(*) as c FROM photos p
             LEFT JOIN memory_cards mc ON mc.photo_id = p.id
             WHERE p.family_id = ?
               AND (mc.id IS NULL OR mc.analysis_status != 'analyzed')`
          )
          .get(familyId) as { c: number }
      ).c || 0;

    const memoryRows = database
      .prepare(
        `SELECT mc.analysis_status, mc.significance, mc.user_notes, mc.voice_transcript, mc.ai_questions
         FROM memory_cards mc
         WHERE mc.family_id = ?`
      )
      .all(familyId) as Array<{
      analysis_status: string;
      significance: string | null;
      user_notes: string | null;
      voice_transcript: string | null;
      ai_questions: string | null;
    }>;

    const analyzedRows = memoryRows.filter((r) => r.analysis_status === 'analyzed');

    const storyCount =
      (
        database
          .prepare('SELECT COUNT(*) as c FROM stories WHERE family_id = ?')
          .get(familyId) as { c: number }
      ).c || 0;

    const movieCount =
      (
        database
          .prepare('SELECT COUNT(*) as c FROM life_movies WHERE family_id = ?')
          .get(familyId) as { c: number }
      ).c || 0;

    return buildPipelineStats(
      photoCount,
      pendingCount,
      analyzedRows,
      storyCount,
      movieCount,
      familyId
    );
  }

  const photoCount =
    (database.prepare('SELECT COUNT(*) as c FROM photos').get() as { c: number }).c || 0;

  const pendingCount =
    (
      database
        .prepare(
          `SELECT COUNT(*) as c FROM photos p
           LEFT JOIN memory_cards mc ON mc.photo_id = p.id
           WHERE mc.id IS NULL OR mc.analysis_status != 'analyzed'`
        )
        .get() as { c: number }
    ).c || 0;

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

  const analyzedRows = memoryRows.filter((r) => r.analysis_status === 'analyzed');

  const storyCount =
    (database.prepare('SELECT COUNT(*) as c FROM stories').get() as { c: number }).c || 0;

  const movieCount =
    (database.prepare('SELECT COUNT(*) as c FROM life_movies').get() as { c: number }).c || 0;

  return buildPipelineStats(
    photoCount,
    pendingCount,
    analyzedRows,
    storyCount,
    movieCount
  );
}

/** 取用户当前应聚焦的家庭：优先步骤最靠前（最需要引导）且有照片的家庭 */
export function resolveFocusFamilyId(userId: string): string | undefined {
  const database = getDb();
  const families = database
    .prepare(
      `SELECT f.id
       FROM families f
       JOIN family_users fu ON fu.family_id = f.id
       LEFT JOIN photos p ON p.family_id = f.id
       WHERE fu.user_id = ?
       GROUP BY f.id
       HAVING COUNT(p.id) > 0
       ORDER BY MAX(p.created_at) DESC, f.created_at DESC`
    )
    .all(userId) as Array<{ id: string }>;

  if (families.length === 0) return undefined;

  let focusId = families[0]!.id;
  let focusStep = 5;

  for (const family of families) {
    const stats = getAgentPipelineStats(family.id);
    const step = getCurrentStepIndex(stats);
    if (step < focusStep) {
      focusStep = step;
      focusId = family.id;
    }
  }

  return focusId;
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
