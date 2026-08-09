import { NextRequest, NextResponse } from 'next/server';
import { createStoryJob, getStoryJob, startStoryJob } from '@/lib/story-job';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get('jobId');
    if (!jobId) {
      return NextResponse.json({ error: '缺少 jobId' }, { status: 400 });
    }

    const job = getStoryJob(jobId);
    if (!job) {
      return NextResponse.json({ error: '任务不存在或已过期' }, { status: 404 });
    }

    await requireFamilyAccess(request, job.familyId);

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      error: job.error,
      storyCount: job.storyCount,
      sceneCount: job.sceneCount,
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const familyId = body.familyId as string | undefined;
    const replaceExisting = body.replaceExisting !== false;

    if (!familyId) {
      return NextResponse.json({ error: '请提供 familyId' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);
    const jobId = createStoryJob(familyId);
    startStoryJob(jobId, { replaceExisting });

    return NextResponse.json({ ok: true, jobId });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('故事生成任务创建失败:', error);
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
