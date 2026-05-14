import { colabUrl } from '@/lib/colab';

export type ColabButtonKind = 'lesson' | 'practice' | 'solution';

const PRESETS: Record<ColabButtonKind, { icon: string; label: string }> = {
  lesson: { icon: '📘', label: '解説をColabで開く' },
  practice: { icon: '✏️', label: '練習をColabで開く' },
  solution: { icon: '🔑', label: '解答をColabで開く' },
};

export function ColabButton({
  notebookPath,
  kind,
}: {
  notebookPath: string;
  kind: ColabButtonKind;
}) {
  const { icon, label } = PRESETS[kind];
  return (
    <a
      href={colabUrl(notebookPath)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 border border-zinc-300 text-zinc-900 px-4 py-2 rounded-full text-[13px] font-medium hover:bg-zinc-50 transition-colors shadow-sm"
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
