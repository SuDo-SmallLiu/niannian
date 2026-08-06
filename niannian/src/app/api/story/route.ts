import { NextRequest, NextResponse } from 'next/server';
import {
  deleteStoryById,
  getStoriesByFamily,
  getStory,
  getFamily,
  getStoryMemoryCards,
} from '@/lib/db';
import { getStoryPhotosDetail, getStorySegments } from '@/lib/story-segments';

export async function DELETE(request: NextRequest) {
  try {
    const storyId = request.nextUrl.searchParams.get('storyId');
    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }
    const ok = deleteStoryById(storyId);
    if (!ok) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除故事失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const storyId = searchParams.get('storyId');

    if (storyId) {
      const story = getStory(storyId);
      if (!story) {
        return NextResponse.json({ error: '故事不存在' }, { status: 404 });
      }

      const segments = getStorySegments(
        storyId,
        story.photos as string[],
        story.summary || story.description
      );
      const orderedPhotoIds = segments.map((s) => s.photoId);
      const photos = getStoryPhotosDetail(
        story.family_id,
        orderedPhotoIds.length > 0 ? orderedPhotoIds : (story.photos as string[])
      );
      const family = getFamily(story.family_id);
      const memoryLinks = getStoryMemoryCards(storyId);

      return NextResponse.json({
        story: {
          ...story,
          description: story.summary || story.description,
          photos_detail: photos,
          memory_cards: memoryLinks,
          segments,
        },
        family: family
          ? { name: family.name, members: family.members }
          : null,
      });
    }

    if (familyId) {
      const stories = getStoriesByFamily(familyId);
      return NextResponse.json({ stories });
    }

    return NextResponse.json({ error: '请提供 familyId 或 storyId' }, { status: 400 });
  } catch (error) {
    console.error('获取故事失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
