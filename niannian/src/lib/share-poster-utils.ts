import type { PosterInput } from '@/lib/share-poster';

export function posterFilename(type: 'story' | 'memory' | 'movie') {
  if (type === 'movie') return `念念年年-人生电影-${Date.now()}.png`;
  return type === 'story'
    ? `念念年年-故事-${Date.now()}.png`
    : `念念年年-记忆-${Date.now()}.png`;
}

/** 移动端优先：系统分享（可选微信）→ 下载 */
export async function saveOrSharePoster(
  dataUrl: string,
  title: string,
  filename: string
): Promise<'shared' | 'downloaded' | 'manual'> {
  const { sharePosterNative, downloadPoster } = await import('@/lib/share-poster');

  const shared = await sharePosterNative(dataUrl, title);
  if (shared) return 'shared';

  try {
    downloadPoster(dataUrl, filename);
    return 'downloaded';
  } catch {
    return 'manual';
  }
}

export function toAbsolutePhotoUrl(path: string): string {
  if (path.startsWith('http')) return path;
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function buildPosterInputFromShareMovie(data: {
  family_name: string;
  movie_title: string;
  movie_summary?: string;
  chapter_count?: number;
  photo_urls?: string[];
  shareUrl: string;
}): PosterInput {
  return {
    type: 'movie',
    title: data.movie_title,
    subtitle: data.chapter_count ? `${data.chapter_count} 个故事章节` : undefined,
    summary: data.movie_summary || '多个家庭故事串联 · 沉浸式人生电影',
    familyName: data.family_name,
    photoUrls: (data.photo_urls || []).map(toAbsolutePhotoUrl),
    shareUrl: data.shareUrl,
  };
}

export function buildPosterInputFromShareStory(data: {
  family_name: string;
  story_title: string;
  story_description?: string;
  summary?: string;
  photo_urls?: string[];
  shareUrl: string;
}): PosterInput {
  return {
    type: 'story',
    title: data.story_title,
    summary: data.summary || data.story_description || '',
    familyName: data.family_name,
    photoUrls: (data.photo_urls || []).map(toAbsolutePhotoUrl),
    shareUrl: data.shareUrl,
  };
}

export function buildPosterInputFromShareMemory(data: {
  family_name: string;
  photo: {
    url: string;
    taken_at?: string;
    location?: string;
    significance?: string;
    action?: string;
    archetype?: string;
  };
  shareUrl: string;
}): PosterInput {
  const subtitle = [data.photo.taken_at, data.photo.location].filter(Boolean).join(' · ');
  return {
    type: 'memory',
    title: data.photo.archetype || data.photo.action || '家庭记忆',
    subtitle,
    summary: data.photo.significance || data.photo.action || '',
    familyName: data.family_name,
    photoUrls: [toAbsolutePhotoUrl(data.photo.url)],
    shareUrl: data.shareUrl,
  };
}
