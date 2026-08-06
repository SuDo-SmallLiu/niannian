'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface AnalyzedPhoto {
  id: string;
  url: string;
  memoryCard?: {
    analysis_status?: string;
    action?: string;
    taken_at?: string;
    location?: string;
    significance?: string;
  } | null;
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
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-36">
      <Link
        href={`/family/${familyId}/story`}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 inline-block"
      >
        ← 家庭故事
      </Link>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">人工组合故事</h1>
        <p className="text-sm text-[#B8A898] leading-relaxed">
          选择照片并调整顺序，AI 将按你的编排生成一个故事
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
            点击选择 · 已选 {selectedIds.length} 张
          </p>
          <div className="grid grid-cols-3 gap-2 mb-8">
            {photos.map((photo) => {
              const selected = selectedIds.includes(photo.id);
              const order = selectedIds.indexOf(photo.id);
              return (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => togglePhoto(photo.id)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all ${
                    selected
                      ? 'border-[#D98A45] ring-2 ring-[#D98A45]/30'
                      : 'border-transparent'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  {selected && (
                    <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-[#D98A45] text-white text-xs font-medium flex items-center justify-center">
                      {order + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selectedPhotos.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8DCC8] px-4 pt-4 pb-6 shadow-lg">
          <p className="text-xs text-[#B8A898] mb-2">故事顺序（点击 ↑↓ 调整）</p>
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {selectedPhotos.map((photo, index) => (
              <div key={photo.id} className="shrink-0 w-20">
                <div className="relative rounded-lg overflow-hidden aspect-square mb-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeFromSelected(photo.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white text-[10px]"
                  >
                    ✕
                  </button>
                </div>
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
            ))}
          </div>

          {error && <p className="text-xs text-red-500 mb-2 text-center">{error}</p>}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || selectedIds.length === 0}
            className="w-full py-3.5 rounded-2xl bg-[#D98A45] text-white font-medium disabled:opacity-50"
          >
            {generating ? 'AI 撰写中…' : `生成故事（${selectedIds.length} 张照片）`}
          </button>
        </div>
      )}
    </div>
  );
}
