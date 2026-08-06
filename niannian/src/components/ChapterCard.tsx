'use client';

interface ChapterCardProps {
  chapter: number;
  title: string;
  summary: string;
  timeline: Array<{ year: string; event: string }>;
  connectionAction: string;
  photoCount: number;
  sharing: boolean;
  regenerating?: boolean;
  onShare: () => void;
  onRegenerate?: () => void;
}

export default function ChapterCard({
  chapter,
  title,
  summary,
  timeline,
  connectionAction,
  sharing,
  regenerating = false,
  onShare,
  onRegenerate,
}: ChapterCardProps) {
  return (
    <section>
      {/* Chapter 标题 */}
      <div className="mb-6">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-2">
          Chapter {String(chapter).padStart(2, '0')}
        </p>
        <h2 className="text-xl font-serif font-bold text-[#4B3B2F] leading-snug">
          {title}
        </h2>
      </div>

      {/* 时间线 - 横向照片流 */}
      {timeline.length > 0 && (
        <div className="mb-8">
          <div className="flex items-start gap-3 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
            {timeline.map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center min-w-[80px] animate-fade-in-up"
                style={{ animationDelay: `${i * 0.2 + 0.3}s` }}
              >
                {/* 照片占位 */}
                <div className="w-20 h-20 rounded-2xl bg-[#F0E8D8] flex items-center justify-center mb-2 animate-photo-in"
                  style={{ animationDelay: `${i * 0.3}s` }}>
                  <span className="text-2xl">
                    {['🎂', '🌿', '🏡', '🎓', '🌸', '🌟', '🎉', '❤️'][i % 8]}
                  </span>
                </div>
                <span className="text-[10px] font-medium text-[#D98A45] mb-0.5">
                  {item.year}
                </span>
                <span className="text-[11px] text-[#8B7355] text-center leading-tight px-1">
                  {item.event.length > 8 ? item.event.slice(0, 8) + '…' : item.event}
                </span>
                {i < timeline.length - 1 && (
                  <span className="text-[#D8CCB8] text-xs mt-1">↓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 一句话 */}
      <div className="mb-8">
        <div className="border-l-[3px] border-[#D98A45] pl-4 py-1">
          <p className="text-[#8B7355] font-serif leading-relaxed text-[15px]">
            {summary}
          </p>
        </div>
      </div>

      {/* 连接建议 */}
      <div className="bg-[#FFF8F0] rounded-2xl p-5 mb-6 border border-[#F0DCC8]">
        <p className="text-sm text-[#8B7355] leading-relaxed mb-4">
          💡 {connectionAction}
        </p>

        <div className="flex flex-col gap-3 mt-2">
          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={regenerating || sharing}
              className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-[#D98A45] text-[#D98A45] text-base font-medium hover:bg-[#FFF8F0] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
            >
              {regenerating ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
                  AI 重新生成中…
                </>
              ) : (
                '🔄 重新生成故事'
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onShare}
            disabled={sharing || regenerating}
            className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#07C160] text-white text-base font-medium hover:bg-[#06AD56] disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm cursor-pointer touch-manipulation"
          >
            {sharing ? '生成中…' : '💬 分享给家人'}
          </button>
        </div>
        <p className="text-[10px] text-[#B8A898] mt-2 text-center">
          保存海报后，打开微信发送给好友或朋友圈
        </p>
      </div>

      {/* 章节分隔线 */}
      <div className="flex items-center gap-3 my-10">
        <div className="flex-1 h-px bg-[#E8DCC8]" />
        <span className="text-xs text-[#D8CCB8]">✦</span>
        <div className="flex-1 h-px bg-[#E8DCC8]" />
      </div>
    </section>
  );
}
