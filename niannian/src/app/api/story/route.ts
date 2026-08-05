import { NextRequest, NextResponse } from 'next/server';
import { getStoriesByFamily, getStory, getPhotosByFamily, getFamily } from '@/lib/db';

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

      const photos = getPhotosByFamily(story.family_id);
      const family = getFamily(story.family_id);

      // 只返回故事中引用的照片
      const storyPhotos = photos.filter((p) => story.photos.includes(p.id));

      return NextResponse.json({
        story: {
          ...story,
          photos_detail: storyPhotos,
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
