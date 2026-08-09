import { getMemoryCardsByFamily, getPhoto, getPhotosByFamily } from '@/lib/db';
import type { PhotoTaskStatus } from '@/lib/photo-analysis-job';

function mapCardStatus(analysisStatus?: string): PhotoTaskStatus {
  if (analysisStatus === 'analyzed') return 'completed';
  if (analysisStatus === 'failed') return 'failed';
  return 'pending';
}

/** 内存任务丢失时，从 DB 重建解析进度（例如服务重启或 GET 竞态后） */
export function buildAnalysisStatusFromDb(familyId: string) {
  const photos = getPhotosByFamily(familyId);
  if (photos.length === 0) return null;

  const cards = getMemoryCardsByFamily(familyId);
  const cardByPhoto = new Map(cards.map((c) => [c.photo_id, c]));

  const photoTasks = photos.map((photo) => {
    const card = cardByPhoto.get(photo.id);
    return {
      id: photo.id,
      status: mapCardStatus(card?.analysis_status),
      url: photo.url,
      error: card?.analysis_status === 'failed' ? '解析失败' : undefined,
    };
  });

  const total = photoTasks.length;
  const completed = photoTasks.filter((p) => p.status === 'completed').length;
  const failed = photoTasks.filter((p) => p.status === 'failed').length;
  const pending = photoTasks.filter((p) => p.status === 'pending').length;
  const active = 0;
  const progress = total > 0 ? Math.round(((completed + failed) / total) * 100) : 0;

  let status: 'processing' | 'done' | 'error';
  if (pending > 0) {
    status = 'processing';
  } else if (completed > 0) {
    status = 'done';
  } else {
    status = 'error';
  }

  return {
    status,
    total,
    completed,
    failed,
    active,
    pending,
    progress,
    photos: photoTasks,
    redirectTo: `/family/${familyId}/photos`,
  };
}
