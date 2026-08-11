'use client';

import Link from 'next/link';
import { useState, type ComponentType } from 'react';
import { ChevronRight } from 'lucide-react';
import NianNianAvatar from '@/components/NianNianAvatar';
import Header from '@/components/Header';
import {
  BellIcon,
  HeartIcon,
  InfoIcon,
  NavMemoryIcon,
  NavMovieIcon,
  NavStoryIcon,
  SparklesIcon,
  TagIcon,
  type NianNianIconProps,
} from '@/components/icons/NianNianIcons';
import { useAuth } from '@/components/providers/auth-provider';

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="profile-page">
      <Header minimal />

      <div className="profile-body">
        {/* 2. 个人身份卡 */}
        <section className="profile-identity-card">
          <div className="profile-identity-card__avatar">
            <NianNianAvatar variant="small" size={80} edgeSoft />
          </div>
          <div className="profile-identity-card__info">
            <p className="profile-identity-card__title">我的</p>
            <p className="profile-identity-card__phone">
              {loading ? '加载中…' : user?.phoneMasked || user?.phone || '—'}
            </p>
            <span className="profile-identity-card__badge">家庭记忆守护者</span>
            <p className="profile-identity-card__tagline">念念不忘，岁岁年年</p>
          </div>
        </section>

        {/* 3. 快速入口 */}
        <section className="profile-quick-panel">
          <QuickEntry href="/family/memories" icon={NavMemoryIcon} label="我的记忆" />
          <QuickEntry href="/stories" icon={NavStoryIcon} label="我的故事" />
          <QuickEntry href="/movies" icon={NavMovieIcon} label="我的电影" />
        </section>

        {/* 4. 主题与管理 */}
        <section className="profile-card">
          <h2 className="profile-card__heading">主题与管理</h2>
          <MenuRow
            href="/family"
            icon={TagIcon}
            title="我的主题"
            subtitle="按季节、旅行等主题管理记忆"
          />
          <MenuDivider />
          <MenuRow
            href="/appreciate"
            icon={SparklesIcon}
            title="欣赏模式"
            subtitle="大字号浏览，适合与家人一起看"
          />
          <MenuDivider />
          <MenuRow
            icon={BellIcon}
            title="提醒设置"
            subtitle="纪念日与家庭助手"
            badge="即将上线"
          />
        </section>

        {/* 5. 更多 */}
        <section className="profile-card">
          <h2 className="profile-card__heading">更多</h2>
          <MenuRow icon={InfoIcon} title="关于念念年年" subtitle="MVP V3 · 家庭故事流水线" />
          <MenuDivider />
          <MenuRow icon={HeartIcon} title="让每一张照片都成为回家的理由" titleWrap tall />
        </section>

        {/* 6. 退出登录 */}
        {user && (
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="profile-logout-btn"
          >
            {loggingOut ? '退出中…' : '退出登录'}
          </button>
        )}

        {/* 7. 底部品牌陪伴 */}
        <footer className="profile-companion">
          <NianNianAvatar variant="small" size={36} />
          <span className="profile-companion__text">念念年年 · 家庭记忆助手</span>
        </footer>
      </div>
    </div>
  );
}

function QuickEntry({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: ComponentType<NianNianIconProps>;
  label: string;
}) {
  return (
    <Link href={href} className="profile-quick-entry">
      <span className="profile-quick-entry__icon">
        <Icon size={18} />
      </span>
      <span className="profile-quick-entry__label">{label}</span>
    </Link>
  );
}

function MenuRow({
  icon: Icon,
  title,
  subtitle,
  badge,
  href,
  titleWrap,
  tall,
}: {
  icon: ComponentType<NianNianIconProps>;
  title: string;
  subtitle?: string;
  badge?: string;
  href?: string;
  titleWrap?: boolean;
  tall?: boolean;
}) {
  const rowClass = `profile-menu-row${tall ? ' profile-menu-row--tall' : ''}${href ? ' profile-menu-row--link' : ''}`;

  const inner = (
    <>
      <span className="profile-menu-row__icon">
        <Icon size={17} />
      </span>
      <div className="profile-menu-row__text">
        <div className="profile-menu-row__title-line">
          <p className={`profile-menu-row__title${titleWrap ? ' profile-menu-row__title--wrap' : ''}`}>
            {title}
          </p>
          {badge && <span className="profile-menu-row__badge">{badge}</span>}
        </div>
        {subtitle && <p className="profile-menu-row__subtitle">{subtitle}</p>}
      </div>
      {href && (
        <ChevronRight className="profile-menu-row__chevron w-4 h-4 shrink-0" strokeWidth={1.75} />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={rowClass}>
        {inner}
      </Link>
    );
  }

  return <div className={rowClass}>{inner}</div>;
}

function MenuDivider() {
  return <div className="profile-menu-divider" />;
}
