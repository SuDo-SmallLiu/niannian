'use client';

export type MemoryCardAnalysisStatus = 'pending' | 'active' | 'completed' | 'failed';

const STATUS_LABEL: Record<MemoryCardAnalysisStatus, string> = {
  pending: '待解析',
  active: '解析中',
  completed: '已完成',
  failed: '解析失败',
};

const STATUS_STYLE: Record<MemoryCardAnalysisStatus, string> = {
  pending: 'bg-[#F0E8D8] text-[#8B7355]',
  active: 'bg-[#FFF8F0] text-[#D98A45] border border-[#F0DCC8]',
  completed: 'bg-[#E8F5E9] text-[#2E7D32]',
  failed: 'bg-[#FFF0F0] text-[#C04040]',
};

interface MemoryCardStatusProps {
  status: MemoryCardAnalysisStatus;
  className?: string;
}

export default function MemoryCardStatus({ status, className = '' }: MemoryCardStatusProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_STYLE[status]} ${className}`}
    >
      {status === 'active' && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#D98A45] animate-pulse" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}
