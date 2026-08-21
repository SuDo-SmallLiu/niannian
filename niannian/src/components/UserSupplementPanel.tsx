'use client';

import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useSupplementChat } from '@/hooks/useSupplementChat';
import {
  AccessibleChatPanel,
  AccessibleChatComposer,
} from '@/components/ui/accessible-chat';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Mic, Square, Loader2, MessageCircle } from 'lucide-react';

export type { AiQuestion } from '@/lib/supplement-chat';
export { saveMemoryCardSupplement } from '@/lib/supplement-chat';

const WELCOME =
  '你好，我是念念。照片里的故事需要你来告诉我。我们一句一句聊，你也可以用语音回答。';

interface UserSupplementPanelProps {
  photoId: string;
  familyId?: string;
  notes: string;
  onNotesChange: (notes: string) => void;
  questions: import('@/lib/supplement-chat').AiQuestion[];
  onQuestionsChange: (questions: import('@/lib/supplement-chat').AiQuestion[]) => void;
  integratedSummary?: {
    people: string[];
    location: string;
    taken_at: string;
    significance: string;
  } | null;
  disabled?: boolean;
  onSaved: (data: {
    user_notes: string;
    voice_transcript: string;
    ai_questions: import('@/lib/supplement-chat').AiQuestion[];
  }) => void;
  onReanalyzed: (data: {
    photo: unknown;
    memoryCard: unknown;
    tags: unknown;
    familyName?: string;
  }) => void;
}

export default function UserSupplementPanel({
  photoId,
  familyId,
  notes,
  onNotesChange,
  questions,
  onQuestionsChange,
  integratedSummary,
  disabled = false,
  onSaved,
  onReanalyzed,
}: UserSupplementPanelProps) {
  const chat = useSupplementChat({
    photoId,
    initialNotes: notes,
    initialQuestions: questions,
    numbered: false,
    onNotesChange,
    onQuestionsChange,
    onSaved,
    onReanalyzed,
  });

  const threadWithWelcome = [
    { id: 'welcome', role: 'assistant' as const, content: WELCOME, label: '念念' },
    ...chat.thread,
  ];

  const voiceLabel = chat.voice.isTranscribing
    ? '识别中…'
    : chat.voice.isRecording
      ? '结束'
      : '语音';

  const busy = disabled || chat.busy;

  return (
    <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[#4A3326] mb-1">用户层 · 完善记忆</h2>
          <p className="text-[15px] text-[#8E7B6B] leading-relaxed">
            与念念对话，一句一句补充照片背后的故事
          </p>
        </div>
        <Link
          href={
            familyId
              ? `/family/${familyId}/supplement?photoId=${photoId}`
              : `/photos/${photoId}/supplement`
          }
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF8F0] text-[#DF8B3A] text-xs font-medium border border-[#F5E6C8]"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          和念念聊聊
        </Link>
      </div>

      {notes.trim() && integratedSummary && (
        <div className="mb-4 rounded-xl bg-[#F5FFF8] border border-[#D4EDDA] px-4 py-3.5">
          <p className="text-sm text-[#5A8F6B] mb-2 font-medium">已结合你的补充理解</p>
          <div className="space-y-1 text-base text-[#4B3B2F] leading-relaxed">
            {integratedSummary.people.length > 0 && (
              <p>
                <span className="text-[#B8A898]">人物 · </span>
                {integratedSummary.people.join('、')}
              </p>
            )}
            {integratedSummary.location && (
              <p>
                <span className="text-[#B8A898]">地点 · </span>
                {integratedSummary.location}
              </p>
            )}
            {integratedSummary.taken_at && (
              <p>
                <span className="text-[#B8A898]">时间 · </span>
                {integratedSummary.taken_at}
              </p>
            )}
            {integratedSummary.significance && (
              <p className="text-[#6B5A48] pt-1">{integratedSummary.significance}</p>
            )}
          </div>
        </div>
      )}

      <AccessibleChatPanel messages={threadWithWelcome} className="mb-3 h-[320px]" wechat />

      {chat.loadingQuestions && (
        <p className="text-xs text-center text-[#B8A898] mb-2">念念正在准备问题…</p>
      )}

      {chat.waitingForReply ? (
        <AccessibleChatComposer
          wechat
          value={chat.draft}
          onChange={chat.setDraft}
          onSubmit={() => chat.submitReply(chat.draft)}
          disabled={busy}
          placeholder="输入回答，Enter 发送"
          submitLabel="发送"
          extraActions={
            <Button
              type="button"
              variant={chat.voice.isRecording ? 'default' : 'outline'}
              size="icon"
              className={`shrink-0 h-10 w-10 rounded-xl ${
                chat.voice.isRecording ? 'bg-[#C04040] hover:bg-[#A03030] border-none' : ''
              }`}
              onClick={() => chat.voice.start(chat.appendVoiceText)}
              disabled={disabled || chat.saving || chat.reanalyzing || chat.voice.isTranscribing || !chat.voice.supported}
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
          }
        />
      ) : (
        <p className="text-sm text-center text-[#8B7355] py-2 mb-2">本轮对话已完成</p>
      )}

      {!chat.voice.supported && (
        <p className="text-xs text-muted-foreground text-center mt-2 leading-relaxed">
          {typeof window !== 'undefined' && !window.isSecureContext
            ? '语音需要 HTTPS 安全连接，请改用文字输入'
            : '当前浏览器不支持语音，请改用文字输入'}
        </p>
      )}

      {chat.voice.error && (
        <p className="text-sm text-destructive text-center mt-2 leading-relaxed">{chat.voice.error}</p>
      )}

      {chat.message && (
        <p
          className={`text-sm mt-2 text-center leading-relaxed ${
            chat.message.includes('失败') ? 'text-destructive' : 'text-[#D98A45]'
          }`}
        >
          {chat.message}
        </p>
      )}

      <div className="flex gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => chat.saveSupplement()}
          disabled={busy || !chat.dirty}
        >
          {chat.saving ? '保存中…' : '保存'}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => chat.reanalyzeWithSupplement()}
          disabled={busy || !chat.hasSupplement}
        >
          {chat.reanalyzing ? '理解中…' : '结合补充重新理解'}
        </Button>
      </div>
    </section>
  );
}
