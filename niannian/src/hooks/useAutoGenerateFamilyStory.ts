'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDialog } from '@/components/providers/app-dialog-provider';

export function useAutoGenerateFamilyStory(familyId: string) {
  const router = useRouter();
  const { confirm, showLoading, hideLoading } = useAppDialog();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const generateStories = useCallback(
    async (options?: { replaceExisting?: boolean; existingCount?: number }) => {
      if (generating) return false;

      const existingCount = options?.existingCount ?? 0;
      const replaceExisting = options?.replaceExisting ?? existingCount > 0;

      const ok = await confirm({
        title: existingCount > 0 ? '重新生成故事？' : '念念自动生成故事？',
        description:
          existingCount > 0
            ? '将根据最新记忆卡重新撰写家庭故事，并替换当前草稿。'
            : '念念将根据已解析的记忆卡自动串联、撰写完整家庭故事，预计 1–2 分钟。',
        confirmText: existingCount > 0 ? '重新生成' : '开始生成',
        cancelText: '再想想',
      });
      if (!ok) return false;

      setGenerating(true);
      setError('');
      showLoading('念念撰写故事中', '正在读取记忆卡并串联叙事…');

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      try {
        const res = await fetch('/api/story/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ familyId, replaceExisting }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '生成失败');

        const jobId = data.jobId as string;
        if (!jobId) throw new Error('未收到任务 ID');

        for (let i = 0; i < 180; i++) {
          await sleep(2000);
          const pollRes = await fetch(`/api/story/generate?jobId=${encodeURIComponent(jobId)}`);
          const poll = await pollRes.json();
          if (!pollRes.ok) throw new Error(poll.error || '查询进度失败');
          if (poll.progress) showLoading('念念撰写故事中', poll.progress);
          if (poll.status === 'done') {
            router.push(`/family/${familyId}/story`);
            return true;
          }
          if (poll.status === 'error') throw new Error(poll.error || '生成失败');
        }

        throw new Error('生成超时，请稍后在故事草稿箱查看');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '生成失败';
        setError(msg);
        return false;
      } finally {
        hideLoading();
        setGenerating(false);
      }
    },
    [familyId, generating, confirm, showLoading, hideLoading, router]
  );

  return { generateStories, generating, error, clearError: () => setError('') };
}
