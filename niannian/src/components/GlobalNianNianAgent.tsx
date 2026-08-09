'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useNianNianAgentContext } from '@/components/providers/niannian-agent-provider';
import NianNianFloatingTrigger from '@/components/NianNianFloatingTrigger';
import NianNianHelpDesk from '@/components/NianNianHelpDesk';
import { resolveAgentPage } from '@/lib/agent-hints';
import { getAnalyzeProgressMessage } from '@/lib/agent-steps';
import { resolveAgentEvent } from '@/lib/agent-events';
import type { PipelineStats } from '@/lib/agent-types';

type AgentPipeline = PipelineStats & { needsSupplementCount?: number };

export default function GlobalNianNianAgent() {
  const pathname = usePathname();
  const router = useRouter();
  const appreciate = useAppreciateMode();
  const agentCtx = useNianNianAgentContext();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pipeline, setPipeline] = useState<AgentPipeline | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(true);

  const page = resolveAgentPage(pathname);
  const familyIdFromPath = pathname.match(/\/family\/([^/]+)/)?.[1];

  useEffect(() => {
    setHelpOpen(false);
    setBubbleVisible(true);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const query = familyIdFromPath ? `?familyId=${encodeURIComponent(familyIdFromPath)}` : '';
        const res = await fetch(`/api/agent/context${query}`);
        const data = await res.json();
        if (!cancelled && data.pipeline) setPipeline(data.pipeline);
      } catch {
        /* ignore */
      }
    }

    load();
    const timer = setInterval(load, familyIdFromPath ? 5000 : 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname, familyIdFromPath]);

  const mergedPipeline = useMemo((): AgentPipeline | null => {
    if (!pipeline) return null;
    return {
      ...pipeline,
      photoCount: agentCtx?.override.photoCount ?? pipeline.photoCount,
      pendingCount: agentCtx?.override.pendingCount ?? pipeline.pendingCount,
      analyzedCount: agentCtx?.override.analyzedCount ?? pipeline.analyzedCount,
      completionAvg: agentCtx?.override.completionAvg ?? pipeline.completionAvg,
      storyCount: agentCtx?.override.storyCount ?? pipeline.storyCount,
      movieCount: agentCtx?.override.movieCount ?? pipeline.movieCount,
    };
  }, [pipeline, agentCtx?.override]);

  const agentEvent = useMemo(
    () =>
      resolveAgentEvent(mergedPipeline, {
        page,
        appreciate,
        familyId: familyIdFromPath,
        needsSupplementCount: mergedPipeline?.needsSupplementCount,
        itemCompletion: agentCtx?.override.itemCompletion,
        itemLabel: agentCtx?.override.itemLabel,
      }),
    [mergedPipeline, page, appreciate, familyIdFromPath, agentCtx?.override]
  );

  const bubbleText = useMemo(() => {
    if (page === 'analyze' && !appreciate) {
      const total = agentCtx?.override.photoCount ?? 0;
      const completed = agentCtx?.override.analyzedCount ?? 0;
      const active = agentCtx?.override.analyzeActive ?? 0;
      const failed = agentCtx?.override.analyzeFailed ?? 0;
      if (total > 0) {
        return getAnalyzeProgressMessage(completed, total, active, failed);
      }
    }
    return agentEvent.message;
  }, [page, appreciate, agentEvent.message, agentCtx?.override]);

  const isFullscreen = page === 'display' || page === 'share';
  const avatarSize = appreciate ? 88 : 80;

  /** 页面底部有固定操作栏时，抬高念念避免被遮挡 */
  const hasBottomActionBar =
    page === 'edit' || page === 'compose' || (page === 'memory' && pathname.includes('/photos'));
  const floatBottomClass = isFullscreen
    ? 'bottom-[max(5.5rem,env(safe-area-inset-bottom))]'
    : hasBottomActionBar
      ? 'bottom-44'
      : 'bottom-24';

  if (pathname === '/' || pathname === '/profile') {
    return null;
  }

  const navigateToTarget = () => {
    if (agentEvent.targetHref) {
      router.push(agentEvent.targetHref);
      return;
    }
    setHelpOpen(true);
  };

  const handleBubbleClick = () => {
    if (appreciate) {
      router.push('/?create=1');
      return;
    }
    navigateToTarget();
  };

  const handleAvatarClick = () => {
    if (appreciate) {
      router.push('/?create=1');
      return;
    }
    setHelpOpen(true);
  };

  return (
    <>
      <NianNianHelpDesk
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        pipeline={mergedPipeline}
        currentStep={agentEvent.stepIndex}
      />

      <div
        className={`niannian-agent-float fixed right-4 flex flex-col items-end gap-2 pointer-events-none ${floatBottomClass}`}
      >
        {bubbleVisible && bubbleText && (
          <button
            type="button"
            onClick={handleBubbleClick}
            className="niannian-bubble-soft max-w-[260px] rounded-2xl rounded-br-md px-3.5 py-2.5 text-left pointer-events-auto active:scale-[0.98] transition-transform relative z-[1]"
          >
            <p className="text-[10px] text-[#D98A45] font-medium mb-1">
              第 {agentEvent.stepIndex} 步 · {agentEvent.stepTitle}
              {agentEvent.targetLabel ? ` · 点我${agentEvent.targetLabel}` : ''}
            </p>
            <p className="text-xs text-[#4B3B2F] leading-relaxed">{bubbleText}</p>
          </button>
        )}

        <NianNianFloatingTrigger
          onClick={handleAvatarClick}
          size={avatarSize}
          ariaLabel={appreciate ? '点我去创造' : '念念帮助台'}
          className="pointer-events-auto relative z-[2]"
        />

        {!appreciate && bubbleVisible && (
          <button
            type="button"
            onClick={() => setBubbleVisible(false)}
            className="text-[10px] text-[#C8B8A8] pointer-events-auto pr-1"
          >
            收起提示
          </button>
        )}
      </div>
    </>
  );
}
