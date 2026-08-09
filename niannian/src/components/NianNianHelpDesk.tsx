'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NianNianAvatar from '@/components/NianNianAvatar';
import type { PipelineStats } from '@/lib/agent-types';
import { formatPipelineProgress } from '@/lib/agent-types';
import { AGENT_STEPS, stepLabel, getCurrentStepIndex } from '@/lib/agent-steps';
import type { AgentRole } from '@/lib/agent-events';

interface FamilyBrief {
  id: string;
  name: string;
}

interface HelpStep {
  id: number;
  icon: string;
  title: string;
  desc: string;
  href: string;
}

interface NianNianHelpDeskProps {
  open: boolean;
  onClose: () => void;
  pipeline?: (PipelineStats & { needsSupplementCount?: number }) | null;
  currentStep?: number;
  agentRole?: AgentRole;
}

const ROLE_INTRO: Record<AgentRole, string> = {
  'memory-assistant': '我是 Memory 助手，帮你上传照片、读懂每一张记忆卡～',
  'story-assistant': '我是 Story 助手，帮你从记忆卡里发现温暖的家庭故事～',
  'editor-assistant': '我是编辑助手，帮你润色故事，保留你原本的情感～',
  'movie-director': '我是 Movie 导演，帮你把故事变成专属家庭电影～',
  'family-assistant': '我是家庭助手，提醒生日、去年今日，帮你分享给家人～',
};

function buildSteps(families: FamilyBrief[]): HelpStep[] {
  const firstFamilyId = families[0]?.id;
  return AGENT_STEPS.map((step) => ({
    id: step.id,
    icon: step.icon,
    title: step.title,
    desc: step.desc,
    href: step.href({ firstFamilyId }),
  }));
}

export default function NianNianHelpDesk({
  open,
  onClose,
  pipeline,
  currentStep,
  agentRole = 'memory-assistant',
}: NianNianHelpDeskProps) {
  const router = useRouter();
  const [families, setFamilies] = useState<FamilyBrief[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      try {
        const familyRes = await fetch('/api/family');
        const familyData = await familyRes.json();
        if (!cancelled) {
          setFamilies(
            (familyData.families || []).map((f: { id: string; name: string }) => ({
              id: f.id,
              name: f.name,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const steps = useMemo(() => buildSteps(families), [families]);
  const activeStep = currentStep ?? getCurrentStepIndex(pipeline);
  const progressText = pipeline ? formatPipelineProgress(pipeline) : '';

  if (!open) return null;

  const handleStepClick = (step: HelpStep) => {
    onClose();
    router.push(step.href);
  };

  const handlePrimaryAction = () => {
    const step = steps.find((s) => s.id === activeStep);
    if (step) {
      onClose();
      router.push(step.href);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#F8F4ED] flex flex-col animate-fade-in">
      <header className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-[#8B7355] text-xl"
          aria-label="返回"
        >
          ‹
        </button>
        <h1 className="text-base font-serif font-medium text-[#4B3B2F]">念念帮助台</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="flex items-start gap-3 mt-2 mb-4">
          <NianNianAvatar variant="wave" size={120} animate />
          <div className="flex-1 mt-4 rounded-2xl rounded-tl-sm bg-white border border-[#F0E8D8] px-4 py-3 shadow-sm">
            <p className="text-sm text-[#4B3B2F] leading-relaxed">{ROLE_INTRO[agentRole]}</p>
          </div>
        </div>

        {pipeline && (
          <div className="mb-5 rounded-2xl bg-white border border-[#F0E8D8] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[#8B7355]">作品进度</span>
              <span className="text-xs font-medium text-[#D98A45]">{pipeline.pipelineProgress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-[#F0E8D8] overflow-hidden mb-2">
              <div
                className="h-full bg-[#D98A45] transition-all"
                style={{ width: `${pipeline.pipelineProgress}%` }}
              />
            </div>
            <p className="text-[11px] text-[#B8A898] leading-relaxed">{progressText}</p>
            {pipeline.needsSupplementCount != null && pipeline.needsSupplementCount > 0 && (
              <p className="text-[11px] text-[#D98A45] mt-1.5">
                {pipeline.needsSupplementCount} 张记忆卡还可以补充细节（可选，不阻断生成故事）
              </p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handlePrimaryAction}
          className="w-full mb-5 py-3.5 rounded-2xl bg-[#D98A45] text-white text-sm font-medium shadow-lg shadow-[#D98A45]/20 active:scale-[0.99] transition-transform"
        >
          继续第 {activeStep} 步 · {AGENT_STEPS[activeStep - 1]?.title}
        </button>

        <p className="text-center text-sm text-[#8B7355] mb-5">
          <span className="text-[#D98A45]">✨</span>
          {' '}5 步，珍藏属于你们的家庭记忆{' '}
          <span className="text-[#D98A45]">✨</span>
        </p>

        <div className="space-y-3">
          {steps.map((step) => {
            const isActive = step.id === activeStep;
            const isDone = step.id < activeStep;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step)}
                className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border shadow-sm transition-all active:scale-[0.99] ${
                  isActive
                    ? 'bg-[#FFF8F0] border-[#D98A45]/50 ring-2 ring-[#D98A45]/20'
                    : isDone
                      ? 'bg-white border-[#E8DCC8] opacity-80'
                      : 'bg-white border-[#F0E8D8] hover:border-[#D98A45]/30'
                }`}
              >
                <span
                  className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl ${
                    isActive ? 'bg-[#D98A45]/10' : 'bg-[#FFF8F0]'
                  }`}
                >
                  {isDone ? '✓' : step.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#4B3B2F]">
                    {stepLabel(step.id)} · {step.title}
                    {isActive && (
                      <span className="ml-2 text-[10px] text-[#D98A45] font-normal">当前</span>
                    )}
                  </p>
                  <p className="text-xs text-[#B8A898] mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
                <span className="shrink-0 text-[#D98A45] text-sm">›</span>
              </button>
            );
          })}
        </div>

        <div className="mt-8 flex items-end gap-3">
          <p className="flex-1 text-xs text-[#B8A898] leading-relaxed">
            补充记忆卡是可选的——解析完成后就可以生成故事；补充细节只会让故事更生动。
          </p>
          <NianNianAvatar variant="small" size={72} />
        </div>
      </div>
    </div>
  );
}
