import { NextRequest, NextResponse } from 'next/server';
import { deletePhotoById, getPhotosByFamily, getMemoryCardsByFamily, getTagsByPhoto } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    const photoId = request.nextUrl.searchParams.get('photoId');
    if (!photoId) {
      return NextResponse.json({ error: '缺少 photoId' }, { status: 400 });
    }
    const ok = deletePhotoById(photoId);
    if (!ok) {
      return NextResponse.json({ error: '记忆卡不存在' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除记忆卡失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}

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
