import { createJob, jobToPublicView } from '@/lib/jobs/job-repository';
import { scheduleInProcessJobDrain } from '@/lib/jobs/job-processor';
import { requireFamilyAccess, requireStoryAccess, familyAccessErrorResponse } from '@/lib/family-access';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, familyId, resourceId, payload = {}, idempotencyKey } = body;

    if (!type) {
      return NextResponse.json({ error: '缺少 type' }, { status: 400 });
    }

    if (familyId) {
      await requireFamilyAccess(request, familyId);
    }
    if (resourceId && type === 'story_regenerate') {
      await requireStoryAccess(request, resourceId);
    }

    const job = createJob({
      type,
      familyId,
      resourceId,
      payload,
      idempotencyKey,
    });

    scheduleInProcessJobDrain();

    return NextResponse.json({ ok: true, ...jobToPublicView(job) });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    const message = error instanceof Error ? error.message : '创建任务失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
