'use client';

import Header from '@/components/Header';

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F4ED]">
      <Header />
      <main className="flex-1 px-6 py-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-serif text-[#4B3B2F] mb-2">我的</h1>
          <p className="text-sm text-[#B8A898]">个人设置与数据管理</p>
        </div>

        {/* 用户信息区域 */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E8DCC8] mb-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FFF8F0] flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">👤</span>
          </div>
          <h3 className="text-lg font-serif text-[#4B3B2F]">用户</h3>
          <p className="text-sm text-[#B8A898] mt-1">家庭记忆守护者</p>
        </div>

        {/* 设置列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8DCC8] overflow-hidden mb-4">
          <MenuItem
            icon="🏠"
            title="我的主题"
            subtitle="管理和切换记忆主题"
            onClick={() => (window.location.href = '/family')}
          />
          <Divider />
          <MenuItem
            icon="📖"
            title="我的故事"
            subtitle="查看所有生成的家庭故事"
            onClick={() => (window.location.href = '/stories')}
          />
          <Divider />
          <MenuItem
            icon="🔔"
            title="提醒设置"
            subtitle="设置纪念日提醒"
            subtitle2="即将上线"
          />
          <Divider />
          <MenuItem
            icon="💾"
            title="数据管理"
            subtitle="导出或清空家庭数据"
            subtitle2="即将上线"
          />
        </div>

        {/* 关于 */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8DCC8] overflow-hidden">
          <MenuItem
            icon="ℹ️"
            title="关于念念年年"
            subtitle="v0.1.0"
          />
          <Divider />
          <MenuItem
            icon="❤️"
            title="让每一张照片都成为回家的理由"
            subtitle="念念不忘，岁岁年年"
          />
        </div>

        <p className="text-center text-xs text-[#D8CCB8] mt-8 mb-4">
          NIAN NIAN — 家庭记忆连接器
        </p>
      </main>
    </div>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  subtitle2,
  onClick,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  subtitle2?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-5 py-4 ${
        onClick ? 'cursor-pointer hover:bg-[#FFF8F0] active:bg-[#F0DCC8] transition-colors' : ''
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-[#4B3B2F]">{title}</p>
        <p className="text-xs text-[#B8A898]">{subtitle}</p>
        {subtitle2 && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#F0E8D8] text-[10px] text-[#B8A898]">
            {subtitle2}
          </span>
        )}
      </div>
      {onClick && <span className="text-[#D8CCB8] text-sm">→</span>}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-[#F0E8D8] mx-5" />;
}
