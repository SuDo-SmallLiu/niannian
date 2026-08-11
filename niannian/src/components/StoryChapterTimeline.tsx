'use client';

interface StorySegment {
  photoId: string;
  memorySnippet: string;
  narrative: string;
  meta?: {
    people: string[];
    location: string;
    taken_at: string;
    action: string;
  };
}

interface PhotoDetail {
  id: string;
  url: string;
  people?: string[];
  location?: string;
  taken_at?: string;
  action?: string;
  significance?: string;
}

interface StoryChapterTimelineProps {
  title: string;
  summary: string;
  theme?: string;
  familyName?: string;
  timeline?: Array<{ year: string; event: string }>;
  segments: StorySegment[];
  photosDetail: PhotoDetail[];
  connectionAction?: string;
  largeText?: boolean;
}

export default function StoryChapterTimeline({
  title,
  summary,
  theme,
  familyName,
  timeline = [],
  segments,
  photosDetail,
  connectionAction,
  largeText = false,
}: StoryChapterTimelineProps) {
  const photoMap = new Map(photosDetail.map((p) => [p.id, p]));

  const chapters =
    segments.length > 0
      ? segments
      : photosDetail.map((p) => ({
          photoId: p.id,
          memorySnippet: [p.action, p.location, p.taken_at].filter(Boolean).join(' · '),
          narrative: p.significance || p.action || summary,
          meta: {
            people: p.people || [],
            location: p.location || '',
            taken_at: p.taken_at || '',
            action: p.action || '',
          },
        }));

  return (
    <article className="max-w-md mx-auto">
      <header className="text-center mb-10">
        {familyName && (
          <p className="text-xs tracking-[0.2em] text-[#D98A45] font-medium mb-2">
            {familyName}
          </p>
        )}
        {theme && (
          <span className="inline-block px-3 py-1 rounded-full bg-[#FFF8F0] text-xs text-[#8B7355] border border-[#F0DCC8] mb-3">
            {theme}
          </span>
        )}
        <h1 className={`font-serif font-bold text-[#4B3B2F] leading-snug mb-3 ${largeText ? 'text-3xl' : 'text-2xl'}`}>
          {title}
        </h1>
        {summary && (
          <p className={`text-[#8B7355] leading-relaxed font-serif px-2 ${largeText ? 'text-lg' : 'text-[15px]'}`}>
            {summary}
          </p>
        )}
      </header>

      {timeline.length > 0 && (
        <div className="mb-10 px-1">
          <div className="relative pl-5 border-l-2 border-[#E8DCC8] space-y-4">
            {timeline.map((item) => (
              <div key={`${item.year}-${item.event}`} className="relative">
                <span className="absolute -left-[1.35rem] top-1.5 w-2.5 h-2.5 rounded-full bg-[#D98A45] ring-4 ring-[#F8F4ED]" />
                <p className="text-sm font-medium text-[#D98A45]">{item.year}</p>
                <p className="text-sm text-[#8B7355] mt-0.5">{item.event}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-12">
        {chapters.map((seg, idx) => {
          const photo = photoMap.get(seg.photoId);
          const meta = seg.meta || photo;

          return (
            <section key={`${seg.photoId}-${idx}`}>
              <p className="text-xs tracking-[0.3em] text-[#D98A45] font-medium mb-4 text-center">
                Chapter {String(idx + 1).padStart(2, '0')}
              </p>

              {photo?.url && (
                <div className="rounded-3xl overflow-hidden border-2 border-[#E8DCC8] shadow-sm mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full aspect-[4/3] object-cover"
                  />
                </div>
              )}

              {(meta?.people?.length || meta?.location || meta?.taken_at) && (
                <div className="flex flex-wrap gap-2 mb-3 px-1">
                  {meta.taken_at && (
                    <span className="px-2.5 py-1 rounded-full bg-white text-xs text-[#8B7355] border border-[#E8DCC8]">
                      {meta.taken_at}
                    </span>
                  )}
                  {meta.location && (
                    <span className="px-2.5 py-1 rounded-full bg-white text-xs text-[#8B7355] border border-[#E8DCC8]">
                      {meta.location}
                    </span>
                  )}
                  {meta.people?.map((person) => (
                    <span
                      key={person}
                      className="px-2.5 py-1 rounded-full bg-white text-xs text-[#8B7355] border border-[#E8DCC8]"
                    >
                      {person}
                    </span>
                  ))}
                </div>
              )}

              {seg.memorySnippet && (
                <p className="text-xs text-[#B8A898] mb-2 px-1">{seg.memorySnippet}</p>
              )}

              {seg.narrative && (
                <div className="border-l-[3px] border-[#D98A45] pl-4 py-1">
                  <p className="text-[15px] text-[#4B3B2F] font-serif leading-relaxed">
                    {seg.narrative}
                  </p>
                </div>
              )}

              {idx < chapters.length - 1 && (
                <div className="flex items-center gap-3 mt-10">
                  <div className="flex-1 h-px bg-[#E8DCC8]" />
                  <span className="text-xs text-[#D8CCB8]">✦</span>
                  <div className="flex-1 h-px bg-[#E8DCC8]" />
                </div>
              )}
            </section>
          );
        })}
      </div>

      {connectionAction && (
        <div className="mt-12 bg-[#FFF8F0] rounded-2xl p-5 border border-[#F0DCC8]">
          <p className="text-xs font-medium text-[#D98A45] mb-2 tracking-wide">连接建议</p>
          <p className="text-sm text-[#8B7355] leading-relaxed">{connectionAction}</p>
        </div>
      )}
    </article>
  );
}
