'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  label?: string;
}

interface AccessibleChatPanelProps {
  messages: ChatMessage[];
  className?: string;
  emptyHint?: string;
}

/** 适老聊天面板 — 大字号、高对比、清晰气泡 */
export function AccessibleChatPanel({
  messages,
  className,
  emptyHint = '暂无消息',
}: AccessibleChatPanelProps) {
  const visible = messages.filter((m) => m.role !== 'system');

  return (
    <ScrollArea className={cn('h-[280px] rounded-2xl border-2 border-border bg-[#FFFBF7]', className)}>
      <div className="p-4 space-y-4">
        {visible.length === 0 ? (
          <p className="text-base text-muted-foreground text-center py-8">{emptyHint}</p>
        ) : (
          visible.map((msg) => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[90%] rounded-2xl px-4 py-3 text-base leading-relaxed',
                  msg.role === 'assistant'
                    ? 'bg-[hsl(var(--chat-assistant))] text-foreground rounded-tl-sm border border-[#F0E6D8]'
                    : 'bg-primary text-primary-foreground rounded-tr-sm'
                )}
              >
                {msg.label && (
                  <p className="text-xs font-medium mb-1 opacity-80">{msg.label}</p>
                )}
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}

interface AccessibleChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  submitLabel?: string;
  extraActions?: React.ReactNode;
}

export function AccessibleChatComposer({
  value,
  onChange,
  onSubmit,
  placeholder = '请输入…',
  disabled = false,
  submitLabel = '发送',
  extraActions,
}: AccessibleChatComposerProps) {
  return (
    <div className="space-y-3">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        rows={4}
        className="flex min-h-[100px] w-full rounded-2xl border-2 border-input bg-white px-4 py-3 text-base leading-relaxed text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-y"
      />
      <div className="flex flex-wrap gap-2 items-center">
        {extraActions}
        {onSubmit && (
          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className="ml-auto h-12 px-6 rounded-xl bg-primary text-primary-foreground text-base font-medium disabled:opacity-40 touch-manipulation"
          >
            {submitLabel}
          </button>
        )}
      </div>
    </div>
  );
}
