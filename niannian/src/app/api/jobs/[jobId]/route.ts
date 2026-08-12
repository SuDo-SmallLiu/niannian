import { getJobById, jobToPublicView } from '@/lib/jobs/job-repository';
import { requireFamilyAccess, requireStoryAccess, familyAccessErrorResponse } from '@/lib/family-access';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const job = getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    if (job.familyId) {
      await requireFamilyAccess(request, job.familyId);
    } else if (job.resourceId && job.type === 'story_regenerate') {
      await requireStoryAccess(request, job.resourceId);
    }

    return NextResponse.json(jobToPublicView(job));
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 });
  }
}
