import { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  FileSearch,
  Loader2,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { DIAGNOSTIC_QUESTIONS } from '../data/questions';
import type { DiagnosticAnswers } from '../types/diagnostic';

interface DiagnosticFormProps {
  initialAnswers?: Partial<DiagnosticAnswers>;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (answers: DiagnosticAnswers) => void;
  onBackToHome: () => void;
}

const ANALYTICS_STAGES = [
  '01 Descriptive',
  '02 Diagnostic',
  '03 Predictive',
  '04 Prescriptive',
];

export function DiagnosticForm({
  initialAnswers = {},
  isSubmitting,
  errorMessage,
  onSubmit,
  onBackToHome,
}: DiagnosticFormProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>(initialAnswers);
  const [localError, setLocalError] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const currentQuestion = DIAGNOSTIC_QUESTIONS[stepIndex];
  const totalQuestions = DIAGNOSTIC_QUESTIONS.length;
  const selectedValue = answers[currentQuestion.id];
  const progressPercent = Math.round(((stepIndex + 1) / totalQuestions) * 100);
  const isLastStep = stepIndex === totalQuestions - 1;

  const handleSelectOption = (option: string) => {
    setLocalError(null);
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: option,
    }));
  };

  const handleNext = () => {
    if (isSubmitting) return;
    if (!selectedValue) {
      setLocalError('Please select one of the options above to continue.');
      return;
    }

    if (isLastStep) {
      const missingIndex = DIAGNOSTIC_QUESTIONS.findIndex(
        (q) => !answers[q.id]
      );
      if (missingIndex !== -1) {
        setStepIndex(missingIndex);
        setLocalError('Please select an answer for this question first.');
        return;
      }
      setLocalError(null);
      onSubmit(answers as DiagnosticAnswers);
      return;
    }

    setLocalError(null);
    setStepIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
  };

  const handlePrevious = () => {
    if (isSubmitting) return;
    setLocalError(null);
    if (stepIndex === 0) {
      onBackToHome();
      return;
    }
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const displayedError = localError || errorMessage;

  return (
    <main className="relative flex-1 overflow-hidden bg-[#070A0E]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[#39FF14]/6 blur-3xl"
      />

      <section className="relative mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        {/* Phase 1: Descriptive Analytics Framing Header */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-md">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#39FF14]/50 bg-[#39FF14]/10 text-[#39FF14] shadow-[0_0_20px_rgba(57,255,20,0.2)]">
              <FileSearch className="h-4 w-4" strokeWidth={1.85} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold tracking-wide text-[#39FF14]">
                Step 1: Descriptive Analytics (What is happening in your practice?)
              </p>
              <p className="mt-1.5 text-sm italic leading-relaxed text-slate-300">
                &ldquo;What if you could not only see what went wrong in your business, but predict
                the future before it even happens?&rdquo;
              </p>
            </div>
          </div>

          {/* Subtle 4-Stage Journey Trail */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 text-xs">
            {ANALYTICS_STAGES.map((stage, idx) => (
              <span key={stage} className="flex items-center gap-2">
                <span
                  className={
                    idx === 0
                      ? 'font-mono font-bold text-[#39FF14]'
                      : 'font-mono text-slate-500'
                  }
                >
                  {stage}
                </span>
                {idx < ANALYTICS_STAGES.length - 1 ? (
                  <span aria-hidden="true" className="text-slate-600">
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>
        </div>

        {/* Question Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono font-semibold text-[#39FF14] tabular-nums">
              Checkpoint {stepIndex + 1} of {totalQuestions}
            </span>
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              {progressPercent}% complete
            </span>
          </div>
          <div
            className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuenow={stepIndex + 1}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-label={`Question ${stepIndex + 1} of ${totalQuestions}`}
          >
            <div
              className="h-full rounded-full bg-[#39FF14] shadow-[0_0_12px_rgba(57,255,20,0.45)] transition-transform duration-200 ease-out origin-left"
              style={{ transform: `scaleX(${(stepIndex + 1) / totalQuestions})` }}
            />
          </div>
        </div>

        {/* Glassmorphic Question Card */}
        <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.4)] sm:p-9">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="font-display text-2xl font-bold leading-snug tracking-tight text-white sm:text-[1.7rem] text-balance">
                {currentQuestion.question}
              </h1>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                {currentQuestion.helperText}
              </p>

              <fieldset className="mt-7 space-y-3" aria-label={currentQuestion.question}>
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedValue === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSelectOption(option)}
                      aria-pressed={isSelected}
                      className={`flex min-h-[54px] w-full items-center justify-between gap-4 rounded-xl border px-4 py-3.5 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF14] cursor-pointer ${
                        isSelected
                          ? 'border-[#39FF14] bg-[#39FF14]/12 text-white shadow-[0_0_20px_rgba(57,255,20,0.12)]'
                          : 'border-white/12 bg-white/[0.02] text-slate-200 hover:border-white/30 hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="leading-snug">{option}</span>
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isSelected
                            ? 'border-[#39FF14] bg-[#39FF14] text-[#070A0E]'
                            : 'border-white/30 bg-transparent'
                        }`}
                        aria-hidden="true"
                      >
                        {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                      </span>
                    </button>
                  );
                })}
              </fieldset>
            </motion.div>
          </AnimatePresence>

          {displayedError ? (
            <div
              role="alert"
              className="mt-6 flex items-start gap-3 rounded-xl border border-red-400/35 bg-red-500/10 p-4 text-sm text-red-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" aria-hidden="true" />
              <span>{displayedError}</span>
            </div>
          ) : null}

          {/* Navigation Controls */}
          <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={isSubmitting}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>{stepIndex === 0 ? 'Overview' : 'Previous'}</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#39FF14] px-6 py-3 text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF14] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Generating Diagnostic Report...</span>
                </>
              ) : isLastStep ? (
                <>
                  <span>Generate Diagnostic Report</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          No patient identifiers or PHI requested · Operational benchmarks only
        </p>
      </section>
    </main>
  );
}
