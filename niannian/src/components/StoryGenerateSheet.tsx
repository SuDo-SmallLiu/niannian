'use client';

import { useEffect } from 'react';

interface StoryGenerateSheetProps {
  open: boolean;
  onClose: () => void;
  onManual: () => void;
  onAuto: () => void;
  autoLoading?: boolean;
  autoDisabled?: boolean;
  completionHint?: string;
  existingStoryCount?: number;
}

export default function StoryGenerateSheet({
  open,
  onClose,
  onManual,
  onAuto,
  autoLoading = false,
  autoDisabled = false,
  completionHint,
  existingStoryCount = 0,
}: StoryGenerateSheetProps) {
  const hasExistingStories = existingStoryCount > 0;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end touch-none">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 touch-auto"
        aria-label="关闭"
        onClick={onClose}
      />
      <div className="relative z-10 bg-[#F8F4ED] rounded-t-3xl px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] animate-fade-in-up shadow-2xl touch-auto">
        <div className="w-10 h-1 rounded-full bg-[#E8DCC8] mx-auto mb-4" />
        <h2 className="text-lg font-serif text-[#4B3B2F] text-center mb-1">去生成故事</h2>
        <p className="text-xs text-[#B8A898] text-center mb-5">选一种方式，把记忆卡变成温暖的家庭故事</p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onManual}
            className="w-full text-left p-4 rounded-2xl bg-white border-2 border-[#D98A45] hover:bg-[#FFF8F0] active:scale-[0.99] transition-all"
          >
            <p className="text-base font-medium text-[#4B3B2F] mb-1">人工排列，拼出你的故事</p>
            <p className="text-xs text-[#B8A898] leading-relaxed">
              亲手挑选照片顺序与组合，念念帮你润色成一篇专属故事
            </p>
          </button>

          <button
            type="button"
            onClick={onAuto}
            disabled={autoDisabled || autoLoading}
            className="w-full text-left p-4 rounded-2xl bg-[#D98A45] text-white hover:bg-[#C47A3A] disabled:opacity-50 active:scale-[0.99] transition-all shadow-lg shadow-[#D98A45]/20"
          >
            <p className="text-base font-serif font-medium mb-1">
              {autoLoading
                ? '念念撰写中…'
                : hasExistingStories
                  ? '重新生成故事'
                  : '念念读懂照片，自动写故事'}
            </p>
            <p className="text-xs text-white/80 leading-relaxed">
              {hasExistingStories
                ? '根据最新记忆卡重新撰写，替换当前故事草稿'
                : '根据记忆卡智能聚类，一次生成 3–5 篇家庭故事'}
            </p>
          </button>
        </div>

        {completionHint && (
          <p
            className={`text-[10px] text-center mt-4 px-2 leading-relaxed ${
              completionHint.includes('失败') || completionHint.includes('错误')
                ? 'text-red-500'
                : 'text-[#B8A898]'
            }`}
          >
            {completionHint}
          </p>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-4 py-3 text-sm text-[#B8A898]"
        >
          稍后再说
        </button>
      </div>
    </div>
  );
}
