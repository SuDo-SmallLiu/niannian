import type { ComponentType, ReactNode, SVGProps } from 'react';

export type NianNianIconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

const defaults = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function IconBase({ size = 24, className = '', children, ...rest }: NianNianIconProps & { children: ReactNode }) {
  return (
    <svg
      {...defaults}
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

/** 首页 */
export function NavHomeIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </IconBase>
  );
}

/** 记忆卡 */
export function NavMemoryIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </IconBase>
  );
}

/** 故事 */
export function NavStoryIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4h11a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 8h6M9 12h4" />
    </IconBase>
  );
}

/** 电影 */
export function NavMovieIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M7 6v12M17 6v12M3 12h18" />
    </IconBase>
  );
}

/** 我的 */
export function NavProfileIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
    </IconBase>
  );
}

export function PhotoIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m3 16 5-5 4 4 3-3 6 6" />
    </IconBase>
  );
}

export function CameraIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M8 7h2l1.5-2h5L18 7h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
      <circle cx="12" cy="13" r="3.5" />
    </IconBase>
  );
}

export function PersonIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="3" />
      <path d="M6 20c0-3 2.5-5 6-5s6 2 6 5" />
    </IconBase>
  );
}

export function LocationIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </IconBase>
  );
}

export function TimeIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </IconBase>
  );
}

export function ShareIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="18" cy="5" r="2" />
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="19" r="2" />
      <path d="M8 11.5 16 6.5M8 12.5l8 5" />
    </IconBase>
  );
}

export function TagIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12V4h8l8 8-8 8-8-8Z" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function SparklesIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
      <path d="M12 8.5 13.2 11.8 16.5 13l-3.3 1.2L12 17.5 10.8 14.2 7.5 13l3.3-1.2L12 8.5Z" />
    </IconBase>
  );
}

export function BellIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M18 16H6l1.4-1.4A2 2 0 0 0 8 13.2V10a4 4 0 1 1 8 0v3.2c0 .5.2 1 .6 1.4L18 16Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function InfoIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 10v6M12 8h.01" />
    </IconBase>
  );
}

export function HeartIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.6-7 10-7 10Z" />
    </IconBase>
  );
}

export function FolderIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8h5l2 2h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" />
    </IconBase>
  );
}

export function EditIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </IconBase>
  );
}

export function RefreshIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4v5h5" />
      <path d="M20 20v-5h-5" />
      <path d="M20.5 9A8 8 0 0 0 6 7.5M3.5 15A8 8 0 0 0 18 16.5" />
    </IconBase>
  );
}

export function CheckIcon(props: NianNianIconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12.5 9.5 17 19 7" />
    </IconBase>
  );
}

export const NAV_ICONS = {
  home: NavHomeIcon,
  memory: NavMemoryIcon,
  story: NavStoryIcon,
  movie: NavMovieIcon,
  profile: NavProfileIcon,
} as const;

/** 48×48 展示容器 + 24×24 图标 */
export function NianNianIconBox({
  icon: Icon,
  active = false,
  className = '',
}: {
  icon: ComponentType<NianNianIconProps>;
  active?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${
        active ? 'bg-[rgba(223,139,58,0.12)] text-[#DF8B3A]' : 'bg-[rgba(74,51,38,0.05)] text-[#4A3326]'
      } ${className}`}
    >
      <Icon size={24} />
    </span>
  );
}
