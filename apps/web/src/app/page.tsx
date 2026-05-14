import Link from 'next/link';

export default function Home() {
  return (
    <div className="space-y-24">
      <section className="py-12 md:py-24">
        <h1 className="text-4xl md:text-5xl font-light mb-8 text-zinc-900 tracking-tight leading-tight">
          Machine Learning <br />
          <span className="font-semibold">from Scratch.</span>
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl leading-relaxed font-light mb-12">
          Understand the core algorithms, not just the APIs. A sophisticated, interactive curriculum for building models from the ground up.
        </p>
        <div className="flex items-center gap-6">
          <Link href="/learn" className="bg-zinc-900 text-white px-8 py-3.5 text-sm font-medium hover:bg-zinc-800 transition-colors rounded-full tracking-wide shadow-sm">
            Explore Curriculum
          </Link>
          <a href="https://github.com/YOUR_ORG/YOUR_REPO" target="_blank" rel="noopener noreferrer" className="text-zinc-500 text-sm font-medium hover:text-zinc-900 transition-colors tracking-wide underline underline-offset-4 decoration-zinc-300">
            View Source
          </a>
        </div>
      </section>

      <section className="border-t border-zinc-200 pt-16">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-sm font-semibold text-zinc-900 tracking-widest uppercase">Curriculum</h2>
          <span className="text-xs text-zinc-400 uppercase tracking-widest">Phase 1</span>
        </div>
        
        <div className="flex flex-col">
          <Link href="/learn/numpy/1.1-ndarray" className="group py-6 border-b border-zinc-200 hover:border-zinc-400 transition-colors flex items-start sm:items-center gap-6">
            <div className="text-xs font-mono text-zinc-400 w-8">1.1</div>
            <div className="flex-grow">
              <h3 className="text-base font-medium text-zinc-900 group-hover:text-zinc-600 transition-colors">NumPy Basics: ndarray</h3>
              <p className="text-zinc-500 mt-1 text-sm font-light">Vectorization, broadcasting, and matrix mathematics.</p>
            </div>
            <div className="hidden sm:block text-zinc-300 group-hover:text-zinc-900 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </div>
          </Link>
          {/* Add more chapters here */}
        </div>
      </section>
    </div>
  );
}