'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

const LOADING_PHRASES = [
  '正在翻阅相册……',
  '正在寻找那些一起走过的日子……',
  '正在辨认每一张熟悉的脸……',
  '正在发现那些悄悄发生的变化……',
  '正在寻找陪伴的痕迹……',
  '正在记录成长的模样……',
  '正在整理属于家的故事……',
  '正在寻找那些没有说出口的话……',
];

const POLL_INTERVAL = 3000; // 3秒轮询一次
const POLL_TIMEOUT = 120000; // 总共等待最多2分钟

export default function AnalyzePage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [dots, setDots] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const hasRun = useRef(false);

  // 循环切换短语
  useEffect(() => {
    const phraseTimer = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 4000);
    return () => clearInterval(phraseTimer);
  }, []);

  // 点点动画
  useEffect(() => {
    const dotTimer = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 600);
    return () => clearInterval(dotTimer);
  }, []);

  // 触发 AI 分析 + 轮询状态
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    async function startAndPoll() {
      try {
        // Step 1: 启动分析
        const startRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ familyId }),
        });
        const startData = await startRes.json();

        if (!startRes.ok) {
          setError(startData.error || '启动分析失败');
          return;
        }

        // Step 2: 轮询等待结果
        const startTime = Date.now();

        while (Date.now() - startTime < POLL_TIMEOUT) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL));

          // 更新进度条
          setProgress((prev) => Math.min(prev + 8, 90));

          const pollRes = await fetch(`/api/analyze?familyId=${familyId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'done' && pollData.story) {
            setProgress(100);
            // 跳转故事页
            setTimeout(() => {
              router.push(`/family/${familyId}/story?storyId=${pollData.story.id}`);
            }, 500);
            return;
          }

          if (pollData.status === 'error') {
            setError(pollData.message || '分析失败，请重试');
            return;
          }
          // status === 'processing' 继续轮询
        }

        // 超时
        setError('分析超时，但可能仍在后台处理中。请稍后查看故事页面。');
      } catch {
        setError('网络错误，分析中断');
      }
    }

    startAndPoll();
  }, [familyId, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-[280px] text-center">
        {/* 电影放映机图标 */}
        <div className="mb-12">
          <div className="w-20 h-20 mx-auto rounded-full bg-[#D98A45]/10 flex items-center justify-center animate-soft-pulse">
            <span className="text-3xl">🎞️</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-6">
          <div className="w-full h-1.5 bg-[#F0E8D8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D98A45] rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[#B8A898] mt-2">{progress > 0 ? 'AI 正在分析中…' : '正在连接 AI…'}</p>
        </div>

        {/* 动态短语 */}
        <div className="h-16 flex items-center justify-center mb-4">
          <p
            key={phraseIndex}
            className="text-[#8B7355] text-base font-serif animate-fade-in leading-relaxed"
          >
            {LOADING_PHRASES[phraseIndex]}
            <span className="inline-block w-5 text-left text-[#D98A45]">{dots}</span>
          </p>
        </div>

        {/* 进度点 */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {LOADING_PHRASES.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${
                i <= phraseIndex ? 'bg-[#D98A45]' : 'bg-[#E8DCC8]'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mt-8 p-4 rounded-xl bg-[#FFF8F0] text-[#C04040] text-sm">
            <p>{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push(`/family/${familyId}/upload`)}
                className="mt-3 text-[#D98A45] underline underline-offset-2"
              >
                返回重新上传
              </button>
              <button
                onClick={() => router.push(`/family/${familyId}`)}
                className="mt-3 text-[#D98A45] underline underline-offset-2"
              >
                查看家庭主页
              </button>
            </div>
          </div>
        )}

        {/* 底部 */}
        <p className="mt-16 text-xs text-[#D8CCB8] animate-fade-in-up delay-1000">
          每张照片都是时间的书签
        </p>
      </div>
    </div>
  );
}
