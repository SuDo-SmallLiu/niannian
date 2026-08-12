'use client';

import Image from 'next/image';
import { HeartIcon, NavStoryIcon } from '@/components/icons/NianNianIcons';

export interface StoryListCardProps {
  title: string;
  summary: string;
  photoUrls: string[];
  memoryCount?: number;
  /** 草稿箱：章节序号 */
  chapter?: number;
  /** published | draft */
  status?: 'published' | 'draft';
  favorited?: boolean;
  onFavorite?: () => void;
  onClick?: () => void;
  className?: string;
}

/** 家庭故事列表卡片 — 375×812 示意，白卡 + 主图 + 摘要引语 */
export default function StoryListCard({
  title,
  summary,
  photoUrls,
  memoryCount,
  chapter,
  status = 'published',
  favorited = false,
  onFavorite,
  onClick,
  className = '',
}: StoryListCardProps) {
  const cover = photoUrls.filter(Boolean)[0];
  const count = memoryCount ?? photoUrls.filter(Boolean).length;
  const interactive = Boolean(onClick);

  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={[
        'bg-white rounded-[20px] p-5 shadow-[0_8px_24px_rgba(74,51,38,0.06)] border border-[rgba(239,228,214,0.6)]',
        interactive ? 'cursor-pointer active:scale-[0.99] transition-transform touch-manipulation' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFF1E1] text-[#DF8B3A] text-[13px] font-medium shrink-0">
            家庭故事
            <HeartIcon size={14} className="text-[#DF8B3A]" fill="currentColor" stroke="none" />
          </span>
          {chapter != null && (
            <span className="text-[12px] text-[#8E7B6B] tracking-wide">
              章节 {String(chapter).padStart(2, '0')}
            </span>
          )}
          {status === 'draft' && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF1E1] text-[#DF8B3A] border border-[#EFE4D6]">
              草稿
            </span>
          )}
          {status === 'published' && chapter != null && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ECFDF3] text-[#22C55E] border border-[#BBF7D0]">
              已发布
            </span>
          )}
        </div>
        {onFavorite && (
          <button
            type="button"
            aria-label={favorited ? '取消收藏' : '收藏故事'}
            onClick={(event) => {
              event.stopPropagation();
              onFavorite();
            }}
            className="w-11 h-11 -mr-2 -mt-1 flex items-center justify-center rounded-full hover:bg-[#FFF6EB] transition-colors touch-manipulation"
          >
            <HeartIcon
              size={24}
              className={favorited ? 'text-[#DF8B3A]' : 'text-[#4A3326]'}
              fill={favorited ? 'currentColor' : 'none'}
            />
          </button>
        )}
      </div>

      <div className="relative rounded-2xl overflow-hidden mb-4 bg-[#F3E8D2] aspect-[4/3]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8E7B6B] text-sm">
            暂无照片
          </div>
        )}
        {count > 0 && (
          <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-xl bg-[#DF8B3A] text-white text-[12px] font-medium shadow-sm">
            {count} 段记忆
          </span>
        )}
      </div>

      <h3 className="font-serif font-semibold text-[22px] text-[#4A3326] leading-snug line-clamp-2">
        {title}
      </h3>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[13px] text-[#8E7B6B]">
        <span className="inline-flex items-center gap-1.5">
          <NavStoryIcon size={16} className="text-[#4A3326]" />
          {count > 0 ? `${count} 段家庭记忆` : '家庭记忆'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <HeartIcon size={16} className="text-[#DF8B3A]" />
          念念珍藏的家庭故事
        </span>
      </div>

      {summary && (
        <p className="text-[15px] text-[#5A4636] leading-relaxed mt-3 line-clamp-2">{summary}</p>
      )}

      <div className="mt-4 px-4 py-3 rounded-2xl bg-[#FFF6EB] text-[#8E7B6B] text-[13px] text-center leading-relaxed">
        让每一张照片都成为回家的理由
      </div>
    </article>
  );
}
