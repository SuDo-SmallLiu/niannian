import type { ComponentType } from 'react';
import { NianNianIconBox, type NianNianIconProps } from '@/components/icons/NianNianIcons';

/** 空状态 / 占位 — 48×48 容器 + 线性图标 */
export default function EmptyStateIcon({
  icon,
  title,
  description,
  className = '',
}: {
  icon: ComponentType<NianNianIconProps>;
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <NianNianIconBox icon={icon} className="mb-4" />
      {title && <p className="text-[#4A3326] font-medium text-base mb-1">{title}</p>}
      {description && <p className="text-[#8E7B6B] text-sm leading-relaxed max-w-xs">{description}</p>}
    </div>
  );
}
