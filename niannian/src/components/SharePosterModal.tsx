'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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

  const filename = poster ? posterFilename(poster.type) : '';

  const buildPoster = useCallback(async () => {
    if (!poster) return;
    setGenerating(true);
    setError('');
    setSaveHint('');
    try {
      const url = await generateSharePoster(poster);
      setPosterUrl(url);
      const result = await saveOrSharePoster(url, poster.title, filename);
      if (result === 'shared') setSaveHint('已打开分享，请选择微信');
      else if (result === 'downloaded') setSaveHint('海报已自动保存');
      else setSaveHint('长按海报可保存到相册');
    } catch {
      setError('海报生成失败，请重试');
    } finally {
      setGenerating(false);
    }
  }, [poster, filename]);

  useEffect(() => {
    if (open && poster) {
      setPosterUrl(null);
      buildPoster();
    }
  }, [open, poster, buildPoster]);

  const handleWeChatShare = async () => {
    if (!posterUrl || !poster) return;
    const ok = await sharePosterNative(posterUrl, poster.title);
    if (ok) setSaveHint('已打开分享，请选择微信');
    else if (posterUrl) downloadPoster(posterUrl, filename);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden bg-[#1a1612] border-none text-white [&>button]:text-white [&>button]:opacity-80">
        <DialogHeader className="p-4 pb-2 text-left">
          <DialogTitle className="text-white text-lg">分享海报</DialogTitle>
          <DialogDescription className="text-white/60 text-sm">
            保存或发送到微信，与家人分享
          </DialogDescription>
        </DialogHeader>

        <div className="px-4 flex items-center justify-center min-h-[360px]">
          {generating && (
            <div className="flex flex-col items-center py-12">
              <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-sm text-white/70">正在生成海报…</p>
            </div>
          )}
          {error && (
            <div className="text-center py-8">
              <p className="text-sm text-red-300 mb-4">{error}</p>
              <Button variant="secondary" onClick={buildPoster}>
                重试
              </Button>
            </div>
          )}
          {posterUrl && !generating && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={posterUrl} alt="分享海报" className="w-full rounded-xl shadow-2xl" />
          )}
        </div>

        {posterUrl && !generating && (
          <div className="p-4 pt-2 space-y-3">
            {saveHint && <p className="text-center text-xs text-white/60">{saveHint}</p>}
            <div className="flex gap-2">
              <Button variant="wechat" className="flex-1" onClick={handleWeChatShare}>
                分享到微信
              </Button>
              <Button
                className="flex-1"
                onClick={() => posterUrl && downloadPoster(posterUrl, filename)}
              >
                保存到相册
              </Button>
            </div>
            <p className="text-center text-[11px] text-white/40">长按海报图片也可保存</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
