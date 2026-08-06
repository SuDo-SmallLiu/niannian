import { NextRequest, NextResponse } from 'next/server';
import { addPhoto, getPhotoCount, updatePhotoSourceMetadata } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import {
  isGooglePhotosJsonFile,
  isImageFile,
  parseGooglePhotosJson,
  extractPhotoSourceFacts,
  findMetadataForPhoto,
  type PhotoSourceFacts,
} from '@/lib/google-photos-metadata';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const familyId = formData.get('familyId') as string;
    const allFiles = formData.getAll('photos') as File[];

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭ID' }, { status: 400 });
    }

    const imageFiles = allFiles.filter((f) => isImageFile(f.name));
    const jsonFiles = allFiles.filter((f) => isGooglePhotosJsonFile(f.name));

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: '请至少上传一张照片' }, { status: 400 });
    }

    if (imageFiles.length > 50) {
      return NextResponse.json({ error: '最多上传50张照片' }, { status: 400 });
    }

    // 预解析 Google Photos JSON 侧车文件
    const jsonEntries: Array<{ fileName: string; facts: PhotoSourceFacts }> = [];
    for (const jf of jsonFiles) {
      const content = await jf.text();
      const parsed = parseGooglePhotosJson(content);
      if (parsed) {
        jsonEntries.push({ fileName: jf.name, facts: extractPhotoSourceFacts(parsed) });
      }
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', familyId);
    await mkdir(uploadDir, { recursive: true });

    const uploadedPhotos: Array<{ id: string; url: string; name: string; hasMetadata: boolean }> = [];
    let metadataMatched = 0;

    for (const file of imageFiles) {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));

      const url = `/uploads/${familyId}/${fileName}`;
      const id = addPhoto(familyId, url, file.name);

      const sourceFacts = findMetadataForPhoto(file.name, jsonEntries);
      if (sourceFacts) {
        updatePhotoSourceMetadata(id, 'google_photos', sourceFacts as unknown as Record<string, unknown>);
        metadataMatched += 1;
      }

      uploadedPhotos.push({ id, url, name: file.name, hasMetadata: !!sourceFacts });
    }

    const totalCount = getPhotoCount(familyId);

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      totalCount,
      metadata: {
        jsonFiles: jsonFiles.length,
        matched: metadataMatched,
      },
    });
  } catch (error) {
    console.error('上传照片失败:', error);
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 });
  }
}
