'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface PhotoItem {
  id: string;
  url: string;
  original_name: string;
  people: string[];
  location: string;
  event: string;
  memoryCard: {
    analysis_status: string;
    emotions: string[];
    significance: string;
  } | null;
}

  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/photos?familyId=${familyId}`);
        const data = await res.json();
        setPhotos(data.photos || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [familyId]);

  const analyzedCount = photos.filter((p) => p.memoryCard?.analysis_status === 'analyzed').length;

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-24">
      <button
        onClick={() => router.push(`/family/${familyId}`)}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 transition-colors"
      >
        ← 返回
      </button>

      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-serif text-[#4B3B2F] mb-1">记忆卡</h1>
        <p className="text-sm text-[#B8A898]">
          {photos.length > 0
            ? `${analyzedCount}/${photos.length} 张已解析`
            : '上传照片后 AI 会生成记忆卡'}
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      ) : photos.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-4">🃏</p>
          <p className="text-[#B8A898] mb-4">还没有照片</p>
          <Link
            href={`/family/${familyId}/upload`}
            className="inline-block px-6 py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium"
          >
            去上传照片
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-100">
          {photos.map((photo) => (
            <Link
              key={photo.id}
              href={`/family/${familyId}/photos/${photo.id}`}
              className="bg-white rounded-2xl overflow-hidden border border-[#E8DCC8] shadow-sm hover:shadow-md hover:border-[#D98A45]/30 transition-all active:scale-[0.98]"
            >
              <div className="aspect-square relative bg-[#F0E8D8]">
                <img
                  src={photo.url}
                  alt={photo.original_name}
                  className="w-full h-full object-cover"
                />
                {photo.memoryCard?.analysis_status === 'analyzed' ? (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-[#D98A45] text-white text-[10px]">
                    已解析
                  </span>
                ) : (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
                    待解析
                  </span>
                )}
              </div>
              <div className="p-3">
                {photo.memoryCard ? (
                  <>
                    <p className="text-xs text-[#4B3B2F] font-medium truncate">
                      {photo.people.join('、') || '未知人物'}
                    </p>
                    <p className="text-[10px] text-[#B8A898] truncate mt-0.5">
                      {photo.location || photo.event || '点击查看记忆卡'}
                    </p>
                    {photo.memoryCard.emotions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {photo.memoryCard.emotions.slice(0, 2).map((e) => (
                          <span
                            key={e}
                            className="px-1.5 py-0.5 rounded-full bg-[#FFF8F0] text-[10px] text-[#D98A45]"
                          >
                            {e}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-[#B8A898]">等待 AI 解析</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {photos.length > 0 && analyzedCount < photos.length && (
        <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
          <div className="max-w-md mx-auto">
            <Link
              href={`/family/${familyId}/analyze`}
              className="block w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg text-center hover:bg-[#C47A3A] transition-all shadow-lg shadow-[#D98A45]/20"
            >
              开始 AI 解析
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
