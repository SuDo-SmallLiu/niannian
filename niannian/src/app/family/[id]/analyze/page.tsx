'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AnalysisProgress from '@/components/memory/AnalysisProgress';
import PageShell from '@/components/PageShell';
import PageHero from '@/components/PageHero';
import MemoryCardStatus, {
  type MemoryCardAnalysisStatus,
} from '@/components/memory/MemoryCardStatus';
import RetryAnalysisButton from '@/components/memory/RetryAnalysisButton';
import { useNianNianAgentOverride } from '@/components/providers/niannian-agent-provider';

const LOADING_PHRASES = [
  '正在翻阅相册……',
  '正在寻找那些一起走过的日子……',
  '正在辨认每一张熟悉的脸……',
  '正在发现那些悄悄发生的变化……',
  '正在整理属于家的故事……',
];

const POLL_INTERVAL = 2000;
const POLL_TIMEOUT = 300000;

interface PhotoTask {
  id: string;
  status: MemoryCardAnalysisStatus;
  error?: string;
  url?: string;
}

interface PollPayload {
  status?: string;
  redirectTo?: string;
  message?: string;
  total?: number;
  completed?: number;
  failed?: number;
  active?: number;
  progress?: number;
  photos?: PhotoTask[];
}

function isTerminalPoll(pollData: PollPayload): boolean {
  if (pollData.status === 'done' || pollData.status === 'error') return true;
  const total = pollData.total ?? 0;
  if (total <= 0) return false;
  const finished = (pollData.completed ?? 0) + (pollData.failed ?? 0);
  return finished >= total && (pollData.active ?? 0) === 0;
}

export default function AnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [error, setError] = useState('');
  const [photos, setPhotos] = useState<PhotoTask[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    active: 0,
    progress: 0,
  });
  const hasRun = useRef(false);
  const cancelledRef = useRef(false);

  useNianNianAgentOverride({
    pendingCount: Math.max(0, summary.total - summary.completed - summary.failed),
    analyzedCount: summary.completed,
    photoCount: summary.total,
    analyzeActive: summary.active,
    analyzeFailed: summary.failed,
  });

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    const phraseTimer = setInterval(() => {
      if (!cancelledRef.current) {
        setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
      }
    }, 4000);
    return () => clearInterval(phraseTimer);
  }, []);

  const pollStatus = useCallback(async (): Promise<PollPayload> => {
    const pollRes = await fetch(`/api/analyze?familyId=${familyId}`);
    return pollRes.json();
  }, [familyId]);

  const applyPollData = useCallback((pollData: PollPayload) => {
    if (cancelledRef.current) return;
    if (typeof pollData.total === 'number') {
      setSummary({
        total: pollData.total,
        completed: pollData.completed ?? 0,
        failed: pollData.failed ?? 0,
        active: pollData.active ?? 0,
        progress: pollData.progress ?? 0,
      });
    }
    if (Array.isArray(pollData.photos)) {
      setPhotos(pollData.photos);
    }
  }, []);

  const finishSuccess = useCallback(
    (pollData: PollPayload) => {
      if (cancelledRef.current) return;
      const redirectTo = pollData.redirectTo || `/family/${familyId}/photos`;
      setTimeout(() => {
        if (!cancelledRef.current) router.push(redirectTo);
      }, 800);
    },
    [familyId, router]
  );

  const startAnalysis = useCallback(async () => {
    if (cancelledRef.current) return;
    setError('');
    hasRun.current = true;

    try {
      const startRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId }),
      });
      const startData = await startRes.json();

      if (cancelledRef.current) return;

      if (!startRes.ok) {
        setError(startData.error || '启动分析失败');
        hasRun.current = false;
        return;
      }

      if (typeof startData.total === 'number') {
        setSummary((prev) => ({ ...prev, total: startData.total }));
      }

      const startTime = Date.now();

      while (Date.now() - startTime < POLL_TIMEOUT) {
        if (cancelledRef.current) return;

        const pollData = await pollStatus();
        if (cancelledRef.current) return;

        applyPollData(pollData);

        if (pollData.status === 'done' || (pollData.status !== 'error' && isTerminalPoll(pollData))) {
          finishSuccess(pollData);
          return;
        }

        if (pollData.status === 'error') {
          setError(pollData.message || '解析失败，请重试');
          hasRun.current = false;
          return;
        }

        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }

      if (!cancelledRef.current) {
        setError('解析时间较长，可先去照片库查看已完成的结果。');
        hasRun.current = false;
      }
    } catch {
      if (!cancelledRef.current) {
        setError('网络不太稳定，解析可能中断了。你可以重试。');
        hasRun.current = false;
      }
    }
  }, [familyId, pollStatus, applyPollData, finishSuccess]);

  useEffect(() => {
    if (hasRun.current) return;
    startAnalysis();
  }, [startAnalysis]);

  const handleRetryAll = () => {
    hasRun.current = false;
    startAnalysis();
  };

  const handlePhotoRetried = async () => {
    const pollData = await pollStatus();
    applyPollData(pollData);
  };

  return (
    <PageShell minimalHeader bodyClassName="pt-4">
      <PageHero title="念念正在读懂照片" subtitle="并发解析中，完成一张保存一张" />

        <AnalysisProgress
          completed={summary.completed}
          total={summary.total}
          failed={summary.failed}
          active={summary.active}
          className="mb-6"
        />

        {!error && (
          <p className="text-sm text-[#8B7355] font-serif text-center mb-6 animate-fade-in">
            {LOADING_PHRASES[phraseIndex]}
          </p>
        )}

        {photos.length > 0 && (
          <div className="space-y-2 mb-6">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#F0E8D8]"
              >
                {photo.url && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#F0E8D8] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <MemoryCardStatus status={photo.status} />
                  {photo.error && (
                    <p className="text-[10px] text-[#C04040] mt-1 truncate">{photo.error}</p>
                  )}
                </div>
                {photo.status === 'failed' && (
                  <RetryAnalysisButton
                    familyId={familyId}
                    photoId={photo.id}
                    onRetried={handlePhotoRetried}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="p-5 rounded-2xl bg-[#FFF8F0] text-left">
            <p className="text-[#C04040] text-sm leading-relaxed mb-4">{error}</p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRetryAll}
                className="w-full py-3 rounded-xl bg-[#D98A45] text-white text-sm font-medium"
              >
                重新解析
              </button>
              <button
                type="button"
                onClick={() => router.push(`/family/${familyId}/photos`)}
                className="w-full py-3 rounded-xl bg-white border border-[#E8DCC8] text-[#8B7355] text-sm"
              >
                先去照片库查看
              </button>
            </div>
          </div>
        )}
    </PageShell>
  );
}
