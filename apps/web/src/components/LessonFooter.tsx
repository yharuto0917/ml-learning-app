import Link from 'next/link';
import { LessonNotebooks } from '@/lib/content';
import { ColabButton } from './ColabButton';

export function LessonFooter({
  notebooks,
  next,
}: {
  notebooks?: LessonNotebooks;
  next?: string;
}) {
  const practicePath = notebooks?.practice;
  const solutionPath = notebooks?.solution;
  const hasPractice = Boolean(practicePath || solutionPath);

  return (
    <footer className="mt-20 border-t border-zinc-200 pt-10 pb-16">
      {hasPractice && (
        <div className="mb-10">
          <div className="text-[11px] font-semibold text-zinc-500 mb-4 tracking-widest uppercase">
            練習
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {practicePath && (
              <ColabButton notebookPath={practicePath} kind="practice" />
            )}
            {solutionPath && (
              <ColabButton notebookPath={solutionPath} kind="solution" />
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="w-12 h-px bg-zinc-300 hidden sm:block"></div>
        <div className="flex-grow sm:flex-grow-0 sm:mx-8">
          {next ? (
            <Link
              href={next}
              className="group flex items-center justify-center gap-3 w-full sm:w-auto border border-zinc-300 text-zinc-900 px-8 py-3.5 rounded-full text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm"
            >
              次のレッスンへ
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-1 transition-transform"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          ) : (
            <span className="text-zinc-400 text-xs tracking-widest">
              この章はここまでです
            </span>
          )}
        </div>
        <div className="w-12 h-px bg-zinc-300 hidden sm:block"></div>
      </div>
    </footer>
  );
}
