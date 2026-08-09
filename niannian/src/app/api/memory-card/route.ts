import { NextRequest, NextResponse } from 'next/server';
import {
  getMemoryCardWithPhoto,
  updateMemoryCardSupplement,
  type AiQuestion,
} from '@/lib/db';
import { requirePhotoAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function GET(request: NextRequest) {
  try {
    const photoId = request.nextUrl.searchParams.get('photoId');
    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    await requirePhotoAccess(request, photoId);
    const data = getMemoryCardWithPhoto(photoId);
    if (!data) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('获取记忆卡失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoId, user_notes, voice_transcript, ai_questions } = body as {
      photoId?: string;
      user_notes?: string;
      voice_transcript?: string;
      ai_questions?: AiQuestion[];
    };

    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }

    await requirePhotoAccess(request, photoId);
    updateMemoryCardSupplement(photoId, {
      user_notes,
      voice_transcript,
      ai_questions,
    });

    const data = getMemoryCardWithPhoto(photoId);
    return NextResponse.json(data);
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('更新记忆卡失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
