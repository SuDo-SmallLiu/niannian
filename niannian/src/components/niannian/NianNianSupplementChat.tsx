'use client';

import { useEffect, useRef } from 'react';
import { Loader2, Mic, Plus, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SupplementProgressHeader from '@/components/niannian/SupplementProgressHeader';
import SupplementPhotoIntro from '@/components/niannian/SupplementPhotoIntro';
import SupplementChatBubble from '@/components/niannian/SupplementChatBubble';
import { useSupplementChat } from '@/hooks/useSupplementChat';
import type { AiQuestion } from '@/lib/supplement-chat';

interface NianNianSupplementChatProps {
  photoId: string;
  photoUrl: string;
  photoName?: string;
  initialNotes?: string;
  initialQuestions?: AiQuestion[];
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
  compact?: boolean;
}

export default function NianNianSupplementChat({
  photoId,
  photoUrl,
  photoName,
  initialNotes = '',
  initialQuestions = [],
  onSaved,
  onReanalyzed,
  onBack,
  compact = false,
}: NianNianSupplementChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const chat = useSupplementChat({
    photoId,
    initialNotes,
    initialQuestions,
    numbered: true,
    onSaved,
    onReanalyzed,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.thread.length, chat.answeredCount]);

  const voiceLabel = chat.voice.isTranscribing
    ? '识别中…'
    : chat.voice.isRecording
      ? '结束'
      : '语音';

  return (
    <div className={`flex flex-col bg-[#F8F4ED] ${compact ? 'h-[520px]' : 'min-h-[100dvh]'}`}>
      {!compact && (
        <div className="shrink-0 flex items-center px-4 pt-3 pb-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-sm text-[#8B7355] hover:text-[#4A3326] mr-3"
            >
              ← 返回
            </button>
          )}
        </div>
      )}

      <SupplementProgressHeader dialogProgress={chat.progressPercent} />

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
          <p className="text-sm text-center text-[#8B7355] py-2">本轮对话已完成</p>
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
        </div>
      </div>
    </div>
  );
}
