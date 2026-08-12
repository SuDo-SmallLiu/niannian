import { NextRequest, NextResponse } from 'next/server';
import { checkHeavyApiRateLimit } from '@/lib/api-rate-limit';
import { createStoryComposeJob } from '@/lib/jobs/create-jobs';
import { getPublicJobView } from '@/lib/story-job';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

function clientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: '缺少 jobId' }, { status: 400 });
    }

    const job = getPublicJobView(jobId);
    if (!job) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    if (job.familyId) {
      await requireFamilyAccess(request, job.familyId);
    }

    return NextResponse.json(job);
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rate = checkHeavyApiRateLimit({
      ip: clientIp(request),
      endpoint: 'story_compose',
    });
    if (!rate.ok) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfterSec: rate.retryAfterSec },
        { status: 429, headers: rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {} }
      );
    }

    const body = await request.json();
    const familyId = body.familyId as string | undefined;
    const photoIds = body.photoIds as string[] | undefined;

    if (!familyId) {
      return NextResponse.json({ error: '请提供 familyId' }, { status: 400 });
    }
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json({ error: '请至少选择一张照片' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);
    const jobId = createStoryComposeJob({ familyId, photoIds });

    return NextResponse.json({ ok: true, jobId, status: 'queued' });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('人工组合生成故事任务创建失败:', error);
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
