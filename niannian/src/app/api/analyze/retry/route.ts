import { NextRequest, NextResponse } from 'next/server';
import { checkHeavyApiRateLimit } from '@/lib/api-rate-limit';
import { getFamily, getPhoto } from '@/lib/db';
import { createPhotoAnalyzeSingleJob } from '@/lib/jobs/create-jobs';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkHeavyApiRateLimit({
      ip: clientIp(request),
      endpoint: 'analyze_retry',
    });
    if (!rate.ok) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfterSec: rate.retryAfterSec },
        { status: 429, headers: rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {} }
      );
    }

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

    const jobId = createPhotoAnalyzeSingleJob({
      familyId,
      photoId,
      mode: 'retry',
    });

    return NextResponse.json({ status: 'queued', jobId, photoId });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    const message = error instanceof Error ? error.message : '重试失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
