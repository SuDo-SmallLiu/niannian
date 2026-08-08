'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import NianNianAvatar from '@/components/NianNianAvatar';
import type { PipelineStats } from '@/lib/agent-types';
import { AGENT_STEPS, stepLabel } from '@/lib/agent-steps';

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
  pipeline?: PipelineStats | null;
}

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

export default function NianNianHelpDesk({ open, onClose, pipeline }: NianNianHelpDeskProps) {
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

  if (!open) return null;

  const handleStepClick = (step: HelpStep) => {
    onClose();
    router.push(step.href);
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
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center text-[#B8A898] text-sm rounded-full border border-[#E8DCC8] bg-white"
          aria-label="帮助说明"
        >
          ?
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 pb-28">
        <div className="flex items-start gap-3 mt-2 mb-6">
          <NianNianAvatar variant="wave" size={120} animate />
          <div className="flex-1 mt-4 rounded-2xl rounded-tl-sm bg-white border border-[#F0E8D8] px-4 py-3 shadow-sm">
            <p className="text-sm text-[#4B3B2F] leading-relaxed">
              嗨呀～我是念念！我会陪你一起记录属于你们家的美好时光～
            </p>
          </div>
        </div>

        <p className="text-center text-sm text-[#8B7355] mb-5">
          <span className="text-[#D98A45]">✨</span>
          {' '}5 步，珍藏属于你们的家庭记忆{' '}
          <span className="text-[#D98A45]">✨</span>
        </p>

        <div className="space-y-3">
          {steps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => handleStepClick(step)}
              className="w-full text-left flex items-center gap-3 p-4 rounded-2xl bg-white border border-[#F0E8D8] shadow-sm transition-all hover:border-[#D98A45]/30 active:scale-[0.99]"
            >
              <span className="w-11 h-11 shrink-0 rounded-xl bg-[#FFF8F0] flex items-center justify-center text-xl">
                {step.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#4B3B2F]">
                  {stepLabel(step.id)} · {step.title}
                </p>
                <p className="text-xs text-[#B8A898] mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
              <span className="shrink-0 text-[#D98A45] text-sm">›</span>
            </button>
          ))}
        </div>

        <div className="mt-8 flex items-end gap-3">
          <p className="flex-1 text-xs text-[#B8A898] leading-relaxed">
            念念一直都在～有问题随时找我，我会帮你记录每一个值得珍藏的瞬间！
          </p>
          <NianNianAvatar variant="small" size={72} />
        </div>
      </div>
    </div>
  );
}
