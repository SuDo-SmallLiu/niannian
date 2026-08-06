import { NextRequest, NextResponse } from 'next/server';
import { getPhotosByFamily, getMemoryCardsByFamily, getTagsByPhoto } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('familyId');
    if (!familyId) {
      return NextResponse.json({ error: '缺少 familyId' }, { status: 400 });
    }

    const photos = getPhotosByFamily(familyId);
    const memoryCards = getMemoryCardsByFamily(familyId);
    const cardMap = new Map(memoryCards.map((c) => [c.photo_id, c]));

    const result = photos.map((photo) => ({
      ...photo,
      memoryCard: cardMap.get(photo.id) || null,
      tags: getTagsByPhoto(photo.id),
    }));

    return NextResponse.json({ photos: result, total: result.length });
  } catch (error) {
    console.error('获取照片列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
