'use client';

import { useState } from 'react';
import { extractOcrFromNotes } from '@/lib/photo-ocr';
import { ScanText } from 'lucide-react';

interface PhotoOcrSectionProps {
  photoId: string;
  userNotes: string;
  onNotesUpdated: (notes: string) => void;
  disabled?: boolean;
}

export default function PhotoOcrSection({
  photoId,
  userNotes,
  onNotesUpdated,
  disabled = false,
}: PhotoOcrSectionProps) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState('');
  const ocrText = extractOcrFromNotes(userNotes);

  const runOcr = async () => {
    setRunning(true);
    setMessage('');
    try {
      const res = await fetch(`/api/photos/${photoId}/ocr`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || '识别失败');
        return;
      }
      if (!data.hasText) {
        setMessage(data.message || '未识别到文字');
        return;
      }
      onNotesUpdated(data.user_notes || userNotes);
      setMessage('文字识别完成');
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-[#4A3326] mb-1">文字识别 · OCR</h2>
          <p className="text-xs text-[#8E7B6B] leading-relaxed">
            识别老照片、证件、信件、照片背面手写说明
          </p>
        </div>
        <button
          type="button"
          onClick={runOcr}
          disabled={disabled || running}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFF8F0] text-[#DF8B3A] text-xs font-medium border border-[#F5E6C8] disabled:opacity-50"
        >
          <ScanText className="w-3.5 h-3.5" />
          {running ? '识别中…' : ocrText ? '重新识别' : '识别文字'}
        </button>
      </div>

      {ocrText ? (
        <div className="rounded-xl bg-[#FFFBF5] border border-[#F0E6D8] px-4 py-3.5">
          <p className="text-xs text-[#B8A898] mb-2 font-medium">已识别文字</p>
          <p className="text-sm text-[#4B3B2F] leading-relaxed whitespace-pre-wrap">{ocrText}</p>
        </div>
      ) : (
        <p className="text-sm text-[#B8A898] text-center py-4 rounded-xl bg-[#FFFBF7] border border-dashed border-[#E8DCC8]">
          暂无 OCR 结果，点「识别文字」扫描图中内容
        </p>
      )}

      {message && (
        <p
          className={`text-xs mt-2 text-center ${
            message.includes('失败') || message.includes('未识别') ? 'text-[#C04040]' : 'text-[#D98A45]'
          }`}
        >
          {message}
        </p>
      )}
    </section>
  );
}
