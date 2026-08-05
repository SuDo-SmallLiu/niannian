import { NextRequest, NextResponse } from 'next/server';
import { getPhotosByFamily, updatePhotoAnalysis, createStory, getFamily } from '@/lib/db';
import { analyzePhoto, buildPhotoRelations, generateFamilyStory } from '@/lib/ai';
import { readFileSync } from 'fs';
import path from 'path';

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
        // 读取照片文件并转为 base64
        const filePath = path.join(process.cwd(), 'public', photo.url);
        const fileBuffer = readFileSync(filePath);
        const base64 = fileBuffer.toString('base64');

        const analysis = await analyzePhoto(base64);

        // 更新数据库
        updatePhotoAnalysis(photo.id, {
          people: analysis.people,
          location: analysis.scene,
          event: analysis.action,
          ai_tags: analysis.tags,
          taken_at: analysis.time,
        });

        photoAnalyses.push({
          id: photo.id,
          ...analysis,
        });
      } catch (err) {
        console.error(`分析照片 ${photo.id} 失败:`, err);
        // 跳过失败的照片，继续处理
      }
    }

    // Step 2: 建立照片关系
    const relations = buildPhotoRelations(
      photoAnalyses.map((p) => ({ id: p.id, people: p.people }))
    );

    // Step 3: 生成故事
    const story = await generateFamilyStory(
      family.name,
      family.members,
      photoAnalyses,
      relations
    );

    // 保存故事到数据库
    const storyId = createStory(
      familyId,
      story.title,
      story.emotionSummary,
      photoAnalyses.map((p) => p.id),
      story.connectionAction,
      story.timeline
    );

    return NextResponse.json({
      success: true,
      storyId,
      story: {
        ...story,
        photoCount: photoAnalyses.length,
      },
      relations: relations.slice(0, 5),
    });
  } catch (error) {
    console.error('AI分析失败:', error);
    return NextResponse.json({ error: '分析失败，请重试' }, { status: 500 });
  }
}
