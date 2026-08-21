'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import HomeBackgroundDecor from '@/components/HomeBackgroundDecor';
import HomeAgentHeader from '@/components/home/HomeAgentHeader';
import HomeAgentHero from '@/components/home/HomeAgentHero';
import HomeModeTabs from '@/components/home/HomeModeTabs';
import HomeActionGrid from '@/components/home/HomeActionGrid';
import HomeRecentUploads from '@/components/home/HomeRecentUploads';
import HomeChatComposer from '@/components/home/HomeChatComposer';
import { getLastFamilyId, setLastFamilyId } from '@/lib/family-storage';
import { getMemoryCardStatus } from '@/lib/memory-card-completion';

interface HomeAgentPageProps {
  onCreateFamily: () => void;
}

interface FamilyBrief {
  id: string;
  name: string;
}

export default function HomeAgentPage({ onCreateFamily }: HomeAgentPageProps) {
  const [mode, setMode] = useState<'create' | 'appreciate'>('create');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [lastPhotoId, setLastPhotoId] = useState<string | null>(null);
  const [chatExpanded, setChatExpanded] = useState(false);

  const loadContext = useCallback(async () => {
    try {
      const [agentRes, familyRes] = await Promise.all([
        fetch('/api/agent/context'),
        fetch('/api/family'),
      ]);

      let resolvedFamilyId: string | null = getLastFamilyId();

      if (agentRes.ok) {
        const agentData = await agentRes.json();
        if (agentData.familyId) resolvedFamilyId = agentData.familyId;
      }

      if (familyRes.ok) {
        const familyData = await familyRes.json();
        const families = (familyData.families || []) as FamilyBrief[];
        if (!resolvedFamilyId && families[0]?.id) {
          resolvedFamilyId = families[0].id;
        }
      }

      if (resolvedFamilyId) {
        setFamilyId(resolvedFamilyId);
        setLastFamilyId(resolvedFamilyId);

        const photosRes = await fetch(
          `/api/photos?familyId=${encodeURIComponent(resolvedFamilyId)}`
        );
        if (photosRes.ok) {
          const photosData = await photosRes.json();
          const photos = photosData.photos || [];
          if (photos.length > 0) {
            setLastPhotoId(photos[photos.length - 1].id);
          }

          const needsSupplement = photos.find(
            (p: { id: string; memoryCard?: unknown }) =>
              p.memoryCard && getMemoryCardStatus(p.memoryCard) === 'needs_supplement'
          );
          if (needsSupplement) {
            setLastPhotoId(needsSupplement.id);
          }
        }
      }
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const scrollPadding = useMemo(
    () => (chatExpanded ? 'pb-[280px]' : 'pb-[140px]'),
    [chatExpanded]
  );

  return (
    <div className="home-agent-page flex-1 min-h-0 flex flex-col bg-[#F8F4ED] overflow-hidden relative">
      <HomeBackgroundDecor />

      <div className={`relative z-10 flex-1 min-h-0 overflow-y-auto ${scrollPadding}`}>
        <HomeAgentHeader />
        <HomeAgentHero />
        <HomeModeTabs mode={mode} onModeChange={setMode} />
        {mode === 'create' ? (
          <>
            <HomeActionGrid familyId={familyId} onCreateFamily={onCreateFamily} />
            <HomeRecentUploads familyId={familyId} />
          </>
        ) : (
          <div className="px-4 pb-4 max-w-[390px] mx-auto text-center">
            <p className="text-sm text-[#8B7355] leading-relaxed">
              欣赏模式帮你轻松听故事、看照片、看人生电影。
              <br />
              点上方「我要欣赏」进入，或直接告诉念念你想看什么。
            </p>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 max-w-lg mx-auto">
        <HomeChatComposer
          familyId={familyId}
          lastPhotoId={lastPhotoId}
          onExpandChange={setChatExpanded}
        />
      </div>
    </div>
  );
}
