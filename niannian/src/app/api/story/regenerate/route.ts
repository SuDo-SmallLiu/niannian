import { NextRequest, NextResponse } from 'next/server';
import { AiServiceError } from '@/lib/ai';
import { regenerateStoryById } from '@/lib/regenerate-story';
import type { RegenMode } from '@/lib/story-engine/types';
import { getStoryPhotosDetail, getStorySegments } from '@/lib/story-segments';

const MODES: RegenMode[] = ['full', 'rediscover_theme', 'keep_theme', 'reorder'];

export async function POST(request: NextRequest) {
  try {
    const { storyId, mode = 'full' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }

    const regenMode = MODES.includes(mode) ? (mode as RegenMode) : 'full';
    const story = await regenerateStoryById(storyId, regenMode);

    const segments = getStorySegments(
      storyId,
      story!.photos as string[],
      story!.summary || story!.description
    );
    const photos = getStoryPhotosDetail(story!.family_id, story!.photos as string[]);

    return NextResponse.json({
      story: {
        ...story,
        description: story!.summary || story!.description,
        photos_detail: photos,
        segments,
      },
      mode: regenMode,
    });
  } catch (error) {
    console.error('重新生成故事失败:', error);
    if (error instanceof AiServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 502 });
    }
    const message = error instanceof Error ? error.message : '重新生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
