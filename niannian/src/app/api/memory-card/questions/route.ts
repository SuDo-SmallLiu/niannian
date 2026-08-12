import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import { getMemoryCardByPhoto } from '@/lib/db';
import {
  regenerateMemoryCardQuestions,
  shouldRefreshMemoryCardQuestions,
} from '@/lib/memory-card-questions';
import { requirePhotoAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = heavyApiRateLimitResponse(request, 'memory-card/questions');
    if (rateLimited) return rateLimited;

    const { photoId, forceRefresh } = await request.json();
    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    await requirePhotoAccess(request, photoId);
    const card = getMemoryCardByPhoto(photoId);
    if (!card) {
      return NextResponse.json({ error: '记忆卡不存在，请先完成 AI 解析' }, { status: 404 });
    }

    const needsRefresh =
      !!forceRefresh || shouldRefreshMemoryCardQuestions(card);

    if (!needsRefresh && card.ai_questions?.length) {
      return NextResponse.json({ ai_questions: card.ai_questions });
    }

    const ai_questions = await regenerateMemoryCardQuestions(photoId);

    return NextResponse.json({ ai_questions });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('生成 AI 提问失败:', error);
    return NextResponse.json({ error: '生成提问失败' }, { status: 500 });
  }
}
