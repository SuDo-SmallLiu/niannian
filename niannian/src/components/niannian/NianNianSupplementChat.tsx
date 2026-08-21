'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback, useState } from 'react';
import { Loader2, Mic, Plus, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupplementProgressHeader from '@/components/niannian/SupplementProgressHeader';
import SupplementPhotoIntro from '@/components/niannian/SupplementPhotoIntro';
import SupplementChatBubble from '@/components/niannian/SupplementChatBubble';
import { SupplementQuickChips } from '@/components/niannian/SupplementQuickChips';
import { useSupplementChat } from '@/hooks/useSupplementChat';
import type { AiQuestion } from '@/lib/supplement-chat';

interface NianNianSupplementChatProps {
  photoId: string;
  photoUrl: string;
  photoName?: string;
  initialNotes?: string;
  initialQuestions?: AiQuestion[];
  photoIndex?: number;
  photoTotal?: number;
  onSaved?: (data: {
    user_notes: string;
    voice_transcript: string;
    ai_questions: AiQuestion[];
  }) => void;
  onReanalyzed?: (data: {
    photo: unknown;
    memoryCard: unknown;
    tags: unknown;
    familyName?: string;
  }) => void;
  onBack?: () => void;
  /** 保存后自动跳下一张（批量模式） */
  onSaveAndNext?: () => void | Promise<void>;
  compact?: boolean;
}

export interface NianNianSupplementChatHandle {
  saveIfNeeded: () => Promise<boolean>;
}

const NianNianSupplementChat = forwardRef<NianNianSupplementChatHandle, NianNianSupplementChatProps>(
  function NianNianSupplementChat(
    {
      photoId,
      photoUrl,
      photoName,
      initialNotes = '',
      initialQuestions = [],
      photoIndex,
      photoTotal,
      onSaved,
      onReanalyzed,
      onBack,
      onSaveAndNext,
      compact = false,
    },
    ref
  ) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [advancing, setAdvancing] = useState(false);
  const chat = useSupplementChat({
    photoId,
    initialNotes,
    initialQuestions,
    numbered: true,
    onSaved,
    onReanalyzed,
  });

  useImperativeHandle(
    ref,
    () => ({
      saveIfNeeded: async () => {
        if (!chat.dirty && !chat.hasSupplement) return true;
        return chat.saveSupplement();
      },
    }),
    [chat.dirty, chat.hasSupplement, chat.saveSupplement]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.thread.length, chat.answeredCount, photoId]);

  const handleQuickPick = useCallback(
    (text: string) => {
      const answer = text === '跳过' ? '不确定' : text;
      chat.submitReply(answer);
    },
    [chat]
  );

  const handleSaveAndNext = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      if (chat.dirty || chat.hasSupplement) {
        const ok = await chat.saveSupplement();
        if (!ok) return;
      }
      await onSaveAndNext?.();
    } finally {
      setAdvancing(false);
    }
  };

  const voiceLabel = chat.voice.isTranscribing
    ? '识别中…'
    : chat.voice.isRecording
      ? '结束'
      : '语音';

  const showSaveAndNext = !!onSaveAndNext && (chat.hasSupplement || chat.allDone);

  return (
    <div className={`flex flex-col bg-[#F8F4ED] flex-1 min-h-0 ${compact ? 'h-[520px]' : ''}`}>
      {!compact && onBack && (
        <div className="shrink-0 flex items-center px-4 pt-3 pb-0">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[#8B7355] hover:text-[#4A3326]"
          >
            ← 返回
          </button>
        </div>
      )}

      <SupplementProgressHeader
        dialogProgress={chat.progressPercent}
        photoIndex={photoIndex}
        photoTotal={photoTotal}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        <SupplementPhotoIntro photoUrl={photoUrl} photoName={photoName} />

        {chat.thread.map((msg) => (
          <SupplementChatBubble
            key={msg.id}
            role={msg.role === 'user' ? 'user' : 'assistant'}
            content={msg.content}
            read={msg.role === 'user'}
          />
        ))}

        {chat.loadingQuestions && (
          <p className="text-xs text-center text-[#B8A898]">念念正在准备问题…</p>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-[#E8DCC8] bg-white/95 backdrop-blur-sm px-3 py-3 pb-safe">
        {chat.waitingForReply && (
          <div className="mb-2">
            <SupplementQuickChips
              stepIndex={chat.answeredCount}
              onPick={handleQuickPick}
              disabled={chat.busy}
            />
          </div>
        )}

        {chat.waitingForReply ? (
          <div className="flex items-end gap-2">
            <button
              type="button"
              className="shrink-0 w-10 h-10 rounded-full border border-[#E8DCC8] bg-[#FFFBF7] flex items-center justify-center text-[#8B7355]"
              aria-label="添加附件"
              disabled
            >
              <Plus className="w-5 h-5" />
            </button>
            <textarea
              value={chat.draft}
              onChange={(e) => chat.setDraft(e.target.value)}
              disabled={chat.busy}
              placeholder="点击输入你的回答…"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  chat.submitReply(chat.draft);
                }
              }}
              className="flex-1 min-h-[44px] max-h-[100px] resize-none rounded-2xl border border-[#E8DCC8] bg-[#FFFBF7] px-3 py-2.5 text-[15px] leading-relaxed text-[#4A3326] placeholder:text-[#B8A898] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D98A45]/30"
            />
            <Button
              type="button"
              variant={chat.voice.isRecording ? 'default' : 'outline'}
              size="icon"
              className={`shrink-0 h-10 w-10 rounded-full ${
                chat.voice.isRecording ? 'bg-[#C04040] hover:bg-[#A03030] border-none' : ''
              }`}
              onClick={() => chat.voice.start(chat.appendVoiceText)}
              disabled={!chat.voice.supported || chat.busy}
              aria-label={voiceLabel}
            >
              {chat.voice.isTranscribing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : chat.voice.isRecording ? (
                <Square className="w-4 h-4 fill-current" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <Button
              type="button"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full bg-[#D98A45] hover:bg-[#C47A3A]"
              onClick={() => chat.submitReply(chat.draft)}
              disabled={chat.busy || !chat.draft.trim()}
              aria-label="发送"
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        ) : (
          <p className="text-sm text-center text-[#8B7355] py-2">本轮对话已完成，可保存或跳下一张</p>
        )}

        {chat.message && (
          <p
            className={`text-sm mt-2 text-center ${
              chat.message.includes('失败') ? 'text-destructive' : 'text-[#D98A45]'
            }`}
          >
            {chat.message}
          </p>
        )}

        <div className="flex gap-3 mt-3">
          {showSaveAndNext ? (
            <Button
              type="button"
              className="flex-1 rounded-xl bg-[#DF8B3A] hover:bg-[#C47A3A] text-base"
              onClick={handleSaveAndNext}
              disabled={chat.busy || advancing}
            >
              {advancing
                ? '保存中…'
                : photoTotal && photoIndex !== undefined && photoIndex < photoTotal - 1
                  ? '保存并下一张 →'
                  : '保存并完成'}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => chat.saveSupplement()}
                disabled={chat.busy || !chat.dirty}
              >
                {chat.saving ? '保存中…' : '保存'}
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl bg-[#D98A45] hover:bg-[#C47A3A]"
                onClick={() => chat.reanalyzeWithSupplement()}
                disabled={chat.busy || !chat.hasSupplement}
              >
                {chat.reanalyzing ? '理解中…' : '重新理解'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default NianNianSupplementChat;
