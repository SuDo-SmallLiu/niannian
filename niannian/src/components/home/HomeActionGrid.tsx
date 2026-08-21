'use client';

import { useRouter } from 'next/navigation';
import { FolderUp, Sparkles, Wand2, FileText } from 'lucide-react';
import { useAppDialog } from '@/components/providers/app-dialog-provider';

interface HomeActionGridProps {
  familyId: string | null;
  onCreateFamily: () => void;
}

const ACTIONS = [
  {
    id: 'upload',
    title: '上传照片',
    desc: '选择或拍摄照片上传',
    Icon: FolderUp,
    tone: 'create' as const,
  },
  {
    id: 'analyze',
    title: '智能识别',
    desc: '识别场景与老照片文字',
    Icon: Sparkles,
    tone: 'create' as const,
  },
  {
    id: 'beautify',
    title: '美化处理',
    desc: '优化画质和色彩效果',
    Icon: Wand2,
    tone: 'create' as const,
  },
  {
    id: 'describe',
    title: '生成描述',
    desc: '生成照片描述和标签',
    Icon: FileText,
    tone: 'create' as const,
  },
];

export default function HomeActionGrid({ familyId, onCreateFamily }: HomeActionGridProps) {
  const router = useRouter();
  const { alert } = useAppDialog();

  const handleAction = async (id: string) => {
    if (!familyId) {
      onCreateFamily();
      return;
    }

    switch (id) {
      case 'upload':
        router.push(`/family/${familyId}/upload`);
        break;
      case 'analyze':
        router.push(`/family/${familyId}/upload?mode=ocr`);
        break;
      case 'beautify':
        await alert({
          title: '即将推出',
          description: '美化处理功能正在开发中，可以先使用智能识别查看照片内容。',
        });
        break;
      case 'describe':
        router.push(`/family/${familyId}/supplement`);
        break;
      default:
        break;
    }
  };

  return (
    <div className="home-action-grid grid grid-cols-2 gap-3 px-4 pb-3 max-w-[390px] mx-auto w-full">
      {ACTIONS.map(({ id, title, desc, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleAction(id)}
          className="home-action-card text-left rounded-[22px] border border-[#F0E6D8] bg-white/95 p-4 min-h-[132px] shadow-[0_8px_24px_rgba(125,92,57,0.08)] active:scale-[0.98] transition-transform"
        >
          <div className="flex items-start justify-between mb-3">
            <span className="w-10 h-10 rounded-xl bg-[#FFF8F0] text-[#DF8B3A] flex items-center justify-center">
              <Icon className="w-5 h-5" aria-hidden />
            </span>
            <span className="text-[#D8CCB8] text-lg leading-none">↗</span>
          </div>
          <h3 className="text-[15px] font-semibold text-[#4A3326] mb-1">{title}</h3>
          <p className="text-xs text-[#8E7B6B] leading-relaxed">{desc}</p>
        </button>
      ))}
    </div>
  );
}
