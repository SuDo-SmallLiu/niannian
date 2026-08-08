'use client';

export interface AnalysisProgressProps {
  completed: number;
  total: number;
  failed?: number;
  active?: number;
  className?: string;
}

export default function AnalysisProgress({
  completed,
  total,
  failed = 0,
  active = 0,
  className = '',
}: AnalysisProgressProps) {
  const doneCount = completed + failed;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className={className}>
      <div className="w-full h-2 bg-[#F0E8D8] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#D98A45] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-[#B8A898]">
        <span>
          已完成 {completed}/{total}
          {failed > 0 ? ` · ${failed} 张失败` : ''}
        </span>
        {active > 0 && <span className="text-[#D98A45]">解析中 {active} 张</span>}
      </div>
    </div>
  );
}
