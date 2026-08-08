import { NextRequest, NextResponse } from 'next/server';
import { getPhotosByFamily, getFamily, getPhoto } from '@/lib/db';
import {
  clearAnalysisJob,
  getAnalysisJob,
  summarizeJob,
} from '@/lib/photo-analysis-job';
import { runFamilyPhotoAnalysis } from '@/services/photo-batch-analysis.service';

export async function POST(request: NextRequest) {
  try {
    const { familyId } = await request.json();

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭ID' }, { status: 400 });
    }

    const family = getFamily(familyId);
    if (!family) {
      return NextResponse.json({ error: '家庭不存在' }, { status: 404 });
    }

    const photos = getPhotosByFamily(familyId);
    if (photos.length === 0) {
      return NextResponse.json({ error: '该家庭没有照片，请先上传照片' }, { status: 400 });
    }

    const existing = getAnalysisJob(familyId);
    if (existing?.status === 'processing') {
      return NextResponse.json({ status: 'processing', familyId });
    }

    const photoIds = photos.map((p) => p.id);

    runFamilyPhotoAnalysis(familyId, photoIds).catch((err) => {
      console.error(`分析家庭 ${familyId} 失败:`, err);
    });

    return NextResponse.json({ status: 'processing', familyId, total: photoIds.length });
  } catch (error) {
    console.error('AI分析启动失败:', error);
    return NextResponse.json({ error: '分析启动失败' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const familyId = request.nextUrl.searchParams.get('familyId');
  if (!familyId) {
    return NextResponse.json({ error: '缺少familyId' }, { status: 400 });
  }

  const job = getAnalysisJob(familyId);

  if (!job) {
    return NextResponse.json({ status: 'unknown' });
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
    const payload = {
      status: 'done',
      redirectTo: `/family/${familyId}/photos`,
      ...summary,
      photos,
    };
    clearAnalysisJob(familyId);
    return NextResponse.json(payload);
  }

  if (job.status === 'error') {
    const payload = {
      status: 'error',
      message: '部分照片解析失败，可单独重试',
      ...summary,
      photos,
    };
    clearAnalysisJob(familyId);
    return NextResponse.json(payload);
  }

  return NextResponse.json({
    status: 'processing',
    ...summary,
    photos,
  });
}
