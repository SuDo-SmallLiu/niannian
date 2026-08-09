import type { Metadata } from 'next';
import NavShell from '@/components/NavShell';
import AppProviders from '@/components/providers/app-providers';
import { notoSansSC, notoSerifSC } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: '念念年年 — 让照片重新成为家人的连接',
  description: 'AI 不是电子相册，而是家庭记忆导演。上传家庭照片，发现属于家的故事。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="zh-CN"
      className={`${notoSansSC.variable} ${notoSerifSC.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${notoSansSC.className} min-h-screen antialiased bg-[var(--bg-primary)] text-[var(--text-primary)]`}
      >
        <AppProviders>
          <div className="app-shell">
            <main className="app-shell__main">{children}</main>
            <NavShell />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
