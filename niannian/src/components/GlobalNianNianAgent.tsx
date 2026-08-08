'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useNianNianAgentContext } from '@/components/providers/niannian-agent-provider';
import NianNianFloatingTrigger from '@/components/NianNianFloatingTrigger';
import NianNianHelpDesk from '@/components/NianNianHelpDesk';
import { resolveAgentPage } from '@/lib/agent-hints';
import { getStepBubbleMessage, getAnalyzeProgressMessage } from '@/lib/agent-steps';
import type { PipelineStats } from '@/lib/agent-types';

export default function GlobalNianNianAgent() {
  const pathname = usePathname();
  const router = useRouter();
  const appreciate = useAppreciateMode();
  const agentCtx = useNianNianAgentContext();
  const [helpOpen, setHelpOpen] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineStats | null>(null);
  const [bubbleVisible, setBubbleVisible] = useState(true);

  const [analyzeProgress, setAnalyzeProgress] = useState<{
    completed: number;
    total: number;
    active: number;
    failed: number;
  } | null>(null);

  const page = resolveAgentPage(pathname);
  const analyzeFamilyId = pathname.match(/\/family\/([^/]+)\/analyze/)?.[1];

  useEffect(() => {
    setHelpOpen(false);
    setBubbleVisible(true);
  }, [pathname]);

  useEffect(() => {
    if (!analyzeFamilyId || page !== 'analyze') {
      setAnalyzeProgress(null);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/analyze?familyId=${analyzeFamilyId}`);
        const data = await res.json();
        if (cancelled || data.status === 'unknown') return;
        setAnalyzeProgress({
          completed: data.completed ?? 0,
          total: data.total ?? 0,
          active: data.active ?? 0,
          failed: data.failed ?? 0,
        });
      } catch {
        /* ignore */
      }
    };

    poll();
    const timer = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [analyzeFamilyId, page]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/agent/context');
        const data = await res.json();
        if (!cancelled && data.pipeline) setPipeline(data.pipeline);
      } catch {
        /* ignore */
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const bubbleText = useMemo(() => {
    if (appreciate) {
      return '你现在正在欣赏作品。点我去创造它们！';
    }

    if (page === 'analyze' && analyzeProgress) {
      return getAnalyzeProgressMessage(
        analyzeProgress.completed,
        analyzeProgress.total,
        analyzeProgress.active,
        analyzeProgress.failed
      );
    }

    const merged: PipelineStats | null = pipeline
      ? {
          ...pipeline,
          photoCount: agentCtx?.override.photoCount ?? pipeline.photoCount,
          pendingCount: agentCtx?.override.pendingCount ?? pipeline.pendingCount,
          analyzedCount: agentCtx?.override.analyzedCount ?? pipeline.analyzedCount,
          completionAvg: agentCtx?.override.completionAvg ?? pipeline.completionAvg,
          storyCount: agentCtx?.override.storyCount ?? pipeline.storyCount,
          movieCount: agentCtx?.override.movieCount ?? pipeline.movieCount,
        }
      : null;

    return getStepBubbleMessage(merged, { appreciate, page });
  }, [pipeline, agentCtx?.override, appreciate, page, analyzeProgress]);

  const isFullscreen = page === 'display' || page === 'share';
  const avatarSize = appreciate ? 88 : 80;

  if (pathname === '/') {
    return null;
  }

  const handleAgentClick = () => {
    if (appreciate) {
      router.push('/?create=1');
      return;
    }
    setHelpOpen(true);
  };

  return (
    <>
      <NianNianHelpDesk open={helpOpen} onClose={() => setHelpOpen(false)} pipeline={pipeline} />

      <div
        className={`fixed right-4 z-40 flex flex-col items-end gap-2 pointer-events-none ${
          isFullscreen ? 'bottom-[max(5.5rem,env(safe-area-inset-bottom))]' : 'bottom-20'
        }`}
      >
        {bubbleVisible && bubbleText && (
          <button
            type="button"
            onClick={handleAgentClick}
            className="niannian-bubble-soft max-w-[240px] rounded-2xl rounded-br-md px-3.5 py-2.5 text-left text-xs text-[#4B3B2F] leading-relaxed pointer-events-auto active:scale-[0.98] transition-transform"
          >
            {bubbleText}
          </button>
        )}

        <NianNianFloatingTrigger
          onClick={handleAgentClick}
          size={avatarSize}
          ariaLabel={appreciate ? '点我去创造' : '念念帮助台'}
          className="pointer-events-auto"
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
