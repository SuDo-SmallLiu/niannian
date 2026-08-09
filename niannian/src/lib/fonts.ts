import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google';

/** 构建时自托管中文字体，避免 Google Fonts CDN 不可用导致乱码或排版异常 */
export const notoSansSC = Noto_Sans_SC({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-noto-sans',
  display: 'swap',
  fallback: ['PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
  preload: true,
});

export const notoSerifSC = Noto_Serif_SC({
  weight: ['400', '600', '700'],
  subsets: ['latin'],
  variable: '--font-noto-serif',
  display: 'swap',
  fallback: ['Songti SC', 'STSong', 'SimSun', 'serif'],
  preload: true,
});
