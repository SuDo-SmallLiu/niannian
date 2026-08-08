import path from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { prepareImageForVision } from '@/lib/prepare-image-for-ai';

const AI_CACHE_DIR = path.join(process.cwd(), '.cache', 'ai-images');

function cachePathFor(filePath: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  return path.join(AI_CACHE_DIR, `${base}.ai.jpg`);
}

/** Sharp 预处理：压缩、旋转、转 JPEG，并缓存 AI 解析图 */
export async function preprocessImageForAnalysis(
  sourcePath: string
): Promise<{ base64: string; mimeType: string; cachePath?: string }> {
  mkdirSync(AI_CACHE_DIR, { recursive: true });
  const cached = cachePathFor(sourcePath);

  if (existsSync(cached)) {
    const buf = readFileSync(cached);
    return { base64: buf.toString('base64'), mimeType: 'image/jpeg', cachePath: cached };
  }

  const { base64, mimeType } = await prepareImageForVision(sourcePath);
  if (mimeType === 'image/jpeg') {
    writeFileSync(cached, Buffer.from(base64, 'base64'));
    return { base64, mimeType, cachePath: cached };
  }

  return { base64, mimeType };
}

export function resolvePhotoFilePath(publicUrl: string): string {
  return path.join(process.cwd(), 'public', publicUrl);
}
