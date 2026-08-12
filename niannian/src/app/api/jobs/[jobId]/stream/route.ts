import { getJobById, jobToPublicView } from '@/lib/jobs/job-repository';
import {
  requireFamilyAccess,
  requireMovieAccess,
  requireStoryAccess,
  familyAccessErrorResponse,
} from '@/lib/family-access';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function assertJobAccess(request: NextRequest, jobId: string) {
  const job = getJobById(jobId);
  if (!job) return null;

  if (job.familyId) {
    await requireFamilyAccess(request, job.familyId);
  } else if (job.resourceId && job.type === 'story_regenerate') {
    await requireStoryAccess(request, job.resourceId);
  } else if (
    job.resourceId &&
    (job.type === 'movie_render' ||
      job.type === 'movie_audio_plan' ||
      job.type === 'movie_generate' ||
      job.type === 'speech_synthesize')
  ) {
    await requireMovieAccess(request, job.resourceId);
  }

  return job;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;
    const job = await assertJobAccess(request, jobId);
    if (!job) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: string, data: Record<string, unknown>) => {
          if (closed) return;
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        const poll = () => {
          if (closed) return;
          const current = getJobById(jobId);
          if (!current) {
            send('error', { error: '任务不存在' });
            closed = true;
            controller.close();
            return;
          }

          const view = jobToPublicView(current);
          send('progress', view);

          if (current.status === 'done') {
            send('done', view);
            closed = true;
            controller.close();
            return;
          }
          if (current.status === 'error' || current.status === 'cancelled') {
            send('error', view);
            closed = true;
            controller.close();
            return;
          }
        };

        poll();
        const timer = setInterval(poll, 1200);

        request.signal.addEventListener('abort', () => {
          closed = true;
          clearInterval(timer);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    return NextResponse.json({ error: '任务流订阅失败' }, { status: 500 });
  }
}
