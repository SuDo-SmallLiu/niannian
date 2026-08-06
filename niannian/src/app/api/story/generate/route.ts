import { NextRequest, NextResponse } from 'next/server';
import { runStoryEngine } from '@/lib/story-engine';
import { getStoriesByFamily } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const familyId = body.familyId as string | undefined;
    const replaceExisting = body.replaceExisting !== false;

    if (!familyId) {
      return NextResponse.json({ error: '请提供 familyId' }, { status: 400 });
    }

    const result = await runStoryEngine(familyId, { replaceExisting });
    const stories = getStoriesByFamily(familyId);

    return NextResponse.json({
      ok: true,
      sceneCount: result.scenes.length,
      storyCount: result.stories.length,
      stories,
      scenes: result.scenes,
    });
  } catch (error) {
    console.error('故事生成失败:', error);
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
