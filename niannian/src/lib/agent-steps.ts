import type { ComponentType } from 'react';
import {
  FolderIcon,
  HeartIcon,
  NavMemoryIcon,
  NavMovieIcon,
  NavStoryIcon,
  type NianNianIconProps,
} from '@/components/icons/NianNianIcons';
import type { PipelineStats } from '@/lib/agent-types';
import type { AgentPage } from '@/lib/agent-hints';

export interface AgentStepDef {
  id: number;
  Icon: ComponentType<NianNianIconProps>;
  title: string;
  desc: string;
  href: (ctx: { firstFamilyId?: string }) => string;
}

export const AGENT_STEPS: AgentStepDef[] = [
  {
    id: 1,
    Icon: FolderIcon,
    title: '创建主题记忆',
    desc: '上传照片或片段，创建专属的主题记忆',
    href: ({ firstFamilyId }) =>
      firstFamilyId ? `/family/${firstFamilyId}/upload` : '/?create=1',
  },
  {
    id: 2,
    Icon: NavMemoryIcon,
    title: '完善记忆卡',
    desc: '补充更多细节，让念念更懂你的故事',
    href: ({ firstFamilyId }) =>
      firstFamilyId ? `/family/${firstFamilyId}/photos` : '/family/memories',
  },
  {
    id: 3,
    Icon: NavStoryIcon,
    title: '去生成故事',
    desc: '念念为你生成一篇温暖的家庭故事',
    href: ({ firstFamilyId }) =>
      firstFamilyId
        ? `/family/${firstFamilyId}/photos?generateStory=1`
        : '/family',
  },
  {
    id: 4,
    Icon: NavMovieIcon,
    title: '去生成电影',
    desc: '把故事变成一部专属家庭电影',
    href: ({ firstFamilyId }) =>
      firstFamilyId ? `/family/${firstFamilyId}` : '/movies',
  },
  {
    id: 5,
    Icon: HeartIcon,
    title: '欣赏故事 / 电影作品',
    desc: '随时回味美好时光，一键分享给家人',
    href: () => '/appreciate',
  },
];

export function getCurrentStepIndex(stats: PipelineStats | null | undefined): number {
  if (!stats || stats.photoCount === 0) return 1;
  if (stats.pendingCount > 0 || stats.analyzedCount === 0) return 2;
  if (stats.storyCount === 0) return 3;
  if (stats.movieCount === 0) return 4;
  return 5;
}

export function getStepBubbleMessage(
  stats: PipelineStats | null | undefined,
  options?: { appreciate?: boolean; page?: AgentPage; needsSupplementCount?: number }
): string {
  if (options?.appreciate) {
    return '你现在正在欣赏作品。点我去创造它们！';
  }

  const current = getCurrentStepIndex(stats);
  const step = AGENT_STEPS[current - 1]!;

  if (current === 2 && stats && stats.pendingCount > 0) {
    return `第 2 步 · ${step.title}：还有 ${stats.pendingCount} 张待解析，点我开始让念念读懂照片。`;
  }

  if (current === 3 && stats) {
    const supplement =
      (options?.needsSupplementCount ?? 0) > 0
        ? `（${options!.needsSupplementCount} 张可补充细节）`
        : stats.completionAvg < 70
          ? `（完成度 ${stats.completionAvg}%，补充后故事更生动）`
          : '';
    return `第 3 步 · 去生成故事：记忆卡已就绪${supplement}，点我开始写故事。`;
  }

  if (current >= 5) {
    return `第 5 步 · ${step.title}：去欣赏或分享给家人吧。`;
  }

  const next = current < 5 ? AGENT_STEPS[current]! : AGENT_STEPS[4]!;
  return `第 ${current} 步 · ${step.title}。下一步：${next.title}。`;
}

export function stepLabel(id: number): string {
  const labels = ['第一步', '第二步', '第三步', '第四步', '第五步'];
  return labels[id - 1] ?? `第 ${id} 步`;
}

export function getAnalyzeProgressMessage(
  completed: number,
  total: number,
  active: number,
  failed: number
): string {
  if (total <= 0) return '念念正在准备解析你的照片…';
  if (active > 0) {
    return `正在解析，已完成 ${completed}/${total} 张（${active} 张进行中）…`;
  }
  if (failed > 0 && completed + failed >= total) {
    return `解析完成：${completed} 张成功，${failed} 张失败，失败的可单独重试。`;
  }
  return `已读懂 ${completed}/${total} 张照片，记忆卡逐张保存中…`;
}
