'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import CollapsibleSection from '@/components/CollapsibleSection';
import UserSupplementPanel, {
  type AiQuestion,
  saveMemoryCardSupplement,
} from '@/components/UserSupplementPanel';
import type { NarrativeFrame } from '@/lib/narrative-frame';
import type { StoryLayer } from '@/lib/story-layer';
import { useSharePoster } from '@/hooks/useSharePoster';
import { useAppDialog } from '@/components/providers/app-dialog-provider';
import { useAppreciateMode } from '@/components/providers/appreciate-mode-provider';
import { useNianNianAgentOverride } from '@/components/providers/niannian-agent-provider';
import { computeMemoryCardCompletion } from '@/lib/memory-card-completion';
import { analyzePhotoAsync } from '@/lib/poll-job';

interface Tag {
  layer: number;
  key: string;
  value: string;
}

interface AffectUnderstanding {
  archetype: string;
  secondaryArchetypes?: string[];
  valence: string;
  arousal: string;
  quadrant: string;
  indicators: string[];
  emotions: string[];
  confidence: string;
}

interface ChangeTransition {
  type: string;
  marker: string;
  lifePhase?: string;
  affectShift?: string;
}

interface ChangeDetail {
  transitions: ChangeTransition[];
  summary: string;
}

interface MemoryCardDetail {
  photo: {
    id: string;
    url: string;
    original_name: string;
    people: string[];
    location: string;
    event: string;
    taken_at: string;
    source_type?: string;
    source_metadata?: {
      takenAtFormatted?: string;
      location?: string;
      description?: string;
      people?: string[];
      deviceType?: string;
      uploadedAt?: string;
      favorited?: boolean;
      latitude?: number | null;
      longitude?: number | null;
    };
  };
  memoryCard: {
    taken_at: string;
    location: string;
    people: string[];
    action: string;
    emotions: string[];
    changes: string[];
    significance: string;
    understanding: AffectUnderstanding | null;
    change_detail: ChangeDetail | null;
    narrative_frame: NarrativeFrame | null;
    story_layer: StoryLayer | null;
    user_notes: string;
    voice_transcript: string;
    ai_questions: AiQuestion[];
    analysis_status: string;
  } | null;
  tags: Tag[];
  familyName?: string;
}

const LAYER_NAMES: Record<number, { label: string; color: string }> = {
  1: { label: '客观标签', color: 'bg-blue-50 text-blue-700' },
  2: { label: '行为标签', color: 'bg-green-50 text-green-700' },
  3: { label: '变化标签', color: 'bg-purple-50 text-purple-700' },
  4: { label: '主题价值', color: 'bg-amber-50 text-amber-700' },
  5: { label: '叙事标签', color: 'bg-rose-50 text-rose-700' },
  6: { label: '故事层', color: 'bg-indigo-50 text-indigo-700' },
};

export default function MemoryCardPage() {
  const router = useRouter();
  const params = useParams();
  const familyId = params.id as string;
  const photoId = params.photoId as string;
  const appreciate = useAppreciateMode();

  const [data, setData] = useState<MemoryCardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [userNotes, setUserNotes] = useState('');
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const { openSharePoster, loading: shareLoading, modal: shareModal } = useSharePoster();
  const { confirm, alert } = useAppDialog();

  const itemCompletion = data?.memoryCard
    ? computeMemoryCardCompletion(data.memoryCard)
    : undefined;

  useNianNianAgentOverride({
    itemCompletion,
    itemLabel: 'memory',
  });

  function applyMemoryCardData(result: {
    photo: MemoryCardDetail['photo'];
    memoryCard: MemoryCardDetail['memoryCard'];
    tags: Tag[];
    familyName?: string;
  }) {
    setData((prev) => ({
      photo: result.photo,
      memoryCard: result.memoryCard,
      tags: result.tags,
      familyName: result.familyName ?? prev?.familyName,
    }));
    if (result.memoryCard) {
      setUserNotes(result.memoryCard.user_notes || '');
      setAiQuestions(result.memoryCard.ai_questions || []);
    }
  }

  async function loadData() {
    try {
      const res = await fetch(`/api/memory-card?photoId=${photoId}`);
      const result = await res.json();
      if (res.ok) {
        applyMemoryCardData(result);
        setError('');
      }
    } catch {
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [photoId]);

  async function handleReanalyze() {
    setReanalyzing(true);
    setError('');
    try {
      if (userNotes.trim()) {
        const saved = await saveMemoryCardSupplement(photoId, userNotes, aiQuestions);
        if (!saved.ok) {
          setError(saved.error || '保存用户补充失败');
          setReanalyzing(false);
          return;
        }
      }

      const hasSupplement = !!(
        userNotes.trim() ||
        (aiQuestions || []).some((q) => q.answer?.trim())
      );
      const result = await analyzePhotoAsync(photoId, hasSupplement);
      applyMemoryCardData(
        result as Parameters<typeof applyMemoryCardData>[0]
      );
    } catch {
      setError('重新解析失败，请重试');
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: '删除这张记忆卡？',
      description: '将永久删除照片及念念解析结果，此操作不可恢复。',
      confirmText: '确认删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    setError('');
    try {
      const res = await fetch(`/api/photos?photoId=${photoId}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '删除失败');
      router.push(`/family/${familyId}/photos`);
    } catch (err) {
      await alert({
        title: '删除失败',
        description: err instanceof Error ? err.message : '请稍后重试',
      });
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F4ED]">
        <div className="w-8 h-8 border-2 border-[#E8DCC8] border-t-[#D98A45] rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F4ED] px-8">
        <p className="text-[#8B7355] mb-4">记忆卡不存在</p>
        <button
          onClick={() => router.push(`/family/${familyId}/photos`)}
          className="text-sm text-[#D98A45] underline underline-offset-2"
        >
          返回照片库
        </button>
      </div>
    );
  }

  const { photo, memoryCard, tags, familyName } = data;
  const source = photo.source_type === 'google_photos' ? photo.source_metadata : null;
  const tagsByLayer = tags.reduce<Record<number, Tag[]>>((acc, tag) => {
    if (!acc[tag.layer]) acc[tag.layer] = [];
    acc[tag.layer].push(tag);
    return acc;
  }, {});

  return (
    <div className={`min-h-screen bg-[#F8F4ED] pb-24 ${appreciate ? 'text-lg' : ''}`}>
      {shareModal}
      <div className="px-6 pt-8">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() =>
              router.push(
                appreciate ? '/family/memories?appreciate=1' : `/family/${familyId}/photos`
              )
            }
            className="text-[#B8A898] hover:text-[#8B7355] text-sm transition-colors"
          >
            ← {appreciate ? '照片库' : '记忆卡列表'}
          </button>
          {memoryCard && !appreciate && (
            <button
              onClick={() =>
                openSharePoster({
                  type: 'memory',
                  photoId,
                  title:
                    memoryCard.understanding?.archetype ||
                    memoryCard.action ||
                    '家庭记忆',
                  subtitle: [memoryCard.taken_at, memoryCard.location]
                    .filter(Boolean)
                    .join(' · '),
                  summary: memoryCard.significance || memoryCard.action || '',
                  familyName: familyName || '',
                  photoUrls: [photo.url],
                })
              }
              disabled={shareLoading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm text-[#D98A45] border border-[#F0DCC8] bg-white hover:bg-[#FFF8F0] disabled:opacity-50 transition-colors"
            >
              {shareLoading ? '…' : '分享'}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 mb-2 text-center">{error}</p>
        )}
      </div>

      {/* 照片 */}
      <div className="px-6 mb-6 animate-fade-in-up">
        <div className="rounded-2xl overflow-hidden shadow-md">
          <img src={photo.url} alt={photo.original_name} className="w-full aspect-[4/3] object-cover" />
        </div>
        <p className="text-xs text-[#D8CCB8] mt-2 text-center">{photo.original_name}</p>
      </div>

      {!memoryCard ? (
        <div className="px-6 text-center py-8">
          <p className="text-[#B8A898] mb-4">这张照片还没有被念念解析</p>
        </div>
      ) : (
        <div className={`px-6 space-y-4 animate-fade-in-up delay-100 ${reanalyzing ? 'opacity-50 pointer-events-none' : ''}`}>
          {/* Google Photos 原始信息 */}
          {source && (
            <section className="bg-[#F0F7FF] rounded-2xl p-5 border border-blue-100 shadow-sm">
              <h2 className="text-xs tracking-wider text-blue-600 font-medium mb-3">
                Google Photos 原始信息
              </h2>
              <div className="space-y-2 text-sm">
                {source.takenAtFormatted && (
                  <div className="flex">
                    <span className="text-blue-400 w-16 shrink-0">拍摄</span>
                    <span className="text-[#4B3B2F]">{source.takenAtFormatted}</span>
                  </div>
                )}
                {source.location && (
                  <div className="flex">
                    <span className="text-blue-400 w-16 shrink-0">GPS</span>
                    <span className="text-[#4B3B2F]">{source.location}</span>
                  </div>
                )}
                {source.description && (
                  <div className="flex">
                    <span className="text-blue-400 w-16 shrink-0">描述</span>
                    <span className="text-[#4B3B2F]">{source.description}</span>
                  </div>
                )}
                {source.people && source.people.length > 0 && (
                  <div className="flex">
                    <span className="text-blue-400 w-16 shrink-0">人物</span>
                    <span className="text-[#4B3B2F]">{source.people.join('、')}</span>
                  </div>
                )}
                {source.deviceType && (
                  <div className="flex">
                    <span className="text-blue-400 w-16 shrink-0">设备</span>
                    <span className="text-[#4B3B2F]">{source.deviceType}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 事实层 */}
          <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
            <h2 className="text-sm font-semibold text-[#4A3326] mb-3">事实层 · 客观信息</h2>
            <div className="space-y-2 text-sm">
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">时间</span>
                <span className="text-[#4B3B2F]">{memoryCard.taken_at || photo.taken_at || '未知'}</span>
              </div>
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">地点</span>
                <span className="text-[#4B3B2F]">{memoryCard.location || photo.location || '未知'}</span>
              </div>
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">人物</span>
                <span className="text-[#4B3B2F]">{memoryCard.people.join('、') || '未知'}</span>
              </div>
              <div className="flex">
                <span className="text-[#B8A898] w-12 shrink-0">动作</span>
                <span className="text-[#4B3B2F]">{memoryCard.action || photo.event || '未知'}</span>
              </div>
            </div>
          </section>

          {/* 理解层 */}
          <section className="bg-white rounded-2xl p-5 border border-[#E8DCC8] shadow-sm">
            <h2 className="text-sm font-semibold text-[#4A3326] mb-3">理解层 · 情动推测</h2>

            {memoryCard.understanding?.archetype && (
              <div className="mb-4">
                <p className="text-xs text-[#B8A898] mb-1.5">情动构型</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-[#D98A45] text-white text-sm font-medium">
                    {memoryCard.understanding.archetype}
                  </span>
                  {memoryCard.understanding.secondaryArchetypes?.map((a) => (
                    <span key={a} className="px-2.5 py-1 rounded-full bg-[#FFF8F0] text-xs text-[#D98A45] border border-[#F0DCC8]">
                      {a}
                    </span>
                  ))}
                </div>
                {memoryCard.understanding.quadrant && (
                  <p className="text-xs text-[#B8A898] mt-2">
                    {memoryCard.understanding.quadrant}
                    {memoryCard.understanding.confidence === 'low' && ' · 推测置信度较低'}
                  </p>
                )}
              </div>
            )}

            {memoryCard.understanding?.indicators && memoryCard.understanding.indicators.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#B8A898] mb-1.5">情动指示词 · 画面证据</p>
                <div className="flex flex-wrap gap-1.5">
                  {memoryCard.understanding.indicators.map((ind) => (
                    <span key={ind} className="px-2.5 py-1 rounded-full bg-slate-50 text-xs text-slate-600 border border-slate-200">
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(memoryCard.understanding?.emotions?.length || memoryCard.emotions.length) > 0 && (
              <div className="mb-3">
                <p className="text-xs text-[#B8A898] mb-1.5">表层情绪</p>
                <div className="flex flex-wrap gap-1.5">
                  {(memoryCard.understanding?.emotions || memoryCard.emotions).map((e) => (
                    <span key={e} className="px-2.5 py-1 rounded-full bg-[#FFF8F0] text-xs text-[#D98A45]">
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {memoryCard.significance && (
              <div className="border-l-[3px] border-[#D98A45] pl-3">
                <p className="text-sm text-[#8B7355] font-serif leading-relaxed">
                  {memoryCard.significance}
                </p>
              </div>
            )}
          </section>

          {/* 用户层 · 补充记忆 — 紧跟理解层 */}
          {!appreciate && (
          <UserSupplementPanel
            photoId={photoId}
            notes={userNotes}
            onNotesChange={setUserNotes}
            questions={aiQuestions}
            onQuestionsChange={setAiQuestions}
            integratedSummary={
              userNotes.trim() && memoryCard
                ? {
                    people: memoryCard.people,
                    location: memoryCard.location,
                    taken_at: memoryCard.taken_at,
                    significance: memoryCard.significance,
                  }
                : null
            }
            disabled={reanalyzing}
            onSaved={(supplement) => {
              setData((prev) =>
                prev && prev.memoryCard
                  ? {
                      ...prev,
                      memoryCard: {
                        ...prev.memoryCard,
                        ...supplement,
                      },
                    }
                  : prev
              );
              setUserNotes(supplement.user_notes);
              setAiQuestions(supplement.ai_questions);
            }}
            onReanalyzed={(result) => {
              applyMemoryCardData(result as Parameters<typeof applyMemoryCardData>[0]);
            }}
          />
          )}

          {/* 叙事层 */}
          {memoryCard.narrative_frame &&
            (memoryCard.narrative_frame.storyline ||
              memoryCard.narrative_frame.shotType ||
              memoryCard.narrative_frame.shotNote) && (
            <CollapsibleSection title="叙事层" titleClassName="text-sm font-semibold text-[#4A3326]">

              <div className="flex flex-wrap gap-2 mb-3">
                {memoryCard.narrative_frame.storyline && (
                  <span className="px-3 py-1.5 rounded-full bg-rose-500 text-white text-sm font-medium">
                    故事线 · {memoryCard.narrative_frame.storyline}
                  </span>
                )}
                {memoryCard.narrative_frame.shotType && (
                  <span className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 text-sm border border-rose-100">
                    景别 · {memoryCard.narrative_frame.shotType}
                  </span>
                )}
              </div>

              {memoryCard.narrative_frame.storylineNote && (
                <p className="text-sm text-[#6B5A48] mb-2 leading-relaxed">
                  <span className="text-[#B8A898]">叙事功能 · </span>
                  {memoryCard.narrative_frame.storylineNote}
                </p>
              )}

              {memoryCard.narrative_frame.shotNote && (
                <p className="text-sm text-[#6B5A48] mb-3 leading-relaxed">
                  <span className="text-[#B8A898]">镜头语言 · </span>
                  {memoryCard.narrative_frame.shotNote}
                </p>
              )}

              {memoryCard.narrative_frame.shotTags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {memoryCard.narrative_frame.shotTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-full bg-rose-50/80 text-xs text-rose-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </CollapsibleSection>
          )}

          {/* 聚类语义层 */}
          {memoryCard.story_layer &&
            (memoryCard.story_layer.meaning ||
              memoryCard.story_layer.scene_type ||
              memoryCard.story_layer.relationship) && (
            <CollapsibleSection title="聚类语义层" titleClassName="text-sm font-semibold text-[#4A3326]">
              <div className="flex flex-wrap gap-2 mb-3">
                {memoryCard.story_layer.meaning && (
                  <span className="px-3 py-1.5 rounded-full bg-indigo-500 text-white text-sm font-medium">
                    意义 · {memoryCard.story_layer.meaning}
                  </span>
                )}
                {memoryCard.story_layer.scene_type && (
                  <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm border border-indigo-100">
                    场景 · {memoryCard.story_layer.scene_type}
                  </span>
                )}
                {memoryCard.story_layer.relationship && (
                  <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm border border-indigo-100">
                    关系 · {memoryCard.story_layer.relationship}
                  </span>
                )}
                {memoryCard.story_layer.importance > 0 && (
                  <span className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm border border-indigo-100">
                    重要度 · {memoryCard.story_layer.importance}/5
                  </span>
                )}
              </div>
              {memoryCard.story_layer.change && (
                <p className="text-sm text-[#6B5A48] leading-relaxed">
                  <span className="text-[#B8A898]">变化弧线 · </span>
                  {memoryCard.story_layer.change}
                </p>
              )}
            </CollapsibleSection>
          )}

          {/* 变化层 */}
          {(memoryCard.change_detail?.transitions?.length || memoryCard.changes.length > 0) && (
            <CollapsibleSection title="变化层" titleClassName="text-sm font-semibold text-[#4A3326]">

              {memoryCard.change_detail?.summary && (
                <p className="text-sm text-[#8B7355] mb-3 leading-relaxed">
                  {memoryCard.change_detail.summary}
                </p>
              )}

              <div className="space-y-2">
                {(
                  memoryCard.change_detail?.transitions?.length
                    ? memoryCard.change_detail.transitions
                    : memoryCard.changes.map((c) => ({ type: c, marker: c }))
                ).map((t: { type?: string; marker: string; lifePhase?: string; affectShift?: string }, i) => (
                  <div key={`${t.marker}-${i}`} className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-purple-50/50">
                    {t.type ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        {t.type}
                      </span>
                    ) : null}
                    <span className="text-sm text-[#4B3B2F]">{t.marker}</span>
                    {t.lifePhase ? (
                      <span className="text-xs text-[#B8A898]">· {t.lifePhase}</span>
                    ) : null}
                    {t.affectShift ? (
                      <span className="text-xs text-purple-600 ml-auto">{t.affectShift}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}

          {/* 四层标签 */}
          {Object.keys(tagsByLayer).length > 0 && (
            <CollapsibleSection title="标签系统" titleClassName="text-sm font-semibold text-[#4A3326]">
              <div className="space-y-3">
                {Object.entries(tagsByLayer).map(([layer, layerTags]) => {
                  const info = LAYER_NAMES[Number(layer)];
                  return (
                    <div key={layer}>
                      <p className="text-xs text-[#B8A898] mb-1.5">{info?.label || `第${layer}层`}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {layerTags.map((tag, i) => (
                          <span
                            key={`${tag.key}-${tag.value}-${i}`}
                            className={`px-2.5 py-1 rounded-full text-xs ${info?.color || 'bg-gray-50 text-gray-700'}`}
                          >
                            {tag.value}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          )}
        </div>
      )}

      {/* 底部固定操作栏 */}
      {!appreciate && (
      <div className="fixed bottom-20 left-0 right-0 px-6 z-40">
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing || deleting}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-[#D98A45] text-white text-sm font-medium hover:bg-[#C47A3A] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#D98A45]/20"
          >
            {reanalyzing ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                念念解析中…
              </>
            ) : memoryCard ? (
              '重新解析'
            ) : (
              '开始念念解析'
            )}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || reanalyzing}
            className="w-full py-3 rounded-2xl border border-red-200 bg-white text-red-600 text-sm hover:bg-red-50 disabled:opacity-50 transition-all"
          >
            {deleting ? '删除中…' : '删除记忆卡'}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
