import { NextRequest, NextResponse } from 'next/server';
import { getStory, publishStory } from '@/lib/db';
import { requireStoryAccess, familyAccessErrorResponse } from '@/lib/family-access';

/** POST 发布故事（兼容仅转发 GET/POST 的反向代理，避免 PATCH 404） */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const storyId = body.storyId as string | undefined;
    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }

    await requireStoryAccess(request, storyId);
    const story = getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    publishStory(storyId);
    const updated = getStory(storyId);

    return NextResponse.json({
      success: true,
      story: updated ? { ...updated, published: true } : undefined,
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('[api/story/publish]', error);
    return NextResponse.json({ error: '发布失败' }, { status: 500 });
  }
}
