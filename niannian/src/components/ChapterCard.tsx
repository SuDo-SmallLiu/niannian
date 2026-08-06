'use client';

import SharePosterCard from '@/components/SharePosterCard';

interface ChapterCardProps {
  chapter: number;
  title: string;
  summary: string;
  familyName: string;
  photoUrls: string[];
  sharing: boolean;
  regenerating?: boolean;
  deleting?: boolean;
  onShare: () => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export default function ChapterCard({
  chapter,
  title,
  summary,
  familyName,
  photoUrls,
  sharing,
  regenerating = false,
  deleting = false,
  onShare,
  onRegenerate,
  onDelete,
}: ChapterCardProps) {
  return (
    <section className="mb-10">
      <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-3 text-center">
        Chapter {String(chapter).padStart(2, '0')}
      </p>

      <SharePosterCard
        type="story"
        title={title}
        summary={summary}
        familyName={familyName}
        photoUrls={photoUrls}
      />

      <div className="mt-4 flex flex-col gap-3">
        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating || sharing || deleting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-[#D98A45] text-[#D98A45] text-sm font-medium hover:bg-[#FFF8F0] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
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
          disabled={sharing || regenerating || deleting}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#07C160] text-white text-sm font-medium hover:bg-[#06AD56] disabled:opacity-50 transition-all active:scale-[0.98] shadow-sm touch-manipulation"
        >
          {sharing ? '生成海报中…' : '💬 分享给家人'}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={sharing || regenerating || deleting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-all touch-manipulation"
          >
            {deleting ? '删除中…' : '🗑 删除故事'}
          </button>
        )}
      </div>
    </section>
  );
}
