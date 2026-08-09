import { NextRequest, NextResponse } from 'next/server';
import { getFamily, getPhoto } from '@/lib/db';
import { retryPhotoAnalysis } from '@/services/photo-batch-analysis.service';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const { familyId, photoId } = await request.json();

    if (!familyId || !photoId) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);
    const family = getFamily(familyId);
    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    const photo = getPhoto(photoId);
    if (!photo || photo.family_id !== familyId) {
      return NextResponse.json({ error: '照片不存在' }, { status: 404 });
    }

    await retryPhotoAnalysis(familyId, photoId);

    return NextResponse.json({ status: 'completed', photoId });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    const message = error instanceof Error ? error.message : '重试失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
