'use client';

import SharePosterCard from '@/components/SharePosterCard';

interface ChapterCardProps {
  chapter: number;
  title: string;
  summary: string;
  familyName: string;
  photoUrls: string[];
  published?: boolean;
  sharing: boolean;
  regenerating?: boolean;
  deleting?: boolean;
  publishing?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  onShare: () => void;
  onRegenerate?: () => void;
  onPublish?: () => void;
  onViewDetail?: () => void;
  onDelete?: () => void;
}

export default function ChapterCard({
  chapter,
  title,
  summary,
  familyName,
  photoUrls,
  published = false,
  sharing,
  regenerating = false,
  deleting = false,
  publishing = false,
  editing = false,
  onEdit,
  onShare,
  onRegenerate,
  onPublish,
  onViewDetail,
  onDelete,
}: ChapterCardProps) {
  return (
    <section className="mb-10">
      <div className="flex items-center justify-center gap-2 mb-3">
        <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium">
          章节 {String(chapter).padStart(2, '0')}
        </p>
        {published ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
            已发布
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            草稿
          </span>
        )}
      </div>

      <SharePosterCard
        type="story"
        title={title}
        summary={summary}
        familyName={familyName}
        photoUrls={photoUrls}
        onClick={onViewDetail}
      />

      <div className="mt-4 flex flex-col gap-3">
        {onViewDetail && (
          <button
            type="button"
            onClick={onViewDetail}
            disabled={sharing || regenerating || deleting || editing}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#4B3B2F] text-white text-sm font-medium hover:bg-[#3B2F25] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            查看章节详情
          </button>
        )}

        {onPublish && !published && (
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing || sharing || regenerating || deleting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {publishing ? '发布中…' : '📢 发布到故事页签'}
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={sharing || regenerating || deleting || editing}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border-2 border-[#D98A45] text-[#D98A45] text-sm font-medium hover:bg-[#FFF8F0] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {editing ? '编辑中…' : '✏️ 编辑故事'}
          </button>
        )}

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating || sharing || deleting}
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-[#E8DCC8] text-[#8B7355] text-sm font-medium hover:border-[#D98A45]/40 disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {regenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
                念念重新生成中…
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
