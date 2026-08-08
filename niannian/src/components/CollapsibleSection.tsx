'use client';

import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  titleClassName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  titleClassName = 'text-xs tracking-wider text-[#D98A45] font-medium',
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="bg-white rounded-2xl border border-[#E8DCC8] shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <h2 className={titleClassName}>{title}</h2>
        <span className="text-[#B8A898] text-sm">{open ? '收起' : '展开'}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </section>
  );
}
