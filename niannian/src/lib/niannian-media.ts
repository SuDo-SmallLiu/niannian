export type NianNianRenderMode = 'webm-alpha' | 'canvas-chroma';

/** 源视频背景色（米色），Canvas 抠像用 */
export const NIANNIAN_CHROMA_KEY = { r: 247, g: 243, b: 235 } as const;

/**
 * 仅 Chrome / Firefox / Edge 等明确支持 VP9 透明 WebM 的环境走 webm；
 * 其余（iOS、Safari、微信、QQ 及所有内置浏览器）统一 Canvas 抠像，避免黑框/白框。
 */
export function detectNianNianRenderMode(): NianNianRenderMode {
  if (typeof window === 'undefined') return 'canvas-chroma';

  const ua = navigator.userAgent;
  const isIOS =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|OPR|Opera/i.test(ua);
  const isInApp =
    /MicroMessenger/i.test(ua) ||
    /QQ\//i.test(ua) ||
    /Weibo/i.test(ua) ||
    /DingTalk/i.test(ua) ||
    /AlipayClient/i.test(ua) ||
    /UCBrowser/i.test(ua) ||
    /HuaweiBrowser/i.test(ua) ||
    /MiuiBrowser/i.test(ua) ||
    /VivoBrowser/i.test(ua);

  if (isIOS || isSafari || isInApp) return 'canvas-chroma';

  const video = document.createElement('video');
  const vp9 = video.canPlayType('video/webm; codecs="vp9"');
  if (vp9 === 'probably') return 'webm-alpha';

  return 'canvas-chroma';
}

export function applyNianNianChromaKey(imageData: ImageData): void {
  const { r: kr, g: kg, b: kb } = NIANNIAN_CHROMA_KEY;
  const threshold = 38;
  const soft = 24;
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    const dr = d[i]! - kr;
    const dg = d[i + 1]! - kg;
    const db = d[i + 2]! - kb;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < threshold) {
      d[i + 3] = 0;
    } else if (dist < threshold + soft) {
      d[i + 3] = Math.round(((dist - threshold) / soft) * 255);
    }
  }
}
