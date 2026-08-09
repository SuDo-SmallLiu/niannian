import { NextRequest, NextResponse } from 'next/server';
import { runManualStoryCompose } from '@/lib/story-engine';
import { getStory } from '@/lib/db';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const familyId = body.familyId as string | undefined;
    const photoIds = body.photoIds as string[] | undefined;

    if (!familyId) {
      return NextResponse.json({ error: '请提供 familyId' }, { status: 400 });
    }
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: '请至少选择一张照片' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);
    const { storyId } = await runManualStoryCompose(familyId, photoIds);
    const story = getStory(storyId);

    return NextResponse.json({ ok: true, storyId, story });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('人工组合生成故事失败:', error);
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
