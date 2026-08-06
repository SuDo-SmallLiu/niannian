'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  generateSharePoster,
  downloadPoster,
  sharePosterNative,
  type PosterInput,
} from '@/lib/share-poster';

interface SharePosterModalProps {
  open: boolean;
  onClose: () => void;
  poster: PosterInput | null;
}

export default function SharePosterModal({ open, onClose, poster }: SharePosterModalProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const buildPoster = useCallback(async () => {
    if (!poster) return;
    setGenerating(true);
    setError('');
    try {
      const url = await generateSharePoster(poster);
      setPosterUrl(url);
    } catch {
      setError('海报生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  }, [poster]);

  useEffect(() => {
    if (open && poster) {
      setPosterUrl(null);
      buildPoster();
    }
  }, [open, poster, buildPoster]);

  if (!open || !poster) return null;

  const filename =
    poster.type === 'story'
      ? `念念年年-故事-${Date.now()}.png`
      : `念念年年-记忆-${Date.now()}.png`;

  const handleSave = () => {
    if (posterUrl) downloadPoster(posterUrl, filename);
  };

  const handleNativeShare = async () => {
    if (!posterUrl) return;
    const ok = await sharePosterNative(posterUrl, poster.title);
    if (!ok) handleSave();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(poster.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#F8F4ED] rounded-t-3xl sm:rounded-3xl mx-auto animate-fade-in-up">
        <div className="sticky top-0 bg-[#F8F4ED] px-5 pt-5 pb-3 border-b border-[#E8DCC8] flex items-center justify-between">
          <div>
            <h3 className="text-base font-serif text-[#4B3B2F]">分享海报</h3>
            <p className="text-xs text-[#B8A898] mt-0.5">保存后发送到微信</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white border border-[#E8DCC8] text-[#8B7355] text-sm"
          >
            ✕
          </button>
        </div>

        <div className="p-5">
          {generating && (
            <div className="flex flex-col items-center py-16">
              <div className="w-10 h-10 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin mb-4" />
              <p className="text-sm text-[#B8A898]">正在生成海报…</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-red-500 mb-4">{error}</p>
              <button
                onClick={buildPoster}
                className="px-4 py-2 rounded-xl bg-[#D98A45] text-white text-sm"
              >
                重试
              </button>
            </div>
          )}

          {posterUrl && !generating && (
            <>
              <div className="rounded-2xl overflow-hidden shadow-lg border border-[#E8DCC8] mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={posterUrl} alt="分享海报" className="w-full block" />
              </div>

              <div className="bg-[#FFF8F0] rounded-xl p-3 mb-4 border border-[#F0DCC8]">
                <p className="text-xs text-[#8B7355] leading-relaxed">
                  💬 <strong>微信分享：</strong>保存海报 → 打开微信 → 选择好友或朋友圈 → 发送图片
                </p>
              </div>

              <div className="flex gap-2 mb-3">
                <button
                  onClick={handleSave}
                  className="flex-1 py-3.5 rounded-2xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] transition-colors"
                >
                  📥 保存海报
                </button>
                <button
                  onClick={handleNativeShare}
                  className="flex-1 py-3.5 rounded-2xl border border-[#D98A45] text-[#D98A45] text-sm font-medium hover:bg-[#FFF8F0] transition-colors"
                >
                  📤 系统分享
                </button>
              </div>

              <button
                onClick={handleCopyLink}
                className="w-full py-3 rounded-xl bg-white border border-[#E8DCC8] text-sm text-[#8B7355] hover:border-[#D98A45]/40 transition-colors"
              >
                {copied ? '✓ 链接已复制' : '🔗 复制查看链接'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
