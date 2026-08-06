import type { Metadata } from 'next';
import BottomNav from '@/components/BottomNav';
import AppProviders from '@/components/providers/app-providers';
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
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=Noto+Sans+SC:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased">
        <AppProviders>
          <div className="min-h-screen flex flex-col max-w-md mx-auto bg-[var(--bg-primary)] relative">
            <main className="flex-1">{children}</main>
            <BottomNav />
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
