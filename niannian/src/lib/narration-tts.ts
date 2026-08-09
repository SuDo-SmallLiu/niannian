import { createHash } from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getSlideNarrationText } from '@/lib/slide-narration';
import type { H5Slide } from '@/lib/h5-story-slides';

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();
const NARRATION_ROOT = path.join(PROJECT_ROOT, 'public', 'audio', 'narration');
const MELO_SCRIPT = path.join(PROJECT_ROOT, 'services', 'narration', 'melo-tts-service.py');
const MELO_BATCH_SCRIPT = path.join(PROJECT_ROOT, 'services', 'narration', 'melo-tts-batch.py');
const MELO_PYTHON = process.env.MELO_PYTHON || 'python3';
const NUMBA_CACHE_DIR =
  process.env.NUMBA_CACHE_DIR || path.join(PROJECT_ROOT, '.cache', 'numba');
const MELO_TIMEOUT_MS = 300_000;

export interface NarrationResult {
  url: string;
  durationMs: number;
  cached: boolean;
  engine: 'melotts' | 'cache';
}

export interface NarrationManifest {
  [slideId: string]: { url: string; durationMs: number };
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function getMovieNarrationDir(movieId: string): string {
  return path.join(NARRATION_ROOT, 'movies', movieId);
}

export function getMovieNarrationFilePath(movieId: string, slideId: string): string {
  const safeId = slideId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getMovieNarrationDir(movieId), `${safeId}.wav`);
}

export function getMovieNarrationPublicUrl(movieId: string, slideId: string): string {
  const safeId = slideId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `/audio/narration/movies/${movieId}/${safeId}.wav`;
}

export function getCacheNarrationFilePath(text: string): string {
  return path.join(NARRATION_ROOT, 'cache', `${hashText(text)}.wav`);
}

export function getCacheNarrationPublicUrl(text: string): string {
  return `/audio/narration/cache/${hashText(text)}.wav`;
}

async function probeDurationMs(filePath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ]);
    const seconds = parseFloat(stdout.trim());
    if (Number.isFinite(seconds) && seconds > 0) {
      // 异常 WAV 元数据可能返回极大值，拖垮 FFmpeg
      const capped = Math.min(seconds, 120);
      return Math.round(capped * 1000);
    }
  } catch {
    /* fallback below */
  }
  return 0;
}

async function runMeloTts(text: string, outputPath: string): Promise<void> {
  ensureDir(path.dirname(outputPath));
  ensureDir(NUMBA_CACHE_DIR);
  const meloEnv = {
    ...process.env,
    HF_ENDPOINT: process.env.HF_ENDPOINT || 'https://hf-mirror.com',
    NUMBA_CACHE_DIR,
    NUMBA_DISABLE_JIT: process.env.NUMBA_DISABLE_JIT || '0',
    PYTHONWARNINGS: 'ignore',
  };

  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await execFileAsync(MELO_PYTHON, [MELO_SCRIPT, text, outputPath, '-l', 'ZH'], {
        timeout: MELO_TIMEOUT_MS,
        maxBuffer: 8 * 1024 * 1024,
        env: meloEnv,
      });
      if (fs.existsSync(outputPath)) return;
      lastErr = new Error('MeloTTS 未生成音频文件');
    } catch (err: unknown) {
      const execErr = err as { stderr?: string; message?: string; killed?: boolean };
      const detail = `${execErr.stderr || ''} ${execErr.message || ''}`;
      if (detail.includes('MELO_NOT_INSTALLED')) {
        throw new Error('MeloTTS 未安装。请运行: bash scripts/setup-melo-tts.sh');
      }
      lastErr = new Error(detail.trim().slice(0, 400) || 'MeloTTS 生成失败');
      if (!execErr.killed || attempt >= 1) break;
    }
  }
  throw lastErr || new Error('MeloTTS 生成失败');
}

async function runMeloTtsBatch(
  tasks: Array<{ text: string; output: string }>
): Promise<void> {
  if (!tasks.length) return;
  if (!fs.existsSync(MELO_BATCH_SCRIPT)) {
    for (const task of tasks) {
      await runMeloTts(task.text, task.output);
    }
    return;
  }

  ensureDir(NUMBA_CACHE_DIR);
  const tmpDir = path.join(PROJECT_ROOT, '.cache', 'melo-batch');
  ensureDir(tmpDir);
  const tasksFile = path.join(tmpDir, `tasks-${Date.now()}.json`);
  fs.writeFileSync(tasksFile, JSON.stringify(tasks));

  try {
    await execFileAsync(MELO_PYTHON, [MELO_BATCH_SCRIPT, tasksFile], {
      timeout: MELO_TIMEOUT_MS * Math.max(1, tasks.length),
      maxBuffer: 8 * 1024 * 1024,
      env: {
        ...process.env,
        HF_ENDPOINT: process.env.HF_ENDPOINT || 'https://hf-mirror.com',
        NUMBA_CACHE_DIR,
        NUMBA_DISABLE_JIT: process.env.NUMBA_DISABLE_JIT || '0',
        PYTHONWARNINGS: 'ignore',
      },
    });
  } catch (err: unknown) {
    const execErr = err as { stderr?: string; message?: string };
    const detail = `${execErr.stderr || ''} ${execErr.message || ''}`;
    if (detail.includes('MELO_NOT_INSTALLED')) {
      throw new Error('MeloTTS 未安装。请运行: bash scripts/setup-melo-tts.sh');
    }
    // 批量失败时逐条重试
    for (const task of tasks) {
      if (fs.existsSync(task.output)) continue;
      await runMeloTts(task.text, task.output);
    }
  } finally {
    try {
      fs.unlinkSync(tasksFile);
    } catch {
      /* ignore */
    }
  }
}

export async function synthesizeNarration(
  text: string,
  options: { movieId?: string; slideId?: string; force?: boolean } = {}
): Promise<NarrationResult> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('旁白文本为空');

  let filePath: string;
  let publicUrl: string;

  if (options.movieId && options.slideId) {
    filePath = getMovieNarrationFilePath(options.movieId, options.slideId);
    publicUrl = getMovieNarrationPublicUrl(options.movieId, options.slideId);
  } else {
    filePath = getCacheNarrationFilePath(trimmed);
    publicUrl = getCacheNarrationPublicUrl(trimmed);
  }

  if (!options.force && fs.existsSync(filePath)) {
    const durationMs =
      (await probeDurationMs(filePath)) || Math.min(trimmed.length * 180, 45000);
    return { url: publicUrl, durationMs, cached: true, engine: 'cache' };
  }

  await runMeloTts(trimmed, filePath);
  const durationMs = (await probeDurationMs(filePath)) || Math.min(trimmed.length * 180, 45000);

  return { url: publicUrl, durationMs, cached: false, engine: 'melotts' };
}

export function loadMovieNarrationManifest(movieId: string, slides: H5Slide[]): NarrationManifest {
  const manifest: NarrationManifest = {};
  for (const slide of slides) {
    const filePath = getMovieNarrationFilePath(movieId, slide.id);
    if (!fs.existsSync(filePath)) continue;
    manifest[slide.id] = {
      url: getMovieNarrationPublicUrl(movieId, slide.id),
      durationMs: 0,
    };
  }
  return manifest;
}

export async function enrichManifestWithDurations(
  movieId: string,
  manifest: NarrationManifest
): Promise<NarrationManifest> {
  const enriched = { ...manifest };
  for (const [slideId, entry] of Object.entries(enriched)) {
    if (entry.durationMs > 0) continue;
    const filePath = getMovieNarrationFilePath(movieId, slideId);
    if (!fs.existsSync(filePath)) continue;
    entry.durationMs = await probeDurationMs(filePath);
  }
  return enriched;
}

/** 为人生电影预生成全部幻灯片旁白（MeloTTS，批量单次加载模型） */
export async function generateMovieNarrations(
  movieId: string,
  slides: H5Slide[]
): Promise<{ generated: number; skipped: number; failed: number; errors: string[] }> {
  ensureDir(getMovieNarrationDir(movieId));
  ensureDir(path.join(NARRATION_ROOT, 'cache'));

  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];
  const pending: Array<{ slide: H5Slide; text: string; output: string }> = [];

  for (const slide of slides) {
    const text = getSlideNarrationText(slide);
    if (!text) {
      skipped++;
      continue;
    }

    const filePath = getMovieNarrationFilePath(movieId, slide.id);
    if (fs.existsSync(filePath)) {
      skipped++;
      continue;
    }

    pending.push({ slide, text, output: filePath });
  }

  if (pending.length > 0) {
    try {
      await runMeloTtsBatch(
        pending.map((p) => ({ text: p.text, output: p.output }))
      );
      for (const p of pending) {
        if (fs.existsSync(p.output)) {
          generated++;
        } else {
          failed++;
          errors.push(`${p.slide.id}: 批量生成后文件缺失`);
        }
      }
    } catch (err) {
      for (const p of pending) {
        if (fs.existsSync(p.output)) {
          generated++;
          continue;
        }
        try {
          await synthesizeNarration(p.text, { movieId, slideId: p.slide.id });
          generated++;
        } catch (slideErr) {
          failed++;
          errors.push(
            `${p.slide.id}: ${slideErr instanceof Error ? slideErr.message : '生成失败'}`
          );
        }
      }
      if (failed === pending.length && err instanceof Error) {
        errors.unshift(`batch: ${err.message}`);
      }
    }
  }

  return { generated, skipped, failed, errors };
}

export function isMeloTtsAvailable(): boolean {
  return fs.existsSync(MELO_SCRIPT);
}
