'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import MemoryCardComposeItem, {
  getMemoryCardComposeHints,
} from '@/components/MemoryCardComposeItem';

interface MemoryCardData {
  analysis_status?: string;
  action?: string;
  taken_at?: string;
  location?: string;
  people?: string[];
  significance?: string;
  understanding?: {
    archetype?: string;
    emotions?: string[];
  } | null;
  narrative_frame?: {
    storyline?: string;
    storylineNote?: string;
    shotType?: string;
  } | null;
  story_layer?: {
    scene_type?: string;
    meaning?: string;
    relationship?: string;
    change?: string;
    importance?: number;
  } | null;
}

interface AnalyzedPhoto {
  id: string;
  url: string;
  memoryCard?: MemoryCardData | null;
}

export default function ManualStoryComposePage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const [photos, setPhotos] = useState<AnalyzedPhoto[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/photos?familyId=${familyId}`);
        const data = await res.json();
        const analyzed = (data.photos || []).filter(
          (p: AnalyzedPhoto) => p.memoryCard?.analysis_status === 'analyzed'
        );
        setPhotos(analyzed);
      } catch {
        setError('加载照片失败');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [familyId]);

  const selectedPhotos = useMemo(
    () => selectedIds.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as AnalyzedPhoto[],
    [selectedIds, photos]
  );

  const togglePhoto = (photoId: string) => {
    setSelectedIds((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeFromSelected = (photoId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== photoId));
  };

  const handleGenerate = async () => {
    if (selectedIds.length === 0) {
      setError('请至少选择一张照片');
      return;
    }
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/story/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, photoIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      router.push(`/family/${familyId}/story?storyId=${data.storyId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-[22rem]">
      <Link
        href={`/family/${familyId}/story`}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 inline-block"
      >
        ← 家庭故事
      </Link>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">人工组合故事</h1>
        <p className="text-sm text-[#B8A898] leading-relaxed">
          参考 AI 解析提示选片、排序，再生成故事
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#8B7355] mb-4">没有已解析的照片</p>
          <Link
            href={`/family/${familyId}/analyze`}
            className="text-sm text-[#D98A45] underline underline-offset-2"
          >
            先去 AI 解析
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-[#B8A898] mb-3">
            点击卡片选择 · 已选 {selectedIds.length} 张 · 橙色标签为 AI 编排提示
          </p>
          <div className="space-y-3 max-w-lg mx-auto">
            {photos.map((photo) => {
              const selected = selectedIds.includes(photo.id);
              const order = selected ? selectedIds.indexOf(photo.id) + 1 : undefined;
              const hints = getMemoryCardComposeHints(photo.memoryCard);

              return (
                <MemoryCardComposeItem
                  key={photo.id}
                  photoUrl={photo.url}
                  hints={hints}
                  selected={selected}
                  order={order}
                  onClick={() => togglePhoto(photo.id)}
                />
              );
            })}
          </div>
        </>
      )}

      {selectedPhotos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8DCC8] px-4 pt-4 pb-6 shadow-lg max-h-[50vh] flex flex-col">
          <p className="text-xs text-[#B8A898] mb-2 shrink-0">
            故事顺序（↑↓ 调整 · 参考 AI 提示编排节奏）
          </p>
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide shrink-0">
            {selectedPhotos.map((photo, index) => {
              const hints = getMemoryCardComposeHints(photo.memoryCard);
              return (
                <div key={photo.id} className="shrink-0 w-[100px]">
                  <div className="relative rounded-lg overflow-hidden aspect-square mb-1 border-2 border-[#D98A45]/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#D98A45] text-white text-[10px] font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromSelected(photo.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-[10px]"
                    >
                      ✕
                    </button>
                  </div>
                  {hints.tags[0] && (
                    <p className="text-[9px] text-[#D98A45] text-center line-clamp-1 mb-0.5">
                      {hints.tags[0]}
                    </p>
                  )}
                  <div className="flex justify-center gap-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => movePhoto(index, -1)}
                      className="px-2 py-0.5 rounded bg-[#F8F4ED] text-xs text-[#8B7355] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={index === selectedPhotos.length - 1}
                      onClick={() => movePhoto(index, 1)}
                      className="px-2 py-0.5 rounded bg-[#F8F4ED] text-xs text-[#8B7355] disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <p className="text-xs text-red-500 mb-2 text-center shrink-0">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || selectedIds.length === 0}
            className="w-full py-3.5 rounded-2xl bg-[#D98A45] text-white font-medium disabled:opacity-50 shrink-0"
          >
            {generating ? 'AI 撰写中…' : `生成故事（${selectedIds.length} 张照片）`}
          </button>
        </div>
      )}
    </div>
  );
}
