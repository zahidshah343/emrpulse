import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

export interface AnalyticsCardProps {
  Icon: LucideIcon;
  title: string;
  subtitle: string;
  content?: ReactNode;
  children?: ReactNode;
  stepNumber?: string;
  questionTag?: string;
  accentTone?: 'neon' | 'amber' | 'cyan';
  delay?: number;
  isLast?: boolean;
}

export function AnalyticsCard({
  Icon,
  title,
  subtitle,
  content,
  children,
  stepNumber,
  questionTag,
  accentTone = 'neon',
  delay = 0,
  isLast = false,
}: AnalyticsCardProps) {
  const prefersReducedMotion = useReducedMotion();

  const badgeStyle =
    accentTone === 'amber'
      ? 'border-amber-400/50 bg-amber-400/10 text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.2)]'
      : accentTone === 'cyan'
        ? 'border-cyan-400/50 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.2)]'
        : 'border-[#39FF14]/55 bg-[#39FF14]/10 text-[#39FF14] shadow-[0_0_24px_rgba(57,255,20,0.22)]';

  return (
    <motion.section
      initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.35, delay, ease: [0.16, 1, 0.3, 1] }}
      className="relative flex gap-4 sm:gap-6"
    >
      {/* Vertical Timeline Rail (Desktop & Tablet) */}
      <div className="hidden sm:flex flex-col items-center pt-1">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border backdrop-blur-md ${badgeStyle}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
        </div>
        {!isLast ? (
          <div
            aria-hidden="true"
            className="mt-3 w-px flex-1 bg-gradient-to-b from-[#39FF14]/40 via-white/15 to-white/5"
          />
        ) : null}
      </div>

      {/* Glassmorphic Analytics Card */}
      <div className="flex-1 rounded-2xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-start gap-3.5">
            {/* Mobile Circular Glowing Badge */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border sm:hidden ${badgeStyle}`}
            >
              <Icon className="h-5 w-5" strokeWidth={1.85} aria-hidden="true" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-wide text-slate-400">
                {stepNumber ? (
                  <span className="font-mono font-bold text-[#39FF14] tabular-nums">
                    Stage {stepNumber}
                  </span>
                ) : null}
                {stepNumber && questionTag ? (
                  <span aria-hidden="true" className="text-slate-600">
                    ·
                  </span>
                ) : null}
                {questionTag ? <span className="text-slate-300">{questionTag}</span> : null}
              </div>

              <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-300 tracking-[0.01em]">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="mt-6">{content ?? children}</div>
      </div>
    </motion.section>
  );
}
