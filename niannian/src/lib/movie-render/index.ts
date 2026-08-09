import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import type { H5Slide } from '@/lib/h5-story-slides';
import type { MovieAudioPlan, MovieAudioSegment } from '@/lib/movie-audio-plan';
import {
  buildMovieAudioPlan,
  computeSlideDurationMs,
} from '@/lib/movie-audio-plan';
import { buildMovieSlidesForServer } from '@/lib/movie-slides-server';
import {
  enrichManifestWithDurations,
  getMovieNarrationFilePath,
  loadMovieNarrationManifest,
} from '@/lib/narration-tts';
import { resolvePhotoFilePath } from '@/services/image-preprocess.service';
import { getMusicFromSlide } from '@/lib/theme-music';
import {
  getLifeMovie,
  saveMovieAudioPlan,
  updateMovieRenderStatus,
  updateMovieRenderProgress,
} from '@/lib/db';
import { generateMovieNarrations } from '@/lib/narration-tts';
import { createRenderProgress } from '@/lib/movie-render-progress';
import { sanitizeRenderError } from '@/lib/movie-render-error';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();
const VIDEO_ROOT = path.join(PROJECT_ROOT, 'public', 'video', 'movies');
const RENDER_TMP = path.join(PROJECT_ROOT, '.cache', 'movie-render');

const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const FPS = 24;
const MAX_SEGMENT_SEC = 45;
const MIN_SEGMENT_SEC = 3.5;

export type MovieRenderStatus = 'none' | 'queued' | 'rendering' | 'ready' | 'failed';

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function getMovieVideoFilePath(movieId: string): string {
  return path.join(VIDEO_ROOT, `${movieId}.mp4`);
}

export function getMovieVideoPublicUrl(movieId: string): string {
  return `/video/movies/${movieId}.mp4`;
}

function resolveMusicFilePath(publicPath: string): string {
  const normalized = publicPath.startsWith('/') ? publicPath.slice(1) : publicPath;
  return path.join(PROJECT_ROOT, 'public', normalized);
}

function getSlideImagePath(slide: H5Slide): string | null {
  const url = slide.photoUrl || slide.coverUrl;
  if (!url) return null;
  const filePath = resolvePhotoFilePath(url);
  return fs.existsSync(filePath) ? filePath : null;
}

async function runFfmpeg(args: string[], timeoutMs = 120_000): Promise<void> {
  try {
    await execFileAsync('ffmpeg', args, {
      timeout: timeoutMs,
      maxBuffer: 2 * 1024 * 1024,
    });
  } catch (err: unknown) {
    const execErr = err as { stderr?: string; message?: string; killed?: boolean };
    const detail = (execErr.stderr || execErr.message || 'ffmpeg failed').trim();
    if (execErr.killed || /SIGTERM|timed out/i.test(detail)) {
      throw new Error('FFmpeg 渲染超时');
    }
    throw new Error(detail.slice(-400));
  }
}

function clampSegmentSec(durationMs: number): number {
  const sec = durationMs / 1000;
  return Math.min(MAX_SEGMENT_SEC, Math.max(MIN_SEGMENT_SEC, sec));
}

/** 单张幻灯片 → 带 Ken Burns + BGM + 旁白 amix 的 MP4 片段 */
async function renderSlideSegment(
  slide: H5Slide,
  segment: MovieAudioSegment,
  movieId: string,
  outputPath: string
): Promise<void> {
  ensureDir(path.dirname(outputPath));

  const durationSec = clampSegmentSec(segment.durationMs);
  const fadeInSec = segment.fadeInMs / 1000;
  const fadeOutSec = segment.fadeOutMs / 1000;
  const fadeOutStart = Math.max(0, durationSec - fadeOutSec);
  const frameCount = Math.max(1, Math.round(durationSec * FPS));
  const bgmVol = segment.hasNarration ? segment.duckVolume : segment.volume;

  const imagePath = getSlideImagePath(slide);
  const bgmPath = resolveMusicFilePath(segment.musicFile);
  if (!fs.existsSync(bgmPath)) {
    throw new Error(`BGM 文件不存在: ${segment.musicFile}`);
  }

  const narrationPath = getMovieNarrationFilePath(movieId, slide.id);
  const hasNarFile = segment.hasNarration && fs.existsSync(narrationPath);

  const filterParts: string[] = [];

  if (imagePath) {
    // 静态缩放（不用 zoompan，1080p 下快 10–50 倍且时长可控）
    filterParts.push(
      `[0:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT}:force_original_aspect_ratio=increase,crop=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${FPS}[vout]`
    );
  } else {
    filterParts.push(
      `[0:v]scale=${OUTPUT_WIDTH}:${OUTPUT_HEIGHT},fps=${FPS}[vout]`
    );
  }

  filterParts.push(
    `[1:a]atrim=0:${durationSec},asetpts=PTS-STARTPTS,volume=${bgmVol},` +
      `afade=t=in:st=0:d=${fadeInSec},afade=t=out:st=${fadeOutStart}:d=${fadeOutSec}[bgm]`
  );

  let audioMap = '[bgm]';
  if (hasNarFile) {
    filterParts.push(
      `[2:a]aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo,apad,atrim=0:${durationSec},asetpts=PTS-STARTPTS,volume=1.8[nar]`,
      `[bgm][nar]amix=inputs=2:duration=first:dropout_transition=2[aout]`
    );
    audioMap = '[aout]';
  } else {
    filterParts.push('[bgm]anull[aout]');
    audioMap = '[aout]';
  }

  const args = ['-y'];

  if (imagePath) {
    args.push('-loop', '1', '-t', String(durationSec), '-i', imagePath);
  } else {
    args.push(
      '-f',
      'lavfi',
      '-t',
      String(durationSec),
      '-i',
      `color=c=0x1a1208:s=${OUTPUT_WIDTH}x${OUTPUT_HEIGHT}:r=${FPS}`
    );
  }

  args.push('-stream_loop', '-1', '-t', String(durationSec), '-i', bgmPath);

  if (hasNarFile) {
    args.push('-i', narrationPath);
  }

  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '[vout]',
    '-map',
    audioMap,
    '-frames:v',
    String(frameCount),
    '-t',
    String(durationSec),
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '26',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath
  );

  const segmentTimeoutMs = Math.min(180_000, Math.max(45_000, Math.round(durationSec * 4000 + 20_000)));
  await runFfmpeg(args, segmentTimeoutMs);
}

async function concatSegments(segmentPaths: string[], outputPath: string): Promise<void> {
  ensureDir(path.dirname(outputPath));
  const listPath = path.join(RENDER_TMP, `concat-${Date.now()}.txt`);
  const listContent = segmentPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  try {
    await runFfmpeg(
      ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-movflags', '+faststart', outputPath],
      120_000
    );
  } finally {
    try {
      fs.unlinkSync(listPath);
    } catch {
      /* ignore */
    }
  }
}

export interface MovieRenderResult {
  movieId: string;
  mediaUrl: string;
  totalDurationMs: number;
  segmentCount: number;
}

/** 完整渲染：旁白就绪 → 音频方案（每段 BGM）→ FFmpeg 分段 amix → 拼接 MP4 */
export async function renderMovieToMp4(movieId: string): Promise<MovieRenderResult> {
  const movie = getLifeMovie(movieId);
  if (!movie) throw new Error('人生电影不存在');

  const built = await buildMovieSlidesForServer(movieId);
  if (!built?.slides.length) throw new Error('无法组装幻灯片');

  const slideTotal = built.slides.length;

  updateMovieRenderStatus(movieId, 'rendering', {
    progress: createRenderProgress({
      phase: 'narration',
      segmentDone: 0,
      segmentTotal: slideTotal,
      message: '正在生成旁白音频…',
    }),
  });

  // ① 旁白全部就绪后再混音（避免与 prefetch 竞态）
  const narrResult = await generateMovieNarrations(movieId, built.slides);
  if (narrResult.failed > 0) {
    console.warn('[movie-render] narration partial failure:', movieId, narrResult.errors);
  }

  let narration = loadMovieNarrationManifest(movieId, built.slides);
  narration = await enrichManifestWithDurations(movieId, narration);

  const audioPlan = buildMovieAudioPlan(movieId, built.slides, narration);

  // ② 按幻灯片写入 BGM / 旁白文件路径（每段 MP4 独立配置）
  for (const seg of audioPlan.segments) {
    const slide = built.slides.find((s) => s.id === seg.slideId);
    if (!slide) continue;

    const narrPath = getMovieNarrationFilePath(movieId, slide.id);
    const hasNarFile = fs.existsSync(narrPath);
    seg.hasNarration = hasNarFile;
    if (hasNarFile) seg.narrationFile = narrPath;

    seg.durationMs = computeSlideDurationMs(slide, narration[slide.id]);

    // 每段 BGM 以情动模型选曲结果为准（slide.musicTrackId → musicId / musicFile）
    const track = getMusicFromSlide(slide);
    seg.musicId = track.id;
    seg.musicFile = track.file;
    seg.volume = track.volume;
    seg.duckVolume = Math.round(track.volume * 0.35 * 1000) / 1000;
    seg.affectArchetype = slide.affect?.archetype;
  }

  let cursor = 0;
  for (const seg of audioPlan.segments) {
    seg.startMs = cursor;
    cursor += seg.durationMs;
  }
  audioPlan.totalDurationMs = cursor;

  saveMovieAudioPlan(movieId, audioPlan);

  updateMovieRenderProgress(
    movieId,
    createRenderProgress({
      phase: 'segments',
      segmentDone: 0,
      segmentTotal: slideTotal,
      message: `开始渲染 ${slideTotal} 个片段（每段含配乐与旁白混音）…`,
    })
  );

  ensureDir(RENDER_TMP);
  ensureDir(VIDEO_ROOT);

  const tmpDir = path.join(RENDER_TMP, movieId);
  ensureDir(tmpDir);

  const segmentPaths: string[] = [];

  try {
    for (let i = 0; i < built.slides.length; i++) {
      const slide = built.slides[i]!;
      const segment = audioPlan.segments[i];
      if (!segment) continue;

      updateMovieRenderProgress(
        movieId,
        createRenderProgress({
          phase: 'segments',
          segmentDone: i,
          segmentTotal: slideTotal,
          message: `视频渲染 ${i + 1}/${slideTotal} · 配乐：${segment.musicId}${segment.affectArchetype ? `（${segment.affectArchetype}）` : ''}`,
          currentMusicId: segment.musicId,
          currentAffect: segment.affectArchetype,
        })
      );

      const segPath = path.join(tmpDir, `seg-${String(i).padStart(3, '0')}.mp4`);
      await renderSlideSegment(slide, segment, movieId, segPath);
      segmentPaths.push(segPath);
    }

    if (segmentPaths.length === 0) {
      throw new Error('没有可渲染的幻灯片片段');
    }

    updateMovieRenderProgress(
      movieId,
      createRenderProgress({
        phase: 'concat',
        segmentDone: slideTotal,
        segmentTotal: slideTotal,
        percent: 95,
        message: '正在拼接完整视频…',
      })
    );

    const outputPath = getMovieVideoFilePath(movieId);
    await concatSegments(segmentPaths, outputPath);

    const mediaUrl = getMovieVideoPublicUrl(movieId);
    const doneProgress = createRenderProgress({
      phase: 'done',
      segmentDone: slideTotal,
      segmentTotal: slideTotal,
      percent: 100,
      message: '渲染完成，可播放完整音视频',
    });

    updateMovieRenderStatus(movieId, 'ready', { mediaUrl, progress: doneProgress });

    return {
      movieId,
      mediaUrl,
      totalDurationMs: audioPlan.totalDurationMs,
      segmentCount: segmentPaths.length,
    };
  } catch (err) {
    const message = sanitizeRenderError(err instanceof Error ? err.message : '渲染失败');
    updateMovieRenderStatus(movieId, 'failed', {
      error: message,
      progress: createRenderProgress({
        phase: 'failed',
        segmentDone: segmentPaths.length,
        segmentTotal: slideTotal,
        message,
      }),
    });
    throw err;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export async function prepareMovieAudioPlan(movieId: string): Promise<MovieAudioPlan | null> {
  const built = await buildMovieSlidesForServer(movieId);
  if (!built?.slides.length) return null;

  let narration = loadMovieNarrationManifest(movieId, built.slides);
  narration = await enrichManifestWithDurations(movieId, narration);
  const plan = buildMovieAudioPlan(movieId, built.slides, narration);
  saveMovieAudioPlan(movieId, plan);
  return plan;
}
