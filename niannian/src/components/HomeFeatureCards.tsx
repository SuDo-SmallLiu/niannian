'use client';

import Link from 'next/link';

function VintageCameraIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect x="4" y="12" width="32" height="22" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="23" r="7" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="23" r="3.5" fill="currentColor" opacity="0.35" />
      <path d="M14 12V9a2 2 0 012-2h8a2 2 0 012 2v3" stroke="currentColor" strokeWidth="2" />
      <rect x="30" y="15" width="3" height="2.5" rx="0.8" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function FilmReelIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className} aria-hidden>
      <rect x="6" y="10" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10V8M20 10V8M28 10V8M12 30V32M20 30V32M28 30V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="20" r="5" stroke="currentColor" strokeWidth="2" />
      <path d="M17 20l2.5 2.5L24 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface HomeFeatureCardsProps {
  onCreate: () => void;
}

export default function HomeFeatureCards({ onCreate }: HomeFeatureCardsProps) {
  return (
    <div className="home-feature-cards px-4 pb-4">
      <div className="home-guide-block max-w-[390px] mx-auto">
        <h2 className="home-guide-title">
          今天，我们的镜头
          <br className="sm:hidden" />
          要对准哪里呢？
        </h2>
        <div className="home-guide-decor" aria-hidden>
          <span>——</span>
          <span className="text-[#F6B51B]">♥</span>
          <span>——</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[12px] max-w-[390px] mx-auto">
        <button type="button" onClick={onCreate} className="home-feature-card home-feature-card--create">
          <div className="home-feature-card__icon home-feature-card__icon--create">
            <VintageCameraIcon className="w-[34px] h-[34px]" />
          </div>
          <h3 className="home-feature-card__title">我要创造</h3>
          <p className="home-feature-card__desc">让照片变成故事与人生电影</p>
          <span className="home-feature-card__cta">开始记录 →</span>
        </button>

        <Link href="/appreciate" className="home-feature-card home-feature-card--appreciate">
          <div className="home-feature-card__icon home-feature-card__icon--appreciate">
            <FilmReelIcon className="w-[34px] h-[34px]" />
          </div>
          <h3 className="home-feature-card__title">我要欣赏</h3>
          <p className="home-feature-card__desc">重温那些被念念珍藏的时光</p>
          <span className="home-feature-card__cta">去看看 →</span>
        </Link>
      </div>
    </div>
  );
}
