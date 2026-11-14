export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0A0E14]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="leading-relaxed">
          Built by Syed Zahid Ali (Mr. Ali) — Healthcare IT &amp; RCM Advisor{' '}
          <span aria-hidden="true" className="mx-1 text-slate-600">
            |
          </span>{' '}
          <a
            href="https://www.linkedin.com/in/zahidshahh"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#39FF14] underline decoration-[#39FF14]/35 underline-offset-4 transition-colors hover:text-[#6BFF4D] hover:decoration-[#6BFF4D]"
          >
            linkedin.com/in/zahidshahh
          </a>
        </p>
        <p className="text-xs text-slate-500 whitespace-nowrap shrink-0">
          Operations only · Zero PHI collected
        </p>
      </div>
    </footer>
  );
}
