import { LessonMeta } from '@/lib/content';
import { ColabButton } from './ColabButton';

export function LessonHeader({ meta }: { meta: LessonMeta }) {
  const notebooks = meta.notebooks ?? {};
  const hasColab = notebooks.lesson || notebooks.practice || notebooks.solution;
  const hasPrerequisites = meta.prerequisites && meta.prerequisites.length > 0;

  return (
    <header className="mb-14 pb-10 border-b border-zinc-200">
      <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500 mb-6 tracking-widest uppercase">
        <span>Chapter {meta.chapter}</span>
        <span className="text-zinc-300">/</span>
        <span className="text-zinc-900">Lesson {meta.lesson}</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight mb-6">
        {meta.title}
      </h1>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        {meta.estimatedMinutes && (
          <div className="flex items-center gap-2 text-zinc-500 font-light">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {meta.estimatedMinutes} min read
          </div>
        )}
        {meta.tags && meta.tags.length > 0 && (
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
            {meta.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}
      </div>

      {hasPrerequisites && (
        <div className="mt-5 flex items-center gap-2 text-[12px] text-zinc-500">
          <span className="tracking-widest uppercase text-[10px] font-semibold text-zinc-400">
            Prereq
          </span>
          <ul className="flex flex-wrap gap-2 font-mono">
            {meta.prerequisites!.map((p) => (
              <li
                key={String(p)}
                className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700"
              >
                {String(p)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasColab && (
        <div className="mt-7 flex flex-wrap items-center gap-3">
          {notebooks.lesson && (
            <ColabButton notebookPath={notebooks.lesson} kind="lesson" />
          )}
          {notebooks.practice && (
            <ColabButton notebookPath={notebooks.practice} kind="practice" />
          )}
        </div>
      )}
    </header>
  );
}
