import { NextRequest, NextResponse } from 'next/server';
import { addPhoto, getPhotoCount } from '@/lib/db';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const familyId = formData.get('familyId') as string;
    const files = formData.getAll('photos') as File[];

    if (!familyId) {
      return NextResponse.json({ error: '缺少家庭ID' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: '请至少上传一张照片' }, { status: 400 });
    }

    // 限制最多50张
    if (files.length > 50) {
      return NextResponse.json({ error: '最多上传50张照片' }, { status: 400 });
    }

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', familyId);
    await mkdir(uploadDir, { recursive: true });

    const uploadedPhotos: Array<{ id: string; url: string; name: string }> = [];

    for (const file of files) {
      // 生成唯一文件名
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      // 读取文件内容
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // 写入磁盘
      await writeFile(filePath, buffer);

      // 记录到数据库
      const url = `/uploads/${familyId}/${fileName}`;
      const id = addPhoto(familyId, url, file.name);
      uploadedPhotos.push({ id, url, name: file.name });
    }

    const totalCount = getPhotoCount(familyId);

    return NextResponse.json({
      success: true,
      photos: uploadedPhotos,
      totalCount,
    });
  } catch (error) {
    console.error('上传照片失败:', error);
    return NextResponse.json({ error: '上传失败，请重试' }, { status: 500 });
  }
}
