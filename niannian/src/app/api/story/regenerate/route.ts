import { NextRequest, NextResponse } from 'next/server';
import { AiServiceError } from '@/lib/ai';
import { regenerateStoryById } from '@/lib/regenerate-story';

export async function POST(request: NextRequest) {
  try {
    const { storyId } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }

    const story = await regenerateStoryById(storyId);
    return NextResponse.json({ story });
  } catch (error) {
    console.error('重新生成故事失败:', error);
    if (error instanceof AiServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : '重新生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
