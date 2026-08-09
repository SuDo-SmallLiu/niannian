/** FFmpeg 渲染进度（持久化到 life_movies.render_progress） */

export type MovieRenderPhase =
  | 'queued'
  | 'narration'
  | 'segments'
  | 'concat'
  | 'done'
  | 'failed';

export interface MovieRenderProgress {
  phase: MovieRenderPhase;
  segmentDone: number;
  segmentTotal: number;
  /** 0–100 */
  percent: number;
  message: string;
  /** 当前片段 BGM（musicId） */
  currentMusicId?: string;
  /** 当前片段情动构型 */
  currentAffect?: string;
  updatedAt: string;
}

export function createRenderProgress(
  partial: Partial<MovieRenderProgress> & Pick<MovieRenderProgress, 'phase' | 'message'>
): MovieRenderProgress {
  const segmentDone = partial.segmentDone ?? 0;
  const segmentTotal = partial.segmentTotal ?? 0;
  let percent = partial.percent ?? 0;
  if (percent === 0 && segmentTotal > 0) {
    if (partial.phase === 'segments') {
      percent = Math.round((segmentDone / segmentTotal) * 90);
    } else if (partial.phase === 'concat') {
      percent = 95;
    } else if (partial.phase === 'narration') {
      percent = Math.min(15, Math.round((segmentDone / Math.max(segmentTotal, 1)) * 15));
    } else if (partial.phase === 'done') {
      percent = 100;
    }
  }
  return {
    phase: partial.phase,
    segmentDone,
    segmentTotal,
    percent,
    message: partial.message,
    currentMusicId: partial.currentMusicId,
    currentAffect: partial.currentAffect,
    updatedAt: new Date().toISOString(),
  };
}

export function parseMovieRenderProgress(raw: string | null | undefined): MovieRenderProgress | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as MovieRenderProgress;
    if (parsed?.phase && typeof parsed.message === 'string') return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
