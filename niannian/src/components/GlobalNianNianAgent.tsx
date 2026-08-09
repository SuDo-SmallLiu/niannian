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

  const [analyzeProgress, setAnalyzeProgress] = useState<{
    completed: number;
    total: number;
    active: number;
    failed: number;
  } | null>(null);

  const page = resolveAgentPage(pathname);
  const familyIdFromPath = pathname.match(/\/family\/([^/]+)/)?.[1];
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

  // 解析完成后立即刷新该家庭的进度，避免仍显示第 2 步或误跳第 5 步
  useEffect(() => {
    if (!analyzeFamilyId || !analyzeProgress) return;
    if (analyzeProgress.active > 0) return;
    if (analyzeProgress.total <= 0) return;
    if (analyzeProgress.completed + analyzeProgress.failed < analyzeProgress.total) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/agent/context?familyId=${encodeURIComponent(analyzeFamilyId)}`
        );
        const data = await res.json();
        if (!cancelled && data.pipeline) setPipeline(data.pipeline);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [analyzeFamilyId, analyzeProgress]);

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
        analyzeProgress: page === 'analyze' ? analyzeProgress : null,
      }),
    [mergedPipeline, page, appreciate, familyIdFromPath, analyzeProgress, agentCtx?.override]
  );

  const bubbleText = useMemo(() => {
    if (page === 'analyze' && analyzeProgress && !appreciate) {
      return getAnalyzeProgressMessage(
        analyzeProgress.completed,
        analyzeProgress.total,
        analyzeProgress.active,
        analyzeProgress.failed
      );
    }
    return agentEvent.message;
  }, [page, analyzeProgress, appreciate, agentEvent.message]);

  const isFullscreen = page === 'display' || page === 'share';
  const avatarSize = appreciate ? 88 : 80;

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
        agentRole={agentEvent.agentRole}
      />

      <div
        className={`fixed right-4 z-30 flex flex-col items-end gap-2 pointer-events-none ${
          isFullscreen ? 'bottom-[max(5.5rem,env(safe-area-inset-bottom))]' : 'bottom-20'
        }`}
      >
        {bubbleVisible && bubbleText && (
          <button
            type="button"
            onClick={handleBubbleClick}
            className="niannian-bubble-soft max-w-[260px] rounded-2xl rounded-br-md px-3.5 py-2.5 text-left pointer-events-auto active:scale-[0.98] transition-transform"
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
