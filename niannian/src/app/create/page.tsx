'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

const PRESET_MEMBERS = ['爸爸', '妈妈', '孩子', '爷爷', '奶奶', '外公', '外婆'];

export default function CreateFamilyPage() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [customMember, setCustomMember] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allMembers = [
    ...selectedMembers,
    ...(customMember.trim() ? [customMember.trim()] : []),
  ];

  const toggleMember = (member: string) => {
    setSelectedMembers((prev) =>
      prev.includes(member) ? prev.filter((m) => m !== member) : [...prev, member]
    );
  };

  const addCustomMember = () => {
    if (customMember.trim() && !selectedMembers.includes(customMember.trim())) {
      setSelectedMembers((prev) => [...prev, customMember.trim()]);
      setCustomMember('');
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!familyName.trim()) {
      setError('请输入家庭名称');
      return;
    }

    if (allMembers.length === 0) {
      setError('请至少选择一位家庭成员');
      return;
    }

    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-start justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          {/* 标题 */}
          <div className="text-center mb-10">
            <h1 className="text-2xl font-medium text-[#2d2a26] mb-2">
              创建家庭空间
            </h1>
            <p className="text-sm text-[#8b8178]">
              为你的家庭记忆创建一个专属空间
            </p>
          </div>

          {/* 家庭名称 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-[#2d2a26] mb-2">
              家庭名称
            </label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder='例如："李家的故事"'
              className="w-full px-4 py-3 rounded-xl border border-[#e8e0d8] bg-white text-[#2d2a26] placeholder:text-[#b8afa6] focus:outline-none focus:ring-2 focus:ring-[#d4786e]/30 focus:border-[#d4786e] transition-all"
              maxLength={30}
            />
          </div>

          {/* 家庭成员 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-[#2d2a26] mb-3">
              家庭成员
            </label>
            <div className="flex flex-wrap gap-2 mb-4">
              {PRESET_MEMBERS.map((member) => (
                <button
                  key={member}
                  onClick={() => toggleMember(member)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedMembers.includes(member)
                      ? 'bg-[#d4786e] text-white shadow-sm'
                      : 'bg-white text-[#8b8178] border border-[#e8e0d8] hover:border-[#d4786e]/50 hover:text-[#d4786e]'
                  }`}
                >
                  {member}
                </button>
              ))}
            </div>

            {/* 自定义成员 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customMember}
                onChange={(e) => setCustomMember(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCustomMember()}
                placeholder="自定义角色（如：姑姑、舅舅）"
                className="flex-1 px-4 py-2 rounded-xl border border-[#e8e0d8] bg-white text-[#2d2a26] placeholder:text-[#b8afa6] text-sm focus:outline-none focus:ring-2 focus:ring-[#d4786e]/30 focus:border-[#d4786e] transition-all"
              />
              <button
                onClick={addCustomMember}
                disabled={!customMember.trim()}
                className="px-4 py-2 rounded-xl bg-[#f0ebe4] text-[#2d2a26] text-sm font-medium hover:bg-[#e8d8cc] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                添加
              </button>
            </div>

            {/* 已选成员展示 */}
            {allMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#f0ebe4]">
                <p className="text-xs text-[#8b8178] mb-2">
                  已选择 {allMembers.length} 位成员：
                </p>
                <div className="flex flex-wrap gap-1">
                  {allMembers.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f0ebe4] text-sm text-[#2d2a26]"
                    >
                      {m}
                      <button
                        onClick={() =>
                          setSelectedMembers((prev) => prev.filter((x) => x !== m))
                        }
                        className="text-[#b8afa6] hover:text-[#d4786e] ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-4 rounded-full bg-[#d4786e] text-white font-medium text-lg hover:bg-[#c0655a] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#d4786e]/20"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                创建中...
              </span>
            ) : (
              '开始上传照片'
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
