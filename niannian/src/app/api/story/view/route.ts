import { NextRequest, NextResponse } from 'next/server';
import { getStory, incrementStoryReadCount } from '@/lib/db';
import { requireStoryAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();
    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }

    await requireStoryAccess(request, storyId);
    const story = getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const readCount = incrementStoryReadCount(storyId);
    return NextResponse.json({ readCount });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('记录阅读失败:', error);
    return NextResponse.json({ error: '记录失败' }, { status: 500 });
  }
}
