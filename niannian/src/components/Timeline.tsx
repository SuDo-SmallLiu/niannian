'use client';

interface TimelineProps {
  items: Array<{ year: string; event: string }>;
}

export default function Timeline({ items }: TimelineProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className="relative pl-8">
      {/* 竖线 */}
      <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[#e8e0d8]" />

      <div className="space-y-6">
        {items.map((item, i) => (
          <div
            key={i}
            className="relative animate-fade-in-up"
            style={{ animationDelay: `${i * 0.15}s` }}
          >
            {/* 圆点 */}
            <div className="absolute -left-[21px] top-1.5 w-3 h-3 rounded-full bg-[#d4786e] ring-4 ring-[#faf8f5]" />

            {/* 年份 */}
            <span className="inline-block text-sm font-medium text-[#d4786e] mb-1">
              {item.year}
            </span>

            {/* 事件 */}
            <p className="text-[#2d2a26] leading-relaxed">{item.event}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
