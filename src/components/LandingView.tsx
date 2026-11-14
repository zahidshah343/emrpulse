import {
  ArrowRight,
  FileSearch,
  Search,
  Settings,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { VENDOR_CATALOG } from '../data/questions';

interface LandingViewProps {
  onStartDiagnostic: () => void;
}

const ANALYTICS_FRAMEWORK = [
  {
    step: '01',
    name: 'Descriptive',
    question: 'What happened?',
    detail: 'Your 6 workflow checkpoints establish an immediate operational baseline.',
    Icon: FileSearch,
  },
  {
    step: '02',
    name: 'Diagnostic',
    question: 'Why did it happen?',
    detail: 'Pinpoints hidden root causes across claim lag, charting load, and staff ratio.',
    Icon: Search,
  },
  {
    step: '03',
    name: 'Predictive',
    question: 'What is likely to happen?',
    detail: 'Projects annual revenue leakage and clinician burnout exposure.',
    Icon: TrendingUp,
  },
  {
    step: '04',
    name: 'Prescriptive',
    question: 'What should we do?',
    detail: 'Delivers a prioritized category roadmap and unaffiliated partner matches.',
    Icon: Settings,
  },
];

export function LandingView({ onStartDiagnostic }: LandingViewProps) {
  return (
    <main className="flex-1 bg-[#070A0E] text-[#F1F5F9]">
      {/* Hero Section */}
      <section className="relative overflow-hidden mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-80 w-80 rounded-full bg-[#39FF14]/8 blur-3xl"
        />

        <div className="relative grid grid-cols-1 items-stretch gap-12 lg:grid-cols-12 lg:gap-12">
          <div className="flex flex-col justify-center lg:col-span-7">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-[#39FF14]">
              <span>Vendor-neutral practice diagnostic</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-300">4-Stage Analytics Engine</span>
              <span aria-hidden="true" className="text-slate-600">
                ·
              </span>
              <span className="text-slate-300">No patient data</span>
            </div>

            <h1 className="font-display text-[clamp(2.2rem,4vw,3.35rem)] font-extrabold leading-[1.1] tracking-tight text-white text-balance">
              Find out what&apos;s really costing your practice time and money — in 2 minutes.
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-300 tracking-[0.01em] sm:text-lg">
              Built for all EMR, Practice Management (PM), RCM, and full-suite EHR teams. EMR Pulse
              is strictly vendor-neutral — no pay-to-play rankings, no sales spin, and zero patient
              health information collected. Turn six operational answers into a complete
              Descriptive-to-Prescriptive roadmap.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onStartDiagnostic}
                className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-lg bg-[#39FF14] px-6 py-3.5 text-base font-bold text-[#070A0E] shadow-[0_0_24px_rgba(57,255,20,0.22)] transition-colors hover:bg-[#52FF33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF14] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Start diagnostic</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <span className="text-sm text-slate-400">
                Takes ~2 minutes · Instant 4-stage report &amp; PDF export
              </span>
            </div>
          </div>

          {/* 4 Types of Data Analytics Preview Card */}
          <div className="lg:col-span-5">
            <div className="flex h-full flex-col justify-between rounded-2xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur-md sm:p-7">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <h2 className="font-display text-sm font-bold text-white">
                    The 4-Stage Analytics Framework
                  </h2>
                  <span className="font-mono text-xs text-[#39FF14] tabular-nums">
                    Past → Future
                  </span>
                </div>

                <ul className="divide-y divide-white/10">
                  {ANALYTICS_FRAMEWORK.map((item) => {
                    const StageIcon = item.Icon;
                    return (
                      <li key={item.step} className="flex items-start gap-3.5 py-3.5">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14] shadow-[0_0_16px_rgba(57,255,20,0.16)]">
                          <StageIcon className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-display text-sm font-bold text-white">
                              {item.step}. {item.name}
                            </span>
                            <span className="text-xs font-medium text-[#39FF14] whitespace-nowrap shrink-0">
                              {item.question}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-400">
                            {item.detail}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="mt-5 flex items-start gap-3 border-t border-white/10 pt-4 text-xs leading-relaxed text-slate-400">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#39FF14]"
                  aria-hidden="true"
                />
                <span>
                  What if you could not only see what went wrong in your practice, but predict the
                  future before it even happens?
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="border-t border-white/10 bg-[#0B1017] py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl text-balance">
              Direct, consultative triage before you sit through a vendor demo.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-300">
              Most healthcare practices and RCM teams replace an entire EHR when they only needed an
              ambient scribe, PM overlay, or tighter denial workflow — or stay on a passive record
              system that quietly drains revenue.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="border-t border-white/15 pt-5">
              <p className="font-mono text-xs font-bold text-[#39FF14] tabular-nums">01</p>
              <h3 className="mt-2 font-display text-lg font-bold text-white">
                Capture Descriptive Baseline
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Answer six operational checkpoints covering claim denial lag, after-hours charting,
                staffing leverage, and AI comfort.
              </p>
            </div>

            <div className="border-t border-white/15 pt-5">
              <p className="font-mono text-xs font-bold text-[#39FF14] tabular-nums">02</p>
              <h3 className="mt-2 font-display text-lg font-bold text-white">
                Diagnose &amp; Forecast Impact
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Uncover root operational risks and review a predictive estimate of annual revenue
                leakage and clinician burnout exposure.
              </p>
            </div>

            <div className="border-t border-white/15 pt-5">
              <p className="font-mono text-xs font-bold text-[#39FF14] tabular-nums">03</p>
              <h3 className="mt-2 font-display text-lg font-bold text-white">
                Execute Prescriptive Action
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Review your prioritized solution category, unlock tailored EMR/RCM partner cards, or
                book a 15-minute diagnostic call with Mr. Ali.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vendors Covered */}
      <section id="vendors" className="border-t border-white/10 bg-[#070A0E] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                EMR, Practice Management, RCM &amp; Full-Suite EHR platforms evaluated
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Vendor-neutral recommendation — EMR Pulse is not affiliated with these vendors.
              </p>
            </div>
            <button
              type="button"
              onClick={onStartDiagnostic}
              className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-[#39FF14]/50 bg-[#39FF14]/10 px-4 py-2 text-sm font-semibold text-[#39FF14] transition-colors hover:bg-[#39FF14] hover:text-[#070A0E] whitespace-nowrap shrink-0 cursor-pointer"
            >
              See your match
            </button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {VENDOR_CATALOG.map((vendor) => (
              <div
                key={vendor.name}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
              >
                <h3 className="font-display text-base font-bold text-white">{vendor.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{vendor.profile}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* No-PHI Pledge */}
      <section id="no-phi" className="border-t border-white/10 bg-[#0B1017] py-14 sm:py-16">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <h2 className="font-display text-xl font-bold text-white">
              Zero Protected Health Information (No PHI)
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              EMR Pulse collects operational workflow indicators only. Never enter patient names,
              dates of birth, medical record numbers, payer IDs, or clinical chart notes anywhere in
              this diagnostic.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartDiagnostic}
            className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#39FF14] px-5 py-3 text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Start 2-minute diagnostic</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </section>
    </main>
  );
}
