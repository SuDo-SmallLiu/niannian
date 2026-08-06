'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

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
