'use client';

import { useState } from 'react';
import { retryPhotoAnalysisAsync } from '@/lib/poll-job';

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
      await retryPhotoAnalysisAsync(familyId, photoId);
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
