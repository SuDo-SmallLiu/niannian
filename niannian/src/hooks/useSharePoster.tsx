'use client';

import { useState, useCallback } from 'react';
import SharePosterModal from '@/components/SharePosterModal';
import type { PosterInput } from '@/lib/share-poster';

interface UseSharePosterOptions {
  type: 'story' | 'memory';
  storyId?: string;
  photoId?: string;
  title: string;
  subtitle?: string;
  summary: string;
  familyName: string;
  photoUrls: string[];
}

export function useSharePoster() {
  const [open, setOpen] = useState(false);
  const [poster, setPoster] = useState<PosterInput | null>(null);
  const [loading, setLoading] = useState(false);

  const toAbsoluteUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const openSharePoster = useCallback(async (options: UseSharePosterOptions) => {
    setLoading(true);
    try {
      const body =
        options.type === 'story'
          ? { storyId: options.storyId }
          : { photoId: options.photoId };

      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建分享失败');

      setPoster({
        type: options.type,
        title: options.title,
        subtitle: options.subtitle,
        summary: options.summary,
        familyName: options.familyName,
        photoUrls: options.photoUrls.map(toAbsoluteUrl),
        shareUrl: data.shareUrl,
      });
      setOpen(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : '分享失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  const modal = (
    <SharePosterModal open={open} onClose={() => setOpen(false)} poster={poster} />
  );

  return { openSharePoster, loading, modal };
}
