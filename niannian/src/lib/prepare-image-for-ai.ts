import { readFileSync } from 'fs';
import path from 'path';

const MAX_DIMENSION = 2048;
const MAX_BYTES = 4 * 1024 * 1024;

function mimeFromExt(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

/** 压缩大图后再送视觉模型，避免超出 API 限制 */
export async function prepareImageForVision(
  filePath: string
): Promise<{ base64: string; mimeType: string }> {
  const raw = readFileSync(filePath);

  try {
    const sharp = (await import('sharp')).default;
    let pipeline = sharp(raw).rotate();
    const meta = await pipeline.metadata();

    if ((meta.width || 0) > MAX_DIMENSION || (meta.height || 0) > MAX_DIMENSION) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    let buffer = await pipeline.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
    if (buffer.length > MAX_BYTES) {
      buffer = await sharp(buffer).jpeg({ quality: 70 }).toBuffer();
    }

    return { base64: buffer.toString('base64'), mimeType: 'image/jpeg' };
  } catch {
    if (raw.length > MAX_BYTES) {
      throw new Error('照片过大且无法压缩，请上传小于 10MB 的图片');
    }
    return { base64: raw.toString('base64'), mimeType: mimeFromExt(filePath) };
  }
}
