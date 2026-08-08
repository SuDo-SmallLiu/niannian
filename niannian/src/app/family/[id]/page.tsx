'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import { useAutoGenerateFamilyStory } from '@/hooks/useAutoGenerateFamilyStory';

interface FamilyDetail {
  id: string;
  name: string;
  members: string[];
  photo_count: number;
  story_count: number;
}

export default function FamilyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const actionGenerate = searchParams.get('action') === 'generate';

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingMovie, setGeneratingMovie] = useState(false);
  const [storyBannerDismissed, setStoryBannerDismissed] = useState(false);
  const generateSectionRef = useRef<HTMLDivElement>(null);
  const { confirm, showLoading, hideLoading, alert } = useAppDialog();
  const { generateStories, generating, error: generateError } =
    useAutoGenerateFamilyStory(familyId);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/family');
        const data = await res.json();
        const found = (data.families || []).find((f: FamilyDetail) => f.id === familyId);
        setFamily(found || null);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [familyId]);

  useEffect(() => {
    if (!loading && actionGenerate && generateSectionRef.current) {
      generateSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [loading, actionGenerate]);

  const handleGenerateMovie = async () => {
    if (!family || generatingMovie) return;
    const ok = await confirm({
      title: '生成人生电影？',
      description: '将把家庭下所有故事按主题串联成一部可播放的 H5 人生电影。',
      confirmText: '开始生成',
      cancelText: '取消',
    });
    if (!ok) return;

    setGeneratingMovie(true);
    showLoading('正在编排人生电影', '串联故事章节，完成后即可播放…');
    try {
      const res = await fetch('/api/movie/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成失败');
      router.push(`/movies/${data.movieId}/play`);
    } catch (err) {
      await alert({
        title: '生成失败',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      hideLoading();
      setGeneratingMovie(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F4ED] px-8">
        <p className="text-[#8B7355] mb-4">家庭不存在</p>
        <Link href="/family" className="text-sm text-[#D98A45] underline underline-offset-2">
          返回主题列表
        </Link>
      </div>
    );
  }

  const actions = [
    {
      icon: '📸',
      title: '上传照片',
      desc: '批量上传家庭照片',
      href: `/family/${familyId}/upload`,
      color: 'bg-[#FFF8F0] border-[#F0DCC8]',
    },
    {
      icon: '🧠',
      title: '念念解析',
      desc: '让念念理解每张照片',
      href: `/family/${familyId}/analyze`,
      color: 'bg-[#FFF8F0] border-[#F0DCC8]',
    },
    {
      icon: '🃏',
      title: '记忆卡',
      desc: '查看每张照片的记忆',
      href: `/family/${familyId}/photos`,
      color: 'bg-white border-[#E8DCC8]',
    },
    {
      icon: '📖',
      title: '故事草稿箱',
      desc:
        (family?.story_count || 0) > 0
          ? `已生成 ${family?.story_count} 个草稿，点击管理`
          : '补充记忆后，生成完整家庭故事',
      href: `/family/${familyId}/story`,
      color:
        (family?.story_count || 0) > 0
          ? 'bg-[#FFF8F0] border-[#D98A45]/40 ring-1 ring-[#D98A45]/20'
          : 'bg-white border-[#E8DCC8]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-24">
      <button
        onClick={() => router.push('/family')}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 transition-colors"
      >
        ← 我的主题
      </button>

      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">{family.name}</h1>
        <div className="flex flex-wrap justify-center gap-1.5 mb-4">
          {family.members.map((m) => (
            <span
              key={m}
              className="px-2.5 py-1 rounded-full bg-white text-xs text-[#8B7355] border border-[#E8DCC8]"
            >
              {m}
            </span>
          ))}
        </div>
        <div className="flex justify-center gap-6 text-sm text-[#B8A898]">
          <span>📷 {family.photo_count || 0} 张照片</span>
          <span>📖 {family.story_count || 0} 个故事</span>
        </div>
      </div>

      {(family.story_count || 0) > 0 && !storyBannerDismissed && (
        <div className="mb-6 animate-fade-in-up delay-75 rounded-2xl border border-[#D98A45]/30 bg-[#FFF8F0] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">📖</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#4B3B2F]">
                已为您生成{family.story_count === 1 ? '一个故事' : ` ${family.story_count} 个故事`}
              </p>
              <p className="text-xs text-[#B8A898] mt-1">
                在「家庭故事」里可以阅读、编辑和分享
              </p>
              <Link
                href={`/family/${familyId}/story`}
                className="inline-flex items-center gap-1 mt-3 text-sm font-medium text-[#D98A45] hover:text-[#C47A3A] transition-colors"
              >
                要不要去看看 →
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setStoryBannerDismissed(true)}
              className="text-[#D8CCB8] hover:text-[#B8A898] text-lg leading-none shrink-0"
              aria-label="关闭提示"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {(family.photo_count || 0) > 0 && (family.story_count || 0) === 0 && (
        <div
          ref={generateSectionRef}
          className={`mb-6 animate-fade-in-up delay-75 ${actionGenerate ? 'ring-2 ring-[#D98A45]/40 rounded-2xl p-1' : ''}`}
        >
          <button
            type="button"
            onClick={() => generateStories({ existingCount: family.story_count || 0 })}
            disabled={generating}
            className="block w-full rounded-2xl py-4 px-5 bg-[#D98A45] text-white font-medium text-center shadow-sm hover:bg-[#C47A3A] disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {generating ? '念念撰写中…' : '✨ 念念自动生成故事'}
          </button>
          <p className="text-xs text-center text-[#B8A898] mt-2">
            或到记忆卡页面选择「人工组合故事」
          </p>
          {generateError && (
            <p className="text-xs text-center text-red-500 mt-2">{generateError}</p>
          )}
        </div>
      )}

      {(family.story_count || 0) > 0 && (
        <div className="mb-6 animate-fade-in-up delay-75">
          <button
            type="button"
            onClick={handleGenerateMovie}
            disabled={generatingMovie}
            className="w-full rounded-2xl py-4 px-5 bg-[#4B3B2F] text-white font-medium shadow-sm hover:bg-[#3B2F25] disabled:opacity-60 transition-all active:scale-[0.99]"
          >
            {generatingMovie ? '正在生成…' : '🎬 生成人生电影（H5 播放）'}
          </button>
          <p className="text-xs text-center text-[#B8A898] mt-2">
            将 {family.story_count} 个故事串联为沉浸式人生电影
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 animate-fade-in-up delay-100">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`rounded-2xl p-5 border shadow-sm hover:shadow-md hover:border-[#D98A45]/30 transition-all active:scale-[0.98] ${action.color}`}
          >
            <div className="text-2xl mb-2">{action.icon}</div>
            <h3 className="text-sm font-medium text-[#4B3B2F] mb-0.5">{action.title}</h3>
            <p className="text-xs text-[#B8A898]">{action.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
