'use client';

import Timeline from './Timeline';

interface StoryCardProps {
  title: string;
  description: string;
  timeline: Array<{ year: string; event: string }>;
  connectionAction: string;
  photoCount: number;
  onShare: () => void;
  sharing: boolean;
  shareUrl: string | null;
}

export default function StoryCard({
  title,
  description,
  timeline,
  connectionAction,
  photoCount,
  onShare,
  sharing,
  shareUrl,
}: StoryCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e0d8] overflow-hidden">
      {/* 标题区 */}
      <div className="p-8 pb-6 border-b border-[#f0ebe4]">
        <div className="flex items-center gap-2 text-xs text-[#d4786e] font-medium tracking-wider mb-3">
          <span>📖</span>
          <span>念念生成的家庭记忆</span>
          <span className="text-[#b8afa6]">· 基于 {photoCount} 张照片</span>
        </div>

        <h1 className="text-2xl font-medium text-[#2d2a26] leading-snug mb-1">
          {title}
        </h1>
      </div>

      {/* 时间线 */}
      <div className="p-8 pb-6 border-b border-[#f0ebe4]">
        <h2 className="text-sm font-medium text-[#8b8178] mb-4 flex items-center gap-2">
          <span>⏳</span> 时间线
        </h2>
        <Timeline items={timeline} />
      </div>

      {/* 情感总结 */}
      <div className="p-8 pb-6 border-b border-[#f0ebe4]">
        <h2 className="text-sm font-medium text-[#8b8178] mb-3 flex items-center gap-2">
          <span>💭</span> 情感总结
        </h2>
        <p className="text-[#2d2a26] leading-relaxed text-lg">{description}</p>
      </div>

      {/* 连接建议 */}
      <div className="p-8">
        <h2 className="text-sm font-medium text-[#8b8178] mb-3 flex items-center gap-2">
          <span>💡</span> 连接建议
        </h2>
        <div className="bg-[#faf8f5] rounded-xl p-5 border border-[#f0ebe4]">
          <p className="text-[#2d2a26] leading-relaxed mb-4">{connectionAction}</p>

          {shareUrl ? (
            // 已生成分享链接
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-[#e8e0d8]">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-[#2d2a26] outline-none"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                  className="px-4 py-1.5 rounded-lg bg-[#f0ebe4] text-sm text-[#2d2a26] hover:bg-[#e8d8cc] transition-all whitespace-nowrap"
                >
                  复制链接
                </button>
              </div>
              <p className="text-xs text-[#8b8178]">
                将链接发送给家人，他们可以直接查看这个家庭故事
              </p>
            </div>
          ) : (
            // 生成分享按钮
            <button
              onClick={onShare}
              disabled={sharing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#d4786e] text-white font-medium hover:bg-[#c0655a] disabled:opacity-50 transition-all shadow-md shadow-[#d4786e]/20"
            >
              {sharing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <span>🔗</span>
                  生成分享卡片
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
