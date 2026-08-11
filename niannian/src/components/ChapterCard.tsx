'use client';

import StoryListCard from '@/components/StoryListCard';
import {
  DeleteIcon,
  EditIcon,
  NavStoryIcon,
  RefreshIcon,
  ShareIcon,
} from '@/components/icons/NianNianIcons';

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
  const memoryCount = photoUrls.filter(Boolean).length;

  return (
    <section className="mb-10">
      <StoryListCard
        title={title}
        summary={summary}
        photoUrls={photoUrls}
        memoryCount={memoryCount}
        chapter={chapter}
        status={published ? 'published' : 'draft'}
        onClick={onViewDetail}
      />

      <div className="mt-4 flex flex-col gap-3">
        {onViewDetail && (
          <button
            type="button"
            onClick={onViewDetail}
            disabled={sharing || regenerating || deleting || editing}
            className="w-full h-[52px] inline-flex items-center justify-center gap-2 rounded-2xl bg-[#DF8B3A] text-white text-base font-medium hover:bg-[#C47A3A] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            <NavStoryIcon size={18} />
            查看故事详情
          </button>
        )}

        {onPublish && !published && (
          <button
            type="button"
            onClick={onPublish}
            disabled={publishing || sharing || regenerating || deleting}
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#4A3326] text-white text-base font-medium hover:bg-[#3B2A20] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {publishing ? '发布中…' : '发布到故事页签'}
          </button>
        )}

        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            disabled={sharing || regenerating || deleting || editing}
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DF8B3A] text-[#DF8B3A] text-base font-medium hover:bg-[#FFF6EB] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {editing ? '编辑中…' : (
              <>
                <EditIcon size={18} /> 编辑故事
              </>
            )}
          </button>
        )}

        {onRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={regenerating || sharing || deleting}
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#EFE4D6] text-[#8E7B6B] text-base font-medium hover:border-[#DF8B3A]/40 disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {regenerating ? (
              <>
                <span className="w-4 h-4 border-2 border-[#DF8B3A]/30 border-t-[#DF8B3A] rounded-full animate-spin" />
                念念重新生成中…
              </>
            ) : (
              <>
                <RefreshIcon size={18} /> 重新生成故事
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onShare}
          disabled={sharing || regenerating || deleting}
          className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#22C55E] text-white text-base font-medium hover:bg-[#16A34A] disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
        >
          {sharing ? '生成海报中…' : (
            <>
              <ShareIcon size={18} /> 分享给家人
            </>
          )}
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={sharing || regenerating || deleting}
            className="w-full h-12 inline-flex items-center justify-center gap-2 rounded-2xl border border-[#FFD6C7] text-[#FF4D4F] text-base font-medium hover:bg-red-50 disabled:opacity-50 transition-all active:scale-[0.98] touch-manipulation"
          >
            {deleting ? '删除中…' : (
              <>
                <DeleteIcon size={18} /> 删除故事
              </>
            )}
          </button>
        )}
      </div>

      {familyName && (
        <p className="mt-3 text-center text-[13px] text-[#8E7B6B]">{familyName}</p>
      )}
    </section>
  );
}
