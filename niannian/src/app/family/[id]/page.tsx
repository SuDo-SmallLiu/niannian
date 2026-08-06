'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAppDialog } from '@/components/providers/app-dialog-provider';

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
  const familyId = params.id as string;

  const [family, setFamily] = useState<FamilyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generatingMovie, setGeneratingMovie] = useState(false);
  const { confirm, showLoading, hideLoading, alert } = useAppDialog();

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

  const handleGenerateStories = async () => {
    if (!family || generating) return;
    const ok = await confirm({
      title: '自动发现故事？',
      description:
        '将根据已解析的记忆卡自动发现 3–5 个主题故事，并替换当前家庭下的旧故事。此操作不可撤销。',
      confirmText: '开始发现',
      cancelText: '再想想',
    });
    if (!ok) return;

    setGenerating(true);
    setGenerateError('');
    showLoading('正在发现故事', 'AI 正在聚类并撰写，请稍候…');
    try {
      const res = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, replaceExisting: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '生成失败');
      }
      router.push(`/family/${familyId}/story`);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '生成失败');
    } finally {
      hideLoading();
      setGenerating(false);
    }
  };

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
    showLoading('正在编排人生电影', '串联故事章节中…');
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
          返回家庭列表
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
      title: 'AI 解析',
      desc: '让 AI 理解每张照片',
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
      title: '家庭故事',
      desc: 'AI 生成的家庭故事',
      href: `/family/${familyId}/story`,
      color: 'bg-white border-[#E8DCC8]',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F4ED] px-6 pt-8 pb-24">
      <button
        onClick={() => router.push('/family')}
        className="text-[#B8A898] hover:text-[#8B7355] text-sm mb-6 transition-colors"
      >
        ← 我的家庭
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

      {(family.photo_count || 0) > 0 && (
        <div className="mb-6 animate-fade-in-up delay-75">
          <button
            type="button"
            onClick={handleGenerateStories}
            disabled={generating}
            className="w-full rounded-2xl py-4 px-5 bg-[#D98A45] text-white font-medium shadow-sm hover:bg-[#C47A3A] disabled:opacity-60 transition-all active:scale-[0.99]"
          >
            {generating ? '正在发现故事…' : '✨ 发现故事（Life Story Engine）'}
          </button>
          <p className="text-xs text-center text-[#B8A898] mt-2">
            从已解析记忆卡中聚类生成 3–5 个主题故事
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
