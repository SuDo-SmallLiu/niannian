'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  generateSharePoster,
  downloadPoster,
  sharePosterNative,
  type PosterInput,
} from '@/lib/share-poster';
import { posterFilename, saveOrSharePoster } from '@/lib/share-poster-utils';

interface SharePosterModalProps {
  open: boolean;
  onClose: () => void;
  poster: PosterInput | null;
}

export default function SharePosterModal({ open, onClose, poster }: SharePosterModalProps) {
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [saveHint, setSaveHint] = useState('');
  const [autoHandled, setAutoHandled] = useState(false);

  const filename = poster ? posterFilename(poster.type) : '';

  const handleSave = useCallback(async () => {
    if (!posterUrl || !poster) return;
    const result = await saveOrSharePoster(posterUrl, poster.title, filename);
    if (result === 'shared') {
      setSaveHint('已打开分享，请选择微信发送');
    } else if (result === 'downloaded') {
      setSaveHint('海报已保存，可在相册或下载中找到');
    } else {
      setSaveHint('请长按海报图片保存到相册');
    }
  }, [posterUrl, poster, filename]);

  const handleWeChatShare = async () => {
    if (!posterUrl || !poster) return;
    const ok = await sharePosterNative(posterUrl, poster.title);
    if (ok) {
      setSaveHint('已打开分享，请选择微信');
    } else {
      await handleSave();
    }
  };

  const buildPoster = useCallback(async () => {
    if (!poster) return;
    setGenerating(true);
    setError('');
    setSaveHint('');
    setAutoHandled(false);
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

  useEffect(() => {
    if (!posterUrl || !poster || autoHandled) return;
    setAutoHandled(true);
    void (async () => {
      const result = await saveOrSharePoster(posterUrl, poster.title, filename);
      if (result === 'shared') {
        setSaveHint('已打开分享，请选择微信发送');
      } else if (result === 'downloaded') {
        setSaveHint('海报已自动保存');
      } else {
        setSaveHint('长按海报可保存到相册');
      }
    })();
  }, [posterUrl, poster, filename, autoHandled]);

  if (!open || !poster) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
        <p className="text-white/80 text-sm">分享海报</p>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 text-white text-sm"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 flex items-center justify-center min-h-0">
        {generating && (
          <div className="flex flex-col items-center py-16">
            <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
            <p className="text-sm text-white/70">正在生成海报…</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-300 mb-4">{error}</p>
            <button
              type="button"
              onClick={buildPoster}
              className="px-4 py-2 rounded-xl bg-[#D98A45] text-white text-sm"
            >
              重试
            </button>
          </div>
        )}

        {posterUrl && !generating && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={posterUrl}
            alt="分享海报"
            className="w-full max-w-sm rounded-2xl shadow-2xl select-none touch-manipulation"
            onContextMenu={(e) => e.preventDefault()}
          />
        )}
      </div>

      {posterUrl && !generating && (
        <div className="shrink-0 px-4 pb-6 pt-3 safe-area-pb">
          {saveHint && (
            <p className="text-center text-xs text-white/60 mb-3">{saveHint}</p>
          )}
          <div className="flex gap-2 max-w-sm mx-auto">
            <button
              type="button"
              onClick={handleWeChatShare}
              className="flex-1 py-3.5 rounded-2xl bg-[#07C160] text-white text-sm font-medium"
            >
              分享到微信
            </button>
            <button
              type="button"
              onClick={() => posterUrl && downloadPoster(posterUrl, filename)}
              className="flex-1 py-3.5 rounded-2xl bg-[#D98A45] text-white text-sm font-medium"
            >
              保存到相册
            </button>
          </div>
          <p className="text-center text-[11px] text-white/40 mt-3">
            也可长按海报图片保存
          </p>
        </div>
      )}
    </div>
  );
}
