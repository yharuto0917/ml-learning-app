import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'ML Learning App',
  description: 'Interactive Machine Learning curriculum',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased selection:bg-zinc-200 selection:text-zinc-900 min-h-screen flex flex-col font-sans">
        <header className="border-b border-zinc-200 bg-zinc-50/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="font-semibold text-zinc-900 tracking-tight text-sm tracking-widest uppercase">
              ML Learning
            </Link>
            <nav className="flex gap-8 text-[13px] font-medium text-zinc-500 uppercase tracking-widest">
              <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
              <Link href="/learn" className="hover:text-zinc-900 transition-colors">Curriculum</Link>
            </nav>
          </div>
        </header>
        <main className="max-w-3xl mx-auto px-6 py-16 w-full flex-grow">
          {children}
        </main>
        <footer className="border-t border-zinc-200 py-12 text-center text-xs text-zinc-400 mt-auto uppercase tracking-widest">
          <div className="max-w-3xl mx-auto px-6">
            © 2026 ML Learning App
          </div>
        </footer>
      </body>
    </html>
  );
}