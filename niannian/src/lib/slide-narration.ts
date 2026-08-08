import type { H5Slide } from '@/lib/h5-story-slides';

/** 从幻灯片提取适合朗读的旁白文本 */
export function getSlideNarrationText(slide: H5Slide): string | null {
  const parts: string[] = [];

  switch (slide.type) {
    case 'cover':
      if (slide.familyName) parts.push(slide.familyName);
      if (slide.title) parts.push(slide.title);
      if (slide.summary) parts.push(slide.summary);
      break;
    case 'interstitial':
      if (slide.interstitialTitle) parts.push(slide.interstitialTitle);
      if (slide.interstitialTheme) parts.push(slide.interstitialTheme);
      break;
    case 'chapter':
      if (slide.narrative) parts.push(slide.narrative);
      else if (slide.memorySnippet) parts.push(slide.memorySnippet);
      break;
    case 'outro':
      if (slide.title) parts.push(slide.title);
      if (slide.summary) parts.push(slide.summary);
      if (slide.connectionAction) parts.push(slide.connectionAction);
      break;
    default:
      break;
  }

  const text = parts.map((p) => p.trim()).filter(Boolean).join('。');
  return text || null;
}

/** 粗略估算朗读时长（毫秒），用于自动播放兜底 */
export function estimateNarrationMs(text: string): number {
  const cjk = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const other = text.length - cjk;
  const seconds = cjk / 4.5 + other / 12;
  return Math.min(Math.max(Math.round(seconds * 1000), 2500), 45000);
}
