import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import { createStoryJob, startStoryJob } from '@/lib/story-job';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = heavyApiRateLimitResponse(request, 'story/generate');
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const familyId = body.familyId as string | undefined;
    const replaceExisting = body.replaceExisting !== false;

    if (!familyId) {
      return NextResponse.json({ error: '请提供 familyId' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);
    const jobId = createStoryJob(familyId, { replaceExisting });
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
