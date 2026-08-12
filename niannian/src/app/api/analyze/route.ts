import { NextRequest, NextResponse } from 'next/server';
import { heavyApiRateLimitResponse } from '@/lib/heavy-api-guard';
import { getPhotosByFamily, getFamily, getPhoto } from '@/lib/db';
import { buildAnalysisStatusFromDb } from '@/lib/analysis-db-status';
import { getAnalysisJob, summarizeJob } from '@/lib/photo-analysis-job';
import { createPhotoAnalysisJob } from '@/lib/jobs/create-jobs';
import { findActivePhotoAnalysisJob } from '@/lib/jobs/photo-analysis-jobs';
import { requireFamilyAccess, familyAccessErrorResponse } from '@/lib/family-access';

export async function POST(request: NextRequest) {
  try {
    const rateLimited = heavyApiRateLimitResponse(request, 'analyze');
    if (rateLimited) return rateLimited;

    const { familyId } = await request.json();

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭ID' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);
    const family = getFamily(familyId);
    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    const photos = getPhotosByFamily(familyId);
    if (photos.length === 0) {
      return NextResponse.json({ error: '该家庭没有照片，请先上传照片' }, { status: 400 });
    }

    const activeDbJob = findActivePhotoAnalysisJob(familyId);
    if (activeDbJob) {
      const photoIds = activeDbJob.payload.photoIds as string[] | undefined;
      return NextResponse.json({
        status: 'processing',
        familyId,
        jobId: activeDbJob.id,
        total: photoIds?.length,
      });
    }

    const photoIds = photos.map((p) => p.id);
    const job = createPhotoAnalysisJob({ familyId, photoIds });

    return NextResponse.json({
      status: 'processing',
      familyId,
      jobId: job.id,
      total: photoIds.length,
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('AI分析启动失败:', error);
    return NextResponse.json({ error: '分析启动失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const familyId = request.nextUrl.searchParams.get('familyId');
    if (!familyId) {
      return NextResponse.json({ error: '缺少familyId' }, { status: 400 });
    }

    await requireFamilyAccess(request, familyId);

    const job = getAnalysisJob(familyId);

    if (!job) {
      const fromDb = buildAnalysisStatusFromDb(familyId);
      if (!fromDb) {
        return NextResponse.json({ status: 'unknown' });
      }
      if (fromDb.status === 'done') {
        return NextResponse.json({
          status: 'done',
          redirectTo: fromDb.redirectTo,
          total: fromDb.total,
          completed: fromDb.completed,
          failed: fromDb.failed,
          active: fromDb.active,
          pending: fromDb.pending,
          progress: fromDb.progress,
          photos: fromDb.photos,
        });
      }
      if (fromDb.status === 'error') {
        return NextResponse.json({
          status: 'error',
          message: '部分照片解析失败，可单独重试',
          total: fromDb.total,
          completed: fromDb.completed,
          failed: fromDb.failed,
          active: fromDb.active,
          pending: fromDb.pending,
          progress: fromDb.progress,
          photos: fromDb.photos,
        });
      }
      return NextResponse.json({
        status: 'processing',
        total: fromDb.total,
        completed: fromDb.completed,
        failed: fromDb.failed,
        active: fromDb.active,
        pending: fromDb.pending,
        progress: fromDb.progress,
        photos: fromDb.photos,
      });
    }

    const summary = summarizeJob(job);
    const photos = job.photos.map((task) => {
      const photo = getPhoto(task.photoId);
      return {
        id: task.photoId,
        status: task.status,
        error: task.error,
        url: photo?.url,
      };
    });

    if (job.status === 'done') {
      return NextResponse.json({
        status: 'done',
        jobId: job.jobId,
        redirectTo: `/family/${familyId}/photos`,
        ...summary,
        photos,
      });
    }

    if (job.status === 'error') {
      return NextResponse.json({
        status: 'error',
        jobId: job.jobId,
        message: '部分照片解析失败，可单独重试',
        ...summary,
        photos,
      });
    }

    return NextResponse.json({
      status: 'processing',
      jobId: job.jobId,
      ...summary,
      photos,
    });
  } catch (error) {
    const accessResp = familyAccessErrorResponse(error);
    if (accessResp) return accessResp;
    console.error('获取分析进度失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
