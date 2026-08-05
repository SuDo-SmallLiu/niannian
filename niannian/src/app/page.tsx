'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customMember, setCustomMember] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const PRESET_MEMBERS = ['爸爸', '妈妈', '孩子', '爷爷', '奶奶'];

  const allMembers = [
    ...selectedMembers,
    ...(customMember.trim() ? [customMember.trim()] : []),
  ];

  const toggleMember = (m: string) => {
    setSelectedMembers((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const addCustomMember = () => {
    if (customMember.trim() && !selectedMembers.includes(customMember.trim())) {
      setSelectedMembers((prev) => [...prev, customMember.trim()]);
      setCustomMember('');
    }
  };

  const handleCreate = async () => {
    setError('');
    if (!familyName.trim()) {
      setError('请为你的家庭起个名字');
      return;
    }
    if (allMembers.length === 0) {
      setError('请选择至少一位家庭成员');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName.trim(), members: allMembers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '创建失败');
        return;
      }
      router.push(`/family/${data.id}/upload`);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setCreating(false);
    }
  };

  if (showUpload) {
    return (
      <div className="min-h-screen px-6 pt-16 pb-8 animate-fade-in">
        {/* 返回 */}
        <button
          onClick={() => setShowUpload(false)}
          className="text-[#B8A898] hover:text-[#8B7355] transition-colors text-sm mb-8"
        >
          ← 返回
        </button>

        <div className="text-center mb-8">
          <p className="text-2xl font-serif text-[#4B3B2F] mb-2">创建家庭记忆</p>
          <p className="text-sm text-[#B8A898]">为家人建立一个专属的记忆空间</p>
        </div>

        {/* 家庭名称 */}
        <div className="mb-8">
          <label className="block text-sm text-[#8B7355] mb-2 font-medium">家庭名称</label>
          <input
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="例如：李家的故事"
            maxLength={20}
            className="w-full px-5 py-3.5 rounded-2xl bg-white border border-[#E8DCC8] text-[#4B3B2F] placeholder:text-[#D8CCB8] text-lg font-serif focus:outline-none focus:ring-2 focus:ring-[#D98A45]/20 focus:border-[#D98A45] transition-all"
          />
        </div>

        {/* 成员 */}
        <div className="mb-8">
          <label className="block text-sm text-[#8B7355] mb-3 font-medium">家庭成员</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_MEMBERS.map((m) => (
              <button
                key={m}
                onClick={() => toggleMember(m)}
                className={`px-4 py-2.5 rounded-xl text-sm transition-all ${
                  selectedMembers.includes(m)
                    ? 'bg-[#D98A45] text-white'
                    : 'bg-white text-[#8B7355] border border-[#E8DCC8] active:bg-[#FFF8F0]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={customMember}
              onChange={(e) => setCustomMember(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomMember()}
              placeholder="自定义…"
              className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-[#E8DCC8] text-sm placeholder:text-[#D8CCB8] focus:outline-none focus:ring-2 focus:ring-[#D98A45]/20 focus:border-[#D98A45]"
            />
            <button
              onClick={addCustomMember}
              disabled={!customMember.trim()}
              className="px-4 py-2.5 rounded-xl bg-[#FFF8F0] text-[#8B7355] text-sm disabled:opacity-30 active:bg-[#F0DCC8] transition-colors"
            >
              添加
            </button>
          </div>
          {allMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {allMembers.map((m) => (
                <span key={m} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFF8F0] text-sm text-[#8B7355]">
                  {m}
                  <button
                    onClick={() => setSelectedMembers((prev) => prev.filter((x) => x !== m))}
                    className="text-[#D8CCB8] hover:text-[#D98A45]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#FFF8F0] text-[#C04040] text-sm text-center">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={creating}
          className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg hover:bg-[#C47A3A] disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {creating ? '创建中...' : '开始上传照片'}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8 text-center">
      {/* 顶部 */}
      <div className="animate-fade-in-up delay-100 mb-3">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium">NIAN NIAN</p>
      </div>

      <div className="animate-fade-in-up delay-200 mb-2">
        <h1 className="text-[28px] font-serif font-bold text-[#4B3B2F] leading-tight tracking-wide">
          念念年年
        </h1>
      </div>

      <div className="animate-fade-in-up delay-300 mb-10">
        <p className="text-sm text-[#D8CCB8] leading-relaxed">
          岁岁年年
          <br />
          念念不忘
        </p>
      </div>

      {/* 主描述 */}
      <div className="animate-fade-in-up delay-400 mb-8">
        <p className="text-sm text-[#8B7355] leading-relaxed max-w-[240px]">
          AI 帮助你重新发现
          <br />
          属于家的故事
        </p>
      </div>

      {/* 大按钮 */}
      <div className="animate-fade-in-up delay-500 mb-6">
        <button
          onClick={() => setShowUpload(true)}
          className="w-40 h-40 rounded-full bg-[#D98A45] text-white flex flex-col items-center justify-center gap-1 animate-breathe hover:bg-[#C47A3A] transition-colors active:scale-95"
        >
          <span className="text-2xl">📷</span>
          <span className="text-sm font-medium">上传家庭照片</span>
        </button>
      </div>

      <p className="animate-fade-in-up delay-600 text-xs text-[#D8CCB8] mb-16">
        建议上传 20 张以上照片
      </p>

      {/* 三步说明 */}
      <div className="animate-fade-in-up delay-800 flex items-center gap-4 text-xs text-[#B8A898]">
        <span>AI 寻找人物</span>
        <span className="text-[#D8CCB8]">→</span>
        <span>AI 发现变化</span>
        <span className="text-[#D8CCB8]">→</span>
        <span>AI 整理故事</span>
      </div>

      {/* 底部文案 */}
      <p className="animate-fade-in-up delay-1000 mt-16 text-xs text-[#D8CCB8]">
        让每一张照片
        <br />
        都成为回家的理由
      </p>
    </div>
  );
}
