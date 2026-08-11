import type { PipelineStats } from '@/lib/agent-types';
import type { AgentPage } from '@/lib/agent-hints';
import { getAgentHint } from '@/lib/agent-hints';
import { AGENT_STEPS, getCurrentStepIndex } from '@/lib/agent-steps';

export type AgentRole =
  | 'memory-assistant'
  | 'story-assistant'
  | 'editor-assistant'
  | 'movie-director'
  | 'family-assistant';

export type AgentTaskStatus =
  | 'idle'
  | 'thinking'
  | 'speaking'
  | 'attention'
  | 'success'
  | 'waiting'
  | 'error';

export interface AgentEvent {
  agentRole: AgentRole;
  taskStatus: AgentTaskStatus;
  message: string;
  expression: string;
  animation: string;
  stepIndex: number;
  stepTitle: string;
  targetHref?: string;
  targetLabel?: string;
}

export interface ResolveAgentEventOptions {
  page: AgentPage;
  appreciate?: boolean;
  familyId?: string;
  needsSupplementCount?: number;
  itemCompletion?: number;
  itemLabel?: 'memory' | 'story' | 'movie';
  analyzeProgress?: {
    completed: number;
    total: number;
    active: number;
    failed: number;
  } | null;
}

function stepHref(stepId: number, familyId?: string): string {
  return AGENT_STEPS.find((s) => s.id === stepId)?.href({ firstFamilyId: familyId }) ?? '/';
}

function roleForStep(step: number): AgentRole {
  if (step <= 2) return 'memory-assistant';
  if (step === 3) return 'story-assistant';
  if (step === 4) return 'movie-director';
  return 'family-assistant';
}

export function resolveAgentEvent(
  stats: PipelineStats | null | undefined,
  options: ResolveAgentEventOptions
): AgentEvent {
  const { page, appreciate, familyId, needsSupplementCount = 0, analyzeProgress } = options;

  if (page === 'edit' && (options.itemCompletion != null || options.itemLabel)) {
    const hint = getAgentHint({
      page: 'edit',
      pipeline: stats ?? undefined,
      itemCompletion: options.itemCompletion,
      itemLabel: options.itemLabel,
    });
    return {
      agentRole: options.itemLabel === 'story' ? 'editor-assistant' : 'memory-assistant',
      taskStatus: 'attention',
      message: hint,
      expression: 'curious',
      animation: 'raise-hand',
      stepIndex: getCurrentStepIndex(stats),
      stepTitle: AGENT_STEPS[getCurrentStepIndex(stats) - 1]!.title,
    };
  }

  if (appreciate) {
    return {
      agentRole: 'family-assistant',
      taskStatus: 'attention',
      message: '你现在正在欣赏作品。点我去创造新的家庭记忆吧～',
      expression: 'warm',
      animation: 'wave',
      stepIndex: 5,
      stepTitle: AGENT_STEPS[4]!.title,
      targetHref: '/?create=1',
      targetLabel: '去创造',
    };
  }

  if (page === 'analyze' && analyzeProgress) {
    const { completed, total, active, failed } = analyzeProgress;
    if (total <= 0) {
      return {
        agentRole: 'memory-assistant',
        taskStatus: 'thinking',
        message: '念念正在准备解析你的照片…',
        expression: 'thinking',
        animation: 'thinking',
        stepIndex: 2,
        stepTitle: AGENT_STEPS[1]!.title,
        targetHref: familyId ? `/family/${familyId}/analyze` : undefined,
      };
    }
    if (active > 0) {
      return {
        agentRole: 'memory-assistant',
        taskStatus: 'thinking',
        message: `正在读懂照片，已完成 ${completed}/${total} 张…`,
        expression: 'focused',
        animation: 'thinking',
        stepIndex: 2,
        stepTitle: AGENT_STEPS[1]!.title,
        targetHref: familyId ? `/family/${familyId}/analyze` : undefined,
      };
    }
    if (failed > 0 && completed + failed >= total) {
      const nextStep = stats ? getCurrentStepIndex({ ...stats, pendingCount: 0 }) : 3;
      const nextDef = AGENT_STEPS[Math.min(nextStep, 5) - 1]!;
      return {
        agentRole: 'memory-assistant',
        taskStatus: 'error',
        message: `解析完成：${completed} 张成功，${failed} 张失败，失败的可单独重试。`,
        expression: 'sorry',
        animation: 'waiting',
        stepIndex: nextStep,
        stepTitle: nextDef.title,
        targetHref:
          nextStep === 3 && familyId
            ? `/family/${familyId}/photos?generateStory=1`
            : familyId
              ? `/family/${familyId}/photos`
              : stepHref(nextStep, familyId),
        targetLabel: nextStep === 3 ? '生成故事' : '查看记忆卡',
      };
    }
    const nextStep = stats ? getCurrentStepIndex({ ...stats, pendingCount: 0 }) : 3;
    const nextDef = AGENT_STEPS[Math.min(nextStep, 5) - 1]!;
    return {
      agentRole: nextStep >= 3 ? 'story-assistant' : 'memory-assistant',
      taskStatus: 'success',
      message:
        nextStep >= 3
          ? `已读懂 ${completed}/${total} 张！下一步：${nextDef.title}。`
          : `已读懂 ${completed}/${total} 张，记忆卡已保存！`,
      expression: 'happy',
      animation: 'clap',
      stepIndex: nextStep,
      stepTitle: nextDef.title,
      targetHref:
        nextStep === 3 && familyId
          ? `/family/${familyId}/photos?generateStory=1`
          : familyId
            ? `/family/${familyId}/photos`
            : stepHref(nextStep, familyId),
      targetLabel: nextStep === 3 ? '生成故事' : nextStep === 4 ? '生成电影' : '查看记忆卡',
    };
  }

  const stepIndex = getCurrentStepIndex(stats);
  const step = AGENT_STEPS[stepIndex - 1]!;
  const agentRole = roleForStep(stepIndex);

  // Step 2：仍有待解析照片
  if (stepIndex === 2 && stats && stats.pendingCount > 0) {
    return {
      agentRole: 'memory-assistant',
      taskStatus: 'attention',
      message: `还有 ${stats.pendingCount} 张照片待念念解析，点我去开始读懂它们～`,
      expression: 'curious',
      animation: 'raise-hand',
      stepIndex,
      stepTitle: step.title,
      targetHref: familyId ? `/family/${familyId}/analyze` : stepHref(2, familyId),
      targetLabel: '开始解析',
    };
  }

  // Step 3：可以生成故事（完成度只影响质量，不阻断）
  if (stepIndex === 3 && stats) {
    const lowCompletion = stats.completionAvg < 70;
    const supplementHint =
      needsSupplementCount > 0
        ? `有 ${needsSupplementCount} 张记忆卡还可以补充细节，`
        : lowCompletion
          ? '补充记忆卡细节故事会更生动，'
          : '';

    return {
      agentRole: 'story-assistant',
      taskStatus: lowCompletion || needsSupplementCount > 0 ? 'attention' : 'success',
      message:
        supplementHint +
        (stats.storyCount === 0
          ? '记忆卡已就绪，点我去生成第一篇家庭故事吧！'
          : '可以重新发现新的故事视角，或继续生成更多故事。'),
      expression: needsSupplementCount > 0 ? 'curious' : 'happy',
      animation: needsSupplementCount > 0 ? 'raise-hand' : 'clap',
      stepIndex,
      stepTitle: step.title,
      targetHref: familyId
        ? `/family/${familyId}/photos?generateStory=1`
        : stepHref(3, familyId),
      targetLabel: '生成故事',
    };
  }

  // Step 4：生成电影
  if (stepIndex === 4 && stats) {
    return {
      agentRole: 'movie-director',
      taskStatus: 'attention',
      message: `已有 ${stats.storyCount} 个故事，点我去把它们变成温暖的家庭电影～`,
      expression: 'excited',
      animation: 'raise-hand',
      stepIndex,
      stepTitle: step.title,
      targetHref: familyId ? `/family/${familyId}` : stepHref(4, familyId),
      targetLabel: '生成电影',
    };
  }

  // Step 5：欣赏分享
  if (stepIndex >= 5) {
    return {
      agentRole: 'family-assistant',
      taskStatus: 'success',
      message: '故事和电影都准备好了！去欣赏模式慢慢回味，或分享给家人吧～',
      expression: 'warm',
      animation: 'wave',
      stepIndex: 5,
      stepTitle: AGENT_STEPS[4]!.title,
      targetHref: '/appreciate',
      targetLabel: '去欣赏',
    };
  }

  // Step 1 或兜底：使用页面上下文提示
  const hint = getAgentHint({
    page,
    pipeline: stats ?? undefined,
    completionAvg: stats?.completionAvg,
    pendingCount: stats?.pendingCount,
    analyzedCount: stats?.analyzedCount,
    photoCount: stats?.photoCount,
    storyCount: stats?.storyCount,
    movieCount: stats?.movieCount,
  });

  return {
    agentRole,
    taskStatus: stepIndex === 1 ? 'attention' : 'idle',
    message: hint,
    expression: stepIndex === 1 ? 'curious' : 'warm',
    animation: stepIndex === 1 ? 'raise-hand' : 'idle',
    stepIndex,
    stepTitle: step.title,
    targetHref: stepHref(stepIndex, familyId),
    targetLabel: step.title,
  };
}
