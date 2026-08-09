/** 首页背景 — 奶油纸张 + 记忆碎片（3–8% 透明度，非重复 pattern） */
export default function HomeBackgroundDecor() {
  return (
    <div className="home-bg-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* 暖阳光晕 — 老照片被照到的感覺 */}
      <div className="home-bg-sunlight" />

      {/* 奶油纸张质感 — 单层噪点，不平铺 */}
      <div className="home-bg-paper-grain" />

      {/* ── 顶部左侧 · 记忆碎片簇（仅此区域有装饰） ── */}

      {/* 一截胶卷 + 齿孔 */}
      <svg
        className="home-bg-fragment home-bg-film-strip"
        viewBox="0 0 120 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="8" y="6" width="104" height="24" rx="1" stroke="currentColor" strokeWidth="0.8" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={`t-${i}`}
            x={14 + i * 12}
            y="3"
            width="5"
            height="4"
            rx="0.6"
            fill="currentColor"
            opacity="0.6"
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={`b-${i}`}
            x={14 + i * 12}
            y="29"
            width="5"
            height="4"
            rx="0.6"
            fill="currentColor"
            opacity="0.6"
          />
        ))}
        <rect x="22" y="10" width="18" height="16" rx="0.5" fill="currentColor" opacity="0.25" />
        <rect x="44" y="10" width="18" height="16" rx="0.5" fill="currentColor" opacity="0.18" />
        <rect x="66" y="10" width="18" height="16" rx="0.5" fill="currentColor" opacity="0.22" />
      </svg>

      {/* 宝丽来轮廓 */}
      <svg
        className="home-bg-fragment home-bg-polaroid-outline"
        viewBox="0 0 56 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="2" y="2" width="52" height="58" rx="2" stroke="currentColor" strokeWidth="0.9" />
        <rect x="8" y="8" width="40" height="38" rx="1" fill="currentColor" opacity="0.12" />
        <rect x="14" y="50" width="28" height="3" rx="1" fill="currentColor" opacity="0.2" />
      </svg>

      {/* 模糊照片边缘 */}
      <div className="home-bg-photo-edge" />

      {/* 手写日期 */}
      <span className="home-bg-hand-date">2024 · 春</span>

      {/* 小星星 */}
      <span className="home-bg-star home-bg-star--a">✦</span>
      <span className="home-bg-star home-bg-star--b">✧</span>
      <span className="home-bg-star home-bg-star--c">·</span>

      {/* 一小段弧线 */}
      <svg
        className="home-bg-fragment home-bg-arc"
        viewBox="0 0 48 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 28 C 16 8, 32 8, 44 20"
          stroke="currentColor"
          strokeWidth="0.9"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      {/* 光斑 */}
      <div className="home-bg-bokeh home-bg-bokeh--1" />
      <div className="home-bg-bokeh home-bg-bokeh--2" />

      {/* ── 右侧 · 极淡胶片 / 手绘轨迹（单条，不铺满） ── */}
      <svg
        className="home-bg-trail"
        viewBox="0 0 80 420"
        fill="none"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M58 0 C 42 80, 68 160, 52 240 S 38 360, 48 420"
          stroke="currentColor"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeDasharray="3 5"
          fill="none"
        />
        <path
          d="M62 40 C 50 120, 72 200, 56 300"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
          opacity="0.5"
          fill="none"
        />
      </svg>
    </div>
  );
}
