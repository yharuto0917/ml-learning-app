import { colabUrl } from '@/lib/colab';

export function ColabCTA({ lesson }: { lesson?: string }) {
  const href = lesson ? colabUrl(lesson) : undefined;

  return (
    <div className="my-16 border border-zinc-200 p-8 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white shadow-sm">
      <div>
        <h3 className="text-base font-medium text-zinc-900 mb-1.5 flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Google Colab
        </h3>
        <p className="text-zinc-500 text-sm font-light">
          Execute this environment interactively in the browser.
        </p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 border border-zinc-300 text-zinc-900 px-6 py-2.5 rounded-full text-sm font-medium hover:bg-zinc-50 transition-colors flex items-center gap-2 w-full sm:w-auto justify-center shadow-sm"
        >
          Open Notebook
        </a>
      ) : (
        <span className="shrink-0 text-zinc-400 text-sm">No notebook attached</span>
      )}
    </div>
  );
}
