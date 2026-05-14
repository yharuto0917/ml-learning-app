import { LessonMeta } from '@/lib/content';

export function LessonHeader({ meta }: { meta: LessonMeta }) {
  return (
    <header className="mb-14 pb-10 border-b border-zinc-200">
      <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500 mb-6 tracking-widest uppercase">
        <span>Chapter {meta.chapter}</span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900">Lesson {meta.lesson}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight mb-6">{meta.title}</h1>
      
      <div className="flex items-center gap-6 text-[13px]">
        {meta.estimatedMinutes && (
          <div className="flex items-center gap-2 text-zinc-500 font-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            {meta.estimatedMinutes} min read
          </div>
        )}
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
            {meta.tags.map(tag => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}