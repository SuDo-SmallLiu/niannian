import { NextRequest, NextResponse } from 'next/server';
import {
  deleteStoryById,
  getStoriesByFamily,
  getPublishedStoriesByFamily,
  getStory,
  getFamily,
  getStoryMemoryCards,
  publishStory,
} from '@/lib/db';
import { patchStory } from '@/lib/story-edit';
import { getStoryPhotosDetail, getStorySegments } from '@/lib/story-segments';
import {
  requireFamilyAccess,
  requireStoryAccess,
  familyAccessErrorResponse,
} from '@/lib/family-access';

export async function DELETE(request: NextRequest) {
  try {
    const storyId = request.nextUrl.searchParams.get('storyId');
    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }
    await requireStoryAccess(request, storyId);
    const ok = deleteStoryById(storyId);
    if (!ok) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('删除故事失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const storyId = body.storyId as string | undefined;
    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }

    await requireStoryAccess(request, storyId);

    const story = patchStory({
      storyId,
      title: body.title,
      summary: body.summary,
      photoOrder: body.photoOrder,
      removePhotoIds: body.removePhotoIds,
      segments: body.segments,
    });

    if (body.publish === true) {
      publishStory(storyId);
    }

    const updated = getStory(storyId) || story;

    const segments = getStorySegments(
      storyId,
      updated!.photos as string[],
      updated!.summary || updated!.description
    );
    const orderedPhotoIds = segments.map((s) => s.photoId);
    const photos = getStoryPhotosDetail(
      updated!.family_id,
      orderedPhotoIds.length > 0 ? orderedPhotoIds : (updated!.photos as string[])
    );

    return NextResponse.json({
      story: {
        ...updated,
        description: updated!.summary || updated!.description,
        photos_detail: photos,
        segments,
      },
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('更新故事失败:', error);
    const message = error instanceof Error ? error.message : '更新失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('familyId');
    const storyId = searchParams.get('storyId');

    if (storyId) {
      await requireStoryAccess(request, storyId);
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
      await requireFamilyAccess(request, familyId);
      const publishedOnly = searchParams.get('publishedOnly') === '1';
      const stories = publishedOnly
        ? getPublishedStoriesByFamily(familyId)
        : getStoriesByFamily(familyId);
      return NextResponse.json({ stories });
    }

    return NextResponse.json({ error: '请提供 familyId 或 storyId' }, { status: 400 });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('获取故事失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
