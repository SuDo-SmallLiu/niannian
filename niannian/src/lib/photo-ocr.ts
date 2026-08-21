import { isAiConfigured } from '@/lib/ai';
import { AiServiceError, formatAiError } from '@/lib/ai-errors';
import {
  chatWithKeyAndModelFallback,
  extractAssistantText,
  extractJsonBlob,
  getVisionModelChain,
} from '@/lib/ai-model-fallback';

export const OCR_NOTES_PREFIX = '[OCR识别]';

export interface PhotoOcrResult {
  text: string;
  hasText: boolean;
  language?: string;
  notes?: string;
}

const VISION_MODELS = getVisionModelChain();

const OCR_PROMPT = `你是老照片文字识别专家。请识别图片中的全部可见文字，包括：
- 照片背面手写日期、地点、姓名
- 泛黄老照片上的印刷或手写说明
- 证件、奖状、信件、报纸剪贴上的文字
- 褪色、模糊但仍可辨认的文字

要求：
1. 按阅读顺序输出，保留换行
2. 不确定的字用「?」标注
3. 若无任何文字，hasText 为 false
4. 只返回 JSON，不要 markdown

格式：
{"hasText":true,"text":"识别出的全文","language":"zh","notes":"可选：对字迹状态的简短说明"}`;

export function extractOcrFromNotes(notes: string): string | null {
  if (!notes.includes(OCR_NOTES_PREFIX)) return null;
  const idx = notes.indexOf(OCR_NOTES_PREFIX);
  const after = notes.slice(idx + OCR_NOTES_PREFIX.length).replace(/^\s*\n?/, '');
  const nextSection = after.search(/\n\s*\[(?!OCR)/);
  const block = nextSection >= 0 ? after.slice(0, nextSection) : after;
  const trimmed = block.trim();
  return trimmed || null;
}

export function mergeOcrIntoUserNotes(existingNotes: string, ocrText: string): string {
  const trimmed = ocrText.trim();
  if (!trimmed) return existingNotes;

  const ocrBlock = `${OCR_NOTES_PREFIX}\n${trimmed}`;
  if (!existingNotes.trim()) return ocrBlock;

  if (existingNotes.includes(OCR_NOTES_PREFIX)) {
    const before = existingNotes.slice(0, existingNotes.indexOf(OCR_NOTES_PREFIX)).trimEnd();
    const afterStart = existingNotes.indexOf(OCR_NOTES_PREFIX) + OCR_NOTES_PREFIX.length;
    const rest = existingNotes.slice(afterStart);
    const nextMarker = rest.search(/\n\s*\[(?!OCR)/);
    const tail = nextMarker >= 0 ? rest.slice(nextMarker).trim() : '';
    const parts = [before, ocrBlock, tail].filter(Boolean);
    return parts.join('\n\n');
  }

  return `${ocrBlock}\n\n${existingNotes.trim()}`;
}

function parseOcrJson(raw: string): PhotoOcrResult {
  const blob = extractJsonBlob(raw) || raw.match(/\{[\s\S]*\}/)?.[0];
  if (!blob) {
    const text = raw.trim();
    return { text, hasText: text.length > 0 };
  }

  try {
    const parsed = JSON.parse(blob) as {
      hasText?: boolean;
      text?: string;
      language?: string;
      notes?: string;
    };
    const text = String(parsed.text || '').trim();
    const hasText = parsed.hasText !== false && text.length > 0;
    return {
      text,
      hasText,
      language: parsed.language,
      notes: parsed.notes,
    };
  } catch {
    const text = raw.trim();
    return { text, hasText: text.length > 0 };
  }
}

export async function extractPhotoOcrText(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<PhotoOcrResult> {
  if (!isAiConfigured()) {
    return { text: '', hasText: false, notes: '未配置 AI，无法 OCR' };
  }

  try {
    const { response } = await chatWithKeyAndModelFallback(
      VISION_MODELS,
      {
        messages: [
          {
            role: 'system',
            content: '你只输出合法 JSON，专注 OCR 文字识别。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: OCR_PROMPT },
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${imageBase64}` },
              },
            ],
          },
        ],
        max_tokens: 1500,
        temperature: 0.1,
      },
      { kind: 'vision' }
    );

    const text = extractAssistantText(response.choices[0]?.message || {});
    return parseOcrJson(text);
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    console.error('OCR 识别失败:', error);
    throw formatAiError(error);
  }
}

export async function applyOcrToPhoto(
  imageBase64: string,
  mimeType: string,
  existingNotes: string
): Promise<{ ocr: PhotoOcrResult; user_notes: string }> {
  const ocr = await extractPhotoOcrText(imageBase64, mimeType);
  if (!ocr.hasText) {
    return { ocr, user_notes: existingNotes };
  }
  return {
    ocr,
    user_notes: mergeOcrIntoUserNotes(existingNotes, ocr.text),
  };
}
