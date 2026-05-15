import Link from 'next/link';
import { fetchIndex, type ChapterEntry } from '@/lib/content';

export const revalidate = 3600;

export default async function LearnPage() {
  const index = await fetchIndex();

  return (
    <div className="py-12">
      <header className="mb-12">
        <div className="text-[11px] font-semibold text-zinc-500 mb-3 tracking-widest uppercase">
          Curriculum
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 tracking-tight leading-tight mb-3">
          全 11 章
        </h1>
        <p className="text-zinc-500 text-[15px] font-light leading-relaxed max-w-2xl">
          numpy / pandas から強化学習・転移学習までを章ごとに進められます。各章はレッスン本文(MDX)と練習 Notebook(Colab)のペアで構成されます。
        </p>
      </header>

      {index ? (
        <div className="grid sm:grid-cols-2 gap-5">
          {index.chapters.map((ch) => (
            <ChapterCard key={ch.slug} chapter={ch} />
          ))}
        </div>
      ) : (
        <div className="border border-zinc-200 rounded-2xl p-8 text-zinc-500 text-sm font-light">
          コンテンツ索引(<code className="font-mono text-[12px]">content/_index.json</code>)が R2 から取得できませんでした。<code className="font-mono text-[12px]">pnpm content:deploy</code> でアップロードしてください。
        </div>
      )}
    </div>
  );
}

function ChapterCard({ chapter }: { chapter: ChapterEntry }) {
  const isEmpty = chapter.lessons.length === 0;

  return (
    <section
      id={`chapter-${chapter.id}`}
      className="scroll-mt-24 border border-zinc-200 rounded-3xl p-7 bg-white shadow-sm flex flex-col"
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[11px] font-semibold text-zinc-400 tracking-widest uppercase">
          Ch {chapter.id}
        </span>
        <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">
          {chapter.title}
        </h2>
      </div>
      <p className="text-zinc-500 text-[13px] font-light leading-relaxed mb-5">
        {chapter.description}
      </p>

      {isEmpty ? (
        <div className="mt-auto text-[11px] text-zinc-400 tracking-widest uppercase">
          準備中 / Coming soon
        </div>
      ) : (
        <ul className="mt-auto space-y-1.5 text-[13px]">
          {chapter.lessons.map((l) => (
            <li key={`${l.category}/${l.slug}`}>
              <Link
                href={`/learn/${l.category}/${l.slug}`}
                className="group flex items-center justify-between text-zinc-700 hover:text-zinc-950 transition-colors"
              >
                <span>
                  <span className="font-mono text-zinc-400 mr-2">
                    {chapter.id}.{l.lesson}
                  </span>
                  {l.title}
                </span>
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
                  className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                  aria-hidden="true"
                >
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
