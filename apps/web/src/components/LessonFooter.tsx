export function LessonFooter({ next }: { next?: string }) {
  return (
    <footer className="mt-20 border-t border-zinc-200 pt-10 pb-16 flex items-center justify-between">
      <div className="w-12 h-px bg-zinc-300 hidden sm:block"></div>
      <div className="flex-grow sm:flex-grow-0 sm:mx-8">
        {next ? (
          <a href={next} className="group flex items-center justify-center gap-3 w-full sm:w-auto border border-zinc-300 text-zinc-900 px-8 py-3.5 rounded-full text-sm font-medium hover:bg-zinc-50 transition-colors shadow-sm">
            Continue to Next Lesson
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
        ) : (
          <span className="text-zinc-400 text-xs tracking-widest uppercase">End of Chapter</span>
        )}
      </div>
      <div className="w-12 h-px bg-zinc-300 hidden sm:block"></div>
    </footer>
  );
}