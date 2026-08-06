import { NextRequest, NextResponse } from 'next/server';
import { getPhotosByFamily, updatePhotoAnalysis, createStory, getFamily, getLatestStoryByFamily, upsertMemoryCard, saveTagsForPhoto } from '@/lib/db';
import { analyzePhoto, buildPhotoRelations, generateFamilyStory, type PhotoAnalysis } from '@/lib/ai';
import { readFileSync } from 'fs';
import path from 'path';

// 存储分析状态
const analysisStatus = new Map<string, 'processing' | 'done' | 'error'>();

// 启动 POST: 开始异步分析
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

    // 如果已经在分析中，直接返回
    if (analysisStatus.get(familyId) === 'processing') {
      return NextResponse.json({ status: 'processing' });
    }

    // 标记为处理中
    analysisStatus.set(familyId, 'processing');

    // 异步处理（不等待）
    processAnalysis(familyId, family.name, family.members, photos).catch((err) => {
      console.error(`分析家庭 ${familyId} 失败:`, err);
      analysisStatus.set(familyId, 'error');
    });

    return NextResponse.json({ status: 'processing', familyId });
  } catch (error) {
    console.error('AI分析启动失败:', error);
    return NextResponse.json({ error: '分析启动失败' }, { status: 500 });
  }
}

// GET: 轮询分析状态
export async function GET(request: NextRequest) {
  const familyId = request.nextUrl.searchParams.get('familyId');
  if (!familyId) {
    return NextResponse.json({ error: '缺少familyId' }, { status: 400 });
  }

  const status = analysisStatus.get(familyId);

  if (status === 'done') {
    const story = getLatestStoryByFamily(familyId);
    analysisStatus.delete(familyId);
    return NextResponse.json({ status: 'done', story, redirectTo: `/family/${familyId}/photos` });
  }

  if (status === 'error') {
    analysisStatus.delete(familyId);
    return NextResponse.json({ status: 'error', message: '分析失败，请重试' });
  }

  return NextResponse.json({ status: status || 'unknown' });
}

async function processAnalysis(
  familyId: string,
  familyName: string,
  familyMembers: string[],
  photos: Array<{ id: string; url: string }>
) {
  try {
    // Step 1: 逐张分析照片
    const photoAnalyses: Array<{
      id: string;
      people: string[];
      scene: string;
      action: string;
      time: string;
      tags: string[];
    }> = [];

    for (const photo of photos) {
      try {
        const filePath = path.join(process.cwd(), 'public', photo.url);
        const fileBuffer = readFileSync(filePath);
        const base64 = fileBuffer.toString('base64');

        const analysis = await analyzePhoto(base64);

        updatePhotoAnalysis(photo.id, {
          people: analysis.people,
          location: analysis.scene,
          event: analysis.action,
          ai_tags: analysis.tags,
          taken_at: analysis.time,
        });

        saveMemoryCardFromAnalysis(familyId, photo.id, analysis);

        photoAnalyses.push({
          id: photo.id,
          ...analysis,
        });
        console.log(`✅ 分析完成: ${photo.id}`);
      } catch (err) {
        console.error(`分析照片 ${photo.id} 失败:`, err);
      }
    }

    if (photoAnalyses.length === 0) {
      analysisStatus.set(familyId, 'error');
      return;
    }

    // Step 2: 建立照片关系
    const relations = buildPhotoRelations(
      photoAnalyses.map((p) => ({ id: p.id, people: p.people }))
    );

    // Step 3: 生成故事
    const story = await generateFamilyStory(
      familyName,
      familyMembers,
      photoAnalyses,
      relations
    );

    // 保存故事到数据库
    createStory(
      familyId,
      story.title,
      story.emotionSummary,
      photoAnalyses.map((p) => p.id),
      story.connectionAction,
      story.timeline
    );

    console.log(`✅ 故事生成完成: ${familyId}, ${story.title}`);
    analysisStatus.set(familyId, 'done');
  } catch (err) {
    console.error(`处理分析 ${familyId} 异常:`, err);
    analysisStatus.set(familyId, 'error');
  }
}

const LAYER_MAP: Record<string, number> = {
  objective: 1,
  behavior: 2,
  change: 3,
  family_value: 4,
};

function saveMemoryCardFromAnalysis(familyId: string, photoId: string, analysis: PhotoAnalysis) {
  upsertMemoryCard({
    photo_id: photoId,
    family_id: familyId,
    taken_at: analysis.time,
    location: analysis.scene,
    people: analysis.people,
    action: analysis.action,
    emotions: analysis.emotions,
    changes: analysis.changes,
    significance: analysis.significance,
    analysis_status: 'analyzed',
  });

  const tags: Array<{ photo_id: string; layer: number; key: string; value: string }> = [];
  for (const [layerName, items] of Object.entries(analysis.layeredTags)) {
    const layer = LAYER_MAP[layerName];
    if (!layer || !items) continue;
    for (const item of items) {
      tags.push({ photo_id: photoId, layer, key: item.key, value: item.value });
    }
  }
  saveTagsForPhoto(photoId, tags);
}
