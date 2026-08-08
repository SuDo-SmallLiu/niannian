import { NextRequest, NextResponse } from 'next/server';
import { createStoryJob, getStoryJob, startStoryJob } from '@/lib/story-job';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');
  if (!jobId) {
    return NextResponse.json({ error: '缺少 jobId' }, { status: 400 });
  }

  const job = getStoryJob(jobId);
  if (!job) {
    return NextResponse.json({ error: '任务不存在或已过期' }, { status: 404 });
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    storyCount: job.storyCount,
    sceneCount: job.sceneCount,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const familyId = body.familyId as string | undefined;
    const replaceExisting = body.replaceExisting !== false;

    if (!familyId) {
      return NextResponse.json({ error: '请提供 familyId' }, { status: 400 });
    }

    const jobId = createStoryJob(familyId);
    startStoryJob(jobId, { replaceExisting });

    return NextResponse.json({ ok: true, jobId });
  } catch (error) {
    console.error('故事生成任务创建失败:', error);
    const message = error instanceof Error ? error.message : '生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
