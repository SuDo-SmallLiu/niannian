'use client';

import NianNianAvatar from '@/components/NianNianAvatar';
import { useAuth } from '@/components/providers/auth-provider';

export default function HomeAgentHero() {
  const { user } = useAuth();
  const displayName = user?.name?.trim() || '朋友';

  return (
    <section className="home-agent-hero shrink-0 px-4 pb-2 text-center">
      <p className="text-[15px] leading-relaxed text-[#4A3326] mb-3 px-2">
        Hello {displayName}，👋{' '}
        <span className="text-[#DF8B3A] font-medium">我是念念</span>。
        <br />
        我可以帮你上传照片并处理，你想做些什么呢？
      </p>
      <div className="flex justify-center -mb-2">
        <NianNianAvatar variant="hero" size={200} animate edgeSoft />
      </div>
    </section>
  );
}
