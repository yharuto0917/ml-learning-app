export function Callout({ children, type = 'info' }: { children: React.ReactNode, type?: 'info' | 'warning' | 'success' }) {
  const styles = {
    info: 'border-zinc-200 text-zinc-800',
    warning: 'border-amber-200 text-amber-900 bg-amber-50/50',
    success: 'border-emerald-200 text-emerald-900 bg-emerald-50/50'
  };

  const iconColor = {
    info: 'text-zinc-400',
    warning: 'text-amber-500',
    success: 'text-emerald-500'
  };

  return (
    <div className={`p-6 border rounded-2xl my-10 flex gap-5 bg-white shadow-sm ${styles[type]}`}>
      <div className={`shrink-0 ${iconColor[type]}`}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </div>
      <div className="text-[15px] font-light leading-relaxed">
        {children}
      </div>
    </div>
  );
}