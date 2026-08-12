import { NextRequest, NextResponse } from 'next/server';
import { getJobById, jobToPublicView } from '@/lib/jobs/job-repository';
import {
  requireFamilyAccess,
  requireMovieAccess,
  requireStoryAccess,
  familyAccessErrorResponse,
} from '@/lib/family-access';

async function assertJobAccess(request: NextRequest, jobId: string) {
  const job = getJobById(jobId);
  if (!job) return { job: null as null, error: NextResponse.json({ error: '任务不存在' }, { status: 404 }) };

  if (job.familyId) {
    await requireFamilyAccess(request, job.familyId);
  } else if (job.resourceId && job.type === 'story_regenerate') {
    await requireStoryAccess(request, job.resourceId);
  } else if (
    job.resourceId &&
    (job.type === 'movie_render' || job.type === 'movie_audio_plan' || job.type === 'movie_generate')
  ) {
    await requireMovieAccess(request, job.resourceId);
  } else if (job.resourceId && job.type === 'speech_synthesize') {
    await requireMovieAccess(request, job.resourceId);
  }

  return { job, error: null as null };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const { job, error } = await assertJobAccess(request, jobId);
    if (error) return error;
    return NextResponse.json(jobToPublicView(job!));
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    return NextResponse.json({ error: '获取任务失败' }, { status: 500 });
  }
}
