import { NextRequest, NextResponse } from 'next/server';
import { checkHeavyApiRateLimit } from '@/lib/api-rate-limit';
import { getStory } from '@/lib/db';
import { requireStoryAccess, familyAccessErrorResponse } from '@/lib/family-access';
import { createStoryRegenerateJob } from '@/lib/story-job';
import type { RegenMode } from '@/lib/story-engine/types';

const MODES: RegenMode[] = ['full', 'rediscover_theme', 'keep_theme', 'reorder'];

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

    const { getPublicJobView } = await import('@/lib/story-job');
    const job = getPublicJobView(jobId);
    if (!job) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 });
    }

    if (job.familyId) {
      const { requireFamilyAccess } = await import('@/lib/family-access');
      await requireFamilyAccess(request, job.familyId);
    } else if (job.resourceId) {
      await requireStoryAccess(request, job.resourceId);
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
      endpoint: 'story_regenerate',
    });
    if (!rate.ok) {
      return NextResponse.json(
        { error: '请求过于频繁，请稍后再试', retryAfterSec: rate.retryAfterSec },
        { status: 429, headers: rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {} }
      );
    }

    const { storyId, mode = 'full' } = await request.json();

    if (!storyId) {
      return NextResponse.json({ error: '缺少 storyId' }, { status: 400 });
    }

    await requireStoryAccess(request, storyId);
    const story = getStory(storyId);
    if (!story) {
      return NextResponse.json({ error: '故事不存在' }, { status: 404 });
    }

    const regenMode = MODES.includes(mode) ? (mode as RegenMode) : 'full';
    const jobId = createStoryRegenerateJob({
      storyId,
      familyId: story.family_id,
      mode: regenMode,
    });

    return NextResponse.json({ ok: true, jobId, mode: regenMode, status: 'queued' });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('重新生成故事任务创建失败:', error);
    const message = error instanceof Error ? error.message : '重新生成失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
