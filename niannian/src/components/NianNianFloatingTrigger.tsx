'use client';

const WAVE_POSTER = '/niannian/mascot-wave-poster.png';

interface NianNianFloatingTriggerProps {
  onClick: () => void;
  size?: number;
  ariaLabel?: string;
  className?: string;
}

/** 右下角念念 — 全平台使用透明 PNG，避免各浏览器视频黑框/白框 */
export default function NianNianFloatingTrigger({
  onClick,
  size = 80,
  ariaLabel = '念念帮助台',
  className = '',
}: NianNianFloatingTriggerProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`bg-transparent border-0 p-0 shadow-none active:scale-95 transition-transform animate-breathe touch-manipulation ${className}`}
      aria-label={ariaLabel}
      style={{ width: size, height: size, minWidth: 44, minHeight: 44 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WAVE_POSTER}
        alt="念念"
        width={size}
        height={size}
        className="w-full h-full object-contain niannian-shadow pointer-events-none"
        draggable={false}
      />
    </button>
  );
}
