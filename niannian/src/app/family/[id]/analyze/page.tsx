'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import AnalysisProgress from '@/components/memory/AnalysisProgress';
import PageShell from '@/components/PageShell';
import PageHero from '@/components/PageHero';
import MemoryCardStatus, {
  type MemoryCardAnalysisStatus,
} from '@/components/memory/MemoryCardStatus';
import RetryAnalysisButton from '@/components/memory/RetryAnalysisButton';
import { useNianNianAgentOverride } from '@/components/providers/niannian-agent-provider';
import { watchPhotoAnalysisJob } from '@/lib/poll-job';

const LOADING_PHRASES = [
  '正在翻阅相册……',
  '正在寻找那些一起走过的日子……',
  '正在辨认每一张熟悉的脸……',
  '正在发现那些悄悄发生的变化……',
  '正在整理属于家的故事……',
];

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

export default function AnalyzePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
          <div className="w-8 h-8 border-2 border-[#D98A45]/30 border-t-[#D98A45] rounded-full animate-spin" />
        </div>
      }
    >
      <AnalyzePageContent />
    </Suspense>
  );
}

function AnalyzePageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const familyId = params.id as string;
  const enableOcr = searchParams.get('ocr') === '1';
  const photoIdsParam = searchParams.get('photoIds');
  const targetPhotoIds = photoIdsParam
    ? photoIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

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

  const refreshAnalyzeView = useCallback(async () => {
    const pollData = await pollStatus();
    if (cancelledRef.current) return pollData;
    applyPollData(pollData);
    return pollData;
  }, [pollStatus, applyPollData]);

  const startAnalysis = useCallback(async () => {
    if (cancelledRef.current) return;
    setError('');
    hasRun.current = true;

    try {
      const startRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          familyId,
          enableOcr,
          ...(targetPhotoIds?.length ? { photoIds: targetPhotoIds } : {}),
        }),
      });
      const startData = await startRes.json();

      if (cancelledRef.current) return;

      if (!startRes.ok) {
        setError(startData.error || '启动分析失败');
        hasRun.current = false;
        return;
      }

      const jobId = startData.jobId as string | undefined;
      if (!jobId) {
        setError('未收到任务 ID');
        hasRun.current = false;
        return;
      }

      if (typeof startData.total === 'number') {
        setSummary((prev) => ({ ...prev, total: startData.total }));
      }

      await refreshAnalyzeView();

      const result = await watchPhotoAnalysisJob(jobId, {
        timeoutMs: POLL_TIMEOUT,
        onSnapshot: (snapshot) => {
          if (cancelledRef.current) return;
          setSummary((prev) => ({ ...prev, ...snapshot }));
        },
        onProgress: () => {
          void refreshAnalyzeView();
        },
      });

      if (cancelledRef.current) return;

      const pollData = await refreshAnalyzeView();
      if (result.status === 'error') {
        setError((result.error as string) || pollData?.message || '解析失败，请重试');
        hasRun.current = false;
        return;
      }

      finishSuccess(pollData || { redirectTo: `/family/${familyId}/photos` });
    } catch (err) {
      if (!cancelledRef.current) {
        const msg = err instanceof Error ? err.message : '网络不太稳定，解析可能中断了。';
        setError(msg.includes('超时') ? '解析时间较长，可先去照片库查看已完成的结果。' : msg);
        hasRun.current = false;
      }
    }
  }, [familyId, refreshAnalyzeView, finishSuccess, enableOcr, targetPhotoIds]);

  useEffect(() => {
    if (hasRun.current) return;
    startAnalysis();
  }, [startAnalysis]);

  const handleRetryAll = () => {
    hasRun.current = false;
    startAnalysis();
  };

  const handlePhotoRetried = async () => {
    await refreshAnalyzeView();
  };

  return (
    <PageShell minimalHeader bodyClassName="pt-4">
      <PageHero
        title={enableOcr ? '念念正在识别老照片' : '念念正在读懂照片'}
        subtitle={enableOcr ? '场景理解 + 图中文字 OCR' : '并发解析中，完成一张保存一张'}
      />

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
