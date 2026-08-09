/**
 * 人生电影音频方案 — 按幻灯片持久化 BGM（musicId / volume / fade）
 * BGM 曲目由记忆卡情动模型经 affect-music 映射生成（见 h5-story-slides attachMusic）
 */

import type { H5Slide } from '@/lib/h5-story-slides';
import { getMusicFromSlide } from '@/lib/theme-music';
import { getSlideNarrationText, estimateNarrationMs } from '@/lib/slide-narration';
import type { NarrationManifest } from '@/lib/narration-tts';

export interface MovieAudioSegment {
  slideId: string;
  slideType: H5Slide['type'];
  /** 音乐库 track id */
  musicId: string;
  /** BGM 文件路径（public 相对路径，如 /audio/music/warm/01.mp3） */
  musicFile: string;
  /** 正常 BGM 音量 0–1 */
  volume: number;
  /** 有旁白时的 duck 音量 */
  duckVolume: number;
  fadeInMs: number;
  fadeOutMs: number;
  durationMs: number;
  startMs: number;
  hasNarration: boolean;
  narrationFile?: string;
  /** 情动构型（用于调试/展示） */
  affectArchetype?: string;
}

export interface MovieAudioPlan {
  movieId: string;
  version: 1;
  totalDurationMs: number;
  segments: MovieAudioSegment[];
  createdAt: string;
}

const DEFAULT_FADE_IN_MS = 800;
const DEFAULT_FADE_OUT_MS = 1200;
const MOVIE_AUTOPLAY_MS = 8000;
const MIN_SLIDE_DURATION_MS = 3500;
/** 单张幻灯片最长时长，避免 ffprobe 异常或超长旁白拖垮 FFmpeg */
const MAX_SLIDE_DURATION_MS = 45_000;
const DUCK_RATIO = 0.35;

function clampSlideDurationMs(ms: number): number {
  return Math.min(MAX_SLIDE_DURATION_MS, Math.max(MIN_SLIDE_DURATION_MS, ms));
}

export function computeSlideDurationMs(
  slide: H5Slide,
  narration?: { durationMs: number }
): number {
  const text = getSlideNarrationText(slide);
  if (narration?.durationMs && narration.durationMs > 0) {
    return clampSlideDurationMs(narration.durationMs);
  }
  if (text) {
    return clampSlideDurationMs(estimateNarrationMs(text));
  }
  return MOVIE_AUTOPLAY_MS;
}

/** 根据幻灯片 + 旁白 manifest 构建完整音频方案（情动 → BGM 已在 slide.musicTrackId） */
export function buildMovieAudioPlan(
  movieId: string,
  slides: H5Slide[],
  narration: NarrationManifest = {}
): MovieAudioPlan {
  const segments: MovieAudioSegment[] = [];
  let cursor = 0;

  for (const slide of slides) {
    const track = getMusicFromSlide(slide);
    const narr = narration[slide.id];
    const text = getSlideNarrationText(slide);
    const hasNarration = Boolean(narr || text);
    const durationMs = computeSlideDurationMs(slide, narr);
    const volume = track.volume;

    segments.push({
      slideId: slide.id,
      slideType: slide.type,
      musicId: track.id,
      musicFile: track.file,
      volume,
      duckVolume: Math.round(volume * DUCK_RATIO * 1000) / 1000,
      fadeInMs: DEFAULT_FADE_IN_MS,
      fadeOutMs: DEFAULT_FADE_OUT_MS,
      durationMs,
      startMs: cursor,
      hasNarration,
      affectArchetype: slide.affect?.archetype,
    });

    cursor += durationMs;
  }

  return {
    movieId,
    version: 1,
    totalDurationMs: cursor,
    segments,
    createdAt: new Date().toISOString(),
  };
}

export function parseMovieAudioPlan(raw: string | null | undefined): MovieAudioPlan | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as MovieAudioPlan;
    if (parsed?.version === 1 && Array.isArray(parsed.segments)) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}
