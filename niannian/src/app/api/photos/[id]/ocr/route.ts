import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import {
  getMemoryCardByPhoto,
  getPhoto,
  updateMemoryCardSupplement,
} from '@/lib/db';
import { requirePhotoAccess, familyAccessErrorResponse } from '@/lib/family-access';
import {
  preprocessImageForAnalysis,
  resolvePhotoFilePath,
} from '@/services/image-preprocess.service';
import { applyOcrToPhoto, extractOcrFromNotes } from '@/lib/photo-ocr';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimited = heavyApiRateLimitResponse(request, 'photos/ocr');
    if (rateLimited) return rateLimited;

    const { id: photoId } = await context.params;
    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    await requirePhotoAccess(request, photoId);
    const photo = getPhoto(photoId);
    if (!photo) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 });
    }

    const card = getMemoryCardByPhoto(photoId);
    const filePath = resolvePhotoFilePath(photo.url);
    const { base64, mimeType } = await preprocessImageForAnalysis(filePath);

    const existingNotes = card?.user_notes || '';
    const { ocr, user_notes } = await applyOcrToPhoto(base64, mimeType, existingNotes);

    if (!ocr.hasText) {
      return NextResponse.json({
        ok: true,
        hasText: false,
        message: '未识别到文字，请尝试更清晰的照片或调整角度',
        previousText: extractOcrFromNotes(existingNotes),
      });
    }

    updateMemoryCardSupplement(photoId, {
      user_notes,
      voice_transcript: card?.voice_transcript,
      ai_questions: card?.ai_questions,
    });

    return NextResponse.json({
      ok: true,
      hasText: true,
      text: ocr.text,
      language: ocr.language,
      user_notes,
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('[api/photos/ocr]', error);
    const message = error instanceof Error ? error.message : 'OCR 识别失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
