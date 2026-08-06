'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Tag {
  layer: number;
  key: string;
  value: string;
}

interface MemoryCardDetail {
  photo: {
    id: string;
    url: string;
    original_name: string;
    people: string[];
    location: string;
    event: string;
    taken_at: string;
  };
  memoryCard: {
    taken_at: string;
    location: string;
    people: string[];
    action: string;
    emotions: string[];
    changes: string[];
    significance: string;
    analysis_status: string;
  } | null;
  tags: Tag[];
}

const LAYER_NAMES: Record<number, { label: string; color: string }> = {
  1: { label: '客观标签', color: 'bg-blue-50 text-blue-700' },
  2: { label: '行为标签', color: 'bg-green-50 text-green-700' },
  3: { label: '变化标签', color: 'bg-purple-50 text-purple-700' },
  4: { label: '家庭价值', color: 'bg-amber-50 text-amber-700' },
};

export default function MemoryCardPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;
  const photoId = params.photoId as string;

  const [data, setData] = useState<MemoryCardDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/memory-card?photoId=${photoId}`);
        const result = await res.json();
        if (res.ok) setData(result);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [photoId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F4ED] px-8">
        <p className="text-[#8B7355] mb-4">记忆卡不存在</p>
        <button
          onClick={() => router.push(`/family/${familyId}/photos`)}
          className="text-sm text-[#D98A45] underline underline-offset-2"
        >
          返回照片库
        </button>
      </div>
    );
  }

  const { photo, memoryCard, tags } = data;
  const tagsByLayer = tags.reduce<Record<number, Tag[]>>((acc, tag) => {
    if (!acc[tag.layer]) acc[tag.layer] = [];
    acc[tag.layer].push(tag);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8F4ED] pb-24">
      <div className="px-6 pt-8">
        <button
          onClick={() => router.push(`/family/${familyId}/photos`)}
          className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-4 transition-colors"
        >
          ← 记忆卡列表
        </button>
      </div>

      {/* 照片 */}
      <div className="px-6 mb-6 animate-fade-in-up">
        <div className="rounded-2xl overflow-hidden shadow-md">
          <img src={photo.url} alt={photo.original_name} className="w-full aspect-[4/3] object-cover" />
        </div>
        <p className="text-xs text-[#D8CCB8] mt-2 text-center">{photo.original_name}</p>
      </div>

      {!memoryCard ? (
        <div className="px-6 text-center py-12">
          <p className="text-[#B8A898] mb-4">这张照片还没有被 AI 解析</p>
          <button
            onClick={() => router.push(`/family/${familyId}/analyze`)}
            className="px-6 py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium"
          >
            开始 AI 解析
          </button>
        </div>
      ) : (
        <div className="px-6 space-y-4 animate-fade-in-up delay-100">
          {/* 事实层 */}
          <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
            <h2 className="text-xs tracking-wider text-[#D98A45] font-medium mb-3">事实层</h2>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">时间</span>
                <span className="text-[#4B3B2F]">{memoryCard.taken_at || photo.taken_at || '未知'}</span>
              </div>
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">地点</span>
                <span className="text-[#4B3B2F]">{memoryCard.location || photo.location || '未知'}</span>
              </div>
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">人物</span>
                <span className="text-[#4B3B2F]">{memoryCard.people.join('、') || '未知'}</span>
              </div>
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">动作</span>
                <span className="text-[#4B3B2F]">{memoryCard.action || photo.event || '未知'}</span>
              </div>
            </div>
          </section>

          {/* 理解层 */}
          <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
            <h2 className="text-xs tracking-wider text-[#D98A45] font-medium mb-3">理解层 · AI 推测</h2>
            {memoryCard.emotions.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#B8A898] mb-1.5">可能情绪</p>
                <div className="flex flex-wrap gap-1.5">
                  {memoryCard.emotions.map((e) => (
                    <span key={e} className="px-2.5 py-1 rounded-full bg-[#FFF8F0] text-xs text-[#D98A45]">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {memoryCard.changes.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#B8A898] mb-1.5">变化</p>
                <div className="flex flex-wrap gap-1.5">
                  {memoryCard.changes.map((c) => (
                    <span key={c} className="px-2.5 py-1 rounded-full bg-purple-50 text-xs text-purple-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {memoryCard.significance && (
              <div className="border-l-[3px] border-[#D98A45] pl-3">
                <p className="text-sm text-[#8B7355] font-serif leading-relaxed">
                  {memoryCard.significance}
                </p>
              </div>
            )}
          </section>

          {/* 四层标签 */}
          {Object.keys(tagsByLayer).length > 0 && (
            <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
              <h2 className="text-xs tracking-wider text-[#D98A45] font-medium mb-3">标签系统</h2>
              <div className="space-y-3">
                {Object.entries(tagsByLayer).map(([layer, layerTags]) => {
                  const info = LAYER_NAMES[Number(layer)];
                  return (
                    <div key={layer}>
                      <p className="text-xs text-[#B8A898] mb-1.5">{info?.label || `第${layer}层`}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {layerTags.map((tag, i) => (
                          <span
                            key={`${tag.key}-${tag.value}-${i}`}
                            className={`px-2.5 py-1 rounded-full text-xs ${info?.color || 'bg-gray-50 text-gray-700'}`}
                          >
                            {tag.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sprint 2 预告 */}
          <section className="bg-[#FFF8F0] rounded-2xl p-5 border border-dashed border-[#F0DCC8]">
            <p className="text-xs text-[#B8A898] text-center">
              💬 Sprint 2 将支持补充信息和 AI 提问
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
