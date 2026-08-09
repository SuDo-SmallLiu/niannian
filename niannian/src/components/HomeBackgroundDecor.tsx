/** 首页极浅背景纹理 — 不喧宾夺主 */
export default function HomeBackgroundDecor() {
  return (
    <div className="home-bg-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 极淡胶片边框 */}
      <div className="home-bg-film-frame" />
      {/* 宝丽来轮廓 */}
      <div className="home-bg-polaroid home-bg-polaroid--1" />
      <div className="home-bg-polaroid home-bg-polaroid--2" />
      {/* 微弱光斑 */}
      <div className="home-bg-orb home-bg-orb--1" />
      <div className="home-bg-orb home-bg-orb--2" />
      {/* 小星星 */}
      <span className="home-bg-star home-bg-star--1">✦</span>
      <span className="home-bg-star home-bg-star--2">✧</span>
      <span className="home-bg-star home-bg-star--3">✦</span>
      {/* 照片角 */}
      <div className="home-bg-corner home-bg-corner--tl" />
      <div className="home-bg-corner home-bg-corner--br" />
    </div>
  );
}
