'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';

interface HomeLoginPanelProps {
  redirect?: string;
  compact?: boolean;
}

export default function HomeLoginPanel({ redirect = '/', compact = false }: HomeLoginPanelProps) {
  const router = useRouter();
  const { refresh } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [displayCode, setDisplayCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const afterLogin = async () => {
    await refresh();
    if (redirect && redirect !== '/') {
      router.replace(redirect);
    }
  };

  const handleQuickLogin = async () => {
    setError('');
    if (!phone.trim() || phone.length !== 11) {
      setError('请输入 11 位手机号');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/quick-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }
      if (data.code) {
        setDisplayCode(data.code);
        setCode(data.code);
      }
      await afterLogin();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleGetCode = async () => {
    setError('');
    if (!phone.trim() || phone.length !== 11) {
      setError('请输入 11 位手机号');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '获取失败');
        return;
      }
      if (data.code) {
        setDisplayCode(data.code);
        setCode(data.code);
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithCode = async () => {
    setError('');
    if (!phone.trim() || !code.trim()) {
      setError('请输入手机号和验证码');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败');
        return;
      }
      await afterLogin();
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full max-w-xs mx-auto px-5 animate-fade-in ${compact ? 'pt-2' : 'pt-4'}`}>
      <div className="text-center mb-5">
        <p className="text-xs tracking-[0.2em] text-[#D98A45] font-medium mb-1">登录念念年年</p>
        <p className="text-sm text-[#B8A898]">输入手机号即可进入，无需短信</p>
      </div>

      <div className="space-y-3 mb-4">
        <input
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="请输入 11 位手机号"
          className="w-full px-5 py-3.5 rounded-2xl bg-white border border-[#E8DCC8] text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:ring-2 focus:ring-[#D98A45]/20 focus:border-[#D98A45]"
        />

        {displayCode && (
          <div className="p-3 rounded-2xl bg-[#FFF8F0] border border-[#E8DCC8] text-center">
            <p className="text-xs text-[#B8A898] mb-1">你的验证码</p>
            <p className="text-2xl font-mono font-bold text-[#D98A45] tracking-[0.25em]">{displayCode}</p>
          </div>
        )}

        <input
          type="text"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="验证码（一键登录可自动填入）"
          className="w-full px-5 py-3.5 rounded-2xl bg-white border border-[#E8DCC8] text-[#4B3B2F] placeholder:text-[#D8CCB8] focus:outline-none focus:ring-2 focus:ring-[#D98A45]/20 focus:border-[#D98A45]"
        />
      </div>

      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm text-center">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleQuickLogin}
        disabled={loading}
        className="w-full py-4 rounded-2xl bg-[#D98A45] text-white font-serif text-lg hover:bg-[#C47A3A] disabled:opacity-50 active:scale-[0.98] mb-2"
      >
        {loading ? '登录中…' : '一键登录'}
      </button>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleGetCode}
          disabled={loading}
          className="flex-1 py-3 rounded-xl border border-[#E8DCC8] text-[#8B7355] text-sm disabled:opacity-40"
        >
          获取验证码
        </button>
        <button
          type="button"
          onClick={handleLoginWithCode}
          disabled={loading || code.length !== 6}
          className="flex-1 py-3 rounded-xl bg-[#FFF8F0] text-[#D98A45] text-sm font-medium border border-[#E8DCC8] disabled:opacity-40"
        >
          验证码登录
        </button>
      </div>

      <p className="text-center text-xs text-[#D8CCB8] mt-5 leading-relaxed">
        分享链接无需登录即可观看
      </p>
    </div>
  );
}
