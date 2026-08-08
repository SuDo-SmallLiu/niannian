'use client';

import { useState } from 'react';

interface RetryAnalysisButtonProps {
  familyId: string;
  photoId: string;
  onRetried?: () => void;
  className?: string;
}

export default function RetryAnalysisButton({
  familyId,
  photoId,
  onRetried,
  className = '',
}: RetryAnalysisButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRetry = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analyze/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, photoId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '重试失败');
      }
      onRetried?.();
    } catch {
      /* caller may show toast */
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRetry}
      disabled={loading}
      className={`text-[10px] text-[#D98A45] underline underline-offset-2 disabled:opacity-50 ${className}`}
    >
      {loading ? '重试中…' : '重试'}
    </button>
  );
}
