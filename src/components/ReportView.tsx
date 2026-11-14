import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSearch,
  Mail,
  RotateCcw,
  Search,
  Settings,
  TrendingUp,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { CALENDLY_URL, LEAD_ROLES, VENDOR_PRICING_TABLE } from '../data/questions';
import { getAccessToken, SENDER_ADVISOR_EMAIL } from '../lib/firebaseAuth';
import type { DiagnosticAnswers, DiagnosticReport } from '../types/diagnostic';
import { downloadDiagnosticPdf, getDiagnosticPdfBase64 } from '../utils/pdfExport';
import {
  computeBurnoutRisk,
  computeRevenueRisk,
  getOperationalPostureRows,
} from '../utils/riskMetrics';
import type { RiskGaugeMetric } from '../utils/riskMetrics';
import { AnalyticsCard } from './AnalyticsCard';
import { ConfirmEmailModal } from './ConfirmEmailModal';
import { GoogleSignInButton } from './GoogleSignInButton';

interface ReportViewProps {
  answers: DiagnosticAnswers;
  report: DiagnosticReport;
  onRetake: () => void;
  authUserEmail: string | null;
  gmailAccessToken: string | null;
  isLoggingIn: boolean;
  authError: string | null;
  onGoogleSignIn: () => Promise<string | null>;
  onAuthExpired: () => void;
}

function CircularRiskGauge({ metric }: { metric: RiskGaugeMetric }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - metric.score / 100);
  const strokeColor = metric.severity === 'low' ? '#39FF14' : metric.colorHex;

  return (
    <div className="relative flex h-22 w-22 shrink-0 items-center justify-center">
      <svg className="h-22 w-22 -rotate-90" viewBox="0 0 84 84" aria-hidden="true">
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="7"
        />
        <circle
          cx="42"
          cy="42"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-base font-bold text-white tabular-nums">
          {metric.score}%
        </span>
      </div>
    </div>
  );
}

export function ReportView({
  answers,
  report,
  onRetake,
  authUserEmail,
  gmailAccessToken,
  isLoggingIn,
  authError,
  onGoogleSignIn,
  onAuthExpired,
}: ReportViewProps) {
  const [quickEmail, setQuickEmail] = useState('');
  const [quickEmailError, setQuickEmailError] = useState<string | null>(null);
  const [isQuickSubmitting, setIsQuickSubmitting] = useState(false);
  const [needsAuthForQuickEmail, setNeedsAuthForQuickEmail] = useState(false);

  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingLead, setIsSavingLead] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [savedLeadId, setSavedLeadId] = useState<string | null>(null);

  const [pendingSendTarget, setPendingSendTarget] = useState<{
    recipientEmail: string;
    recipientRole: string;
    leadId: string | null;
  } | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);
  const [emailSentInfo, setEmailSentInfo] = useState<{
    recipientEmail: string;
    fileName: string;
  } | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const reportId = useMemo(() => {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `#EP-2026-${num}`;
  }, [report.generatedAt]);
  const attachmentFileName = `EMR-Pulse-Report-${reportId.replace('#', '')}.pdf`;
  const revenueRisk = computeRevenueRisk(answers.denialDiscoveryLag);
  const burnoutRisk = computeBurnoutRisk(answers.afterHoursChartingHours);
  const postureRows = getOperationalPostureRows(answers);
  const safeTopRisks = Array.isArray(report.topRisks) ? report.topRisks : [];

  const parsedDate = Date.parse(report.generatedAt);
  const generatedDate = Number.isNaN(parsedDate)
    ? new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date(parsedDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });

  const handleQuickEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = quickEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmed)) {
      setQuickEmailError('Please enter a valid email address.');
      return;
    }

    setQuickEmailError(null);
    setEmailSendError(null);
    setIsQuickSubmitting(true);

    try {
      let leadId: string | null = savedLeadId;
      try {
        const leadResponse = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: trimmed,
            role: role || 'Other',
            answers,
            recommendedCategory: report.recommendedCategory,
            topRiskTitles: safeTopRisks.map((r) => r.title),
          }),
        });
        if (leadResponse.ok) {
          const leadData = await leadResponse.json();
          if (typeof leadData.id === 'string') {
            leadId = leadData.id;
            setSavedLeadId(leadData.id);
          }
        }
      } catch {
        // Non-blocking: lead archival failure should not prevent sending email
      }

      setPendingSendTarget({
        recipientEmail: trimmed,
        recipientRole: role,
        leadId,
      });

      const activeToken = gmailAccessToken || (await getAccessToken());
      if (activeToken) {
        setNeedsAuthForQuickEmail(false);
        setIsConfirmModalOpen(true);
      } else {
        setNeedsAuthForQuickEmail(true);
      }
    } finally {
      setIsQuickSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!role) {
      setFormError('Please select your role in the practice.');
      return;
    }

    if (!emailRegex.test(trimmed)) {
      setFormError('Please enter a valid practice or work email address.');
      return;
    }

    setFormError(null);
    setEmailSendError(null);
    setIsSavingLead(true);

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          role,
          answers,
          recommendedCategory: report.recommendedCategory,
          topRiskTitles: safeTopRisks.map((r) => r.title),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not submit your request right now.');
      }

      const newLeadId = typeof data.id === 'string' ? data.id : null;
      setLeadSubmitted(true);
      setSavedLeadId(newLeadId);
      setPendingSendTarget({
        recipientEmail: trimmed,
        recipientRole: role,
        leadId: newLeadId,
      });

      const activeToken = gmailAccessToken || (await getAccessToken());
      if (activeToken) {
        setIsConfirmModalOpen(true);
      }
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : 'Unable to save request. Please retry.'
      );
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleConnectAndPrepareEmail = async () => {
    setEmailSendError(null);
    const token = await onGoogleSignIn();
    if (!token) return;

    setNeedsAuthForQuickEmail(false);
    if (pendingSendTarget) {
      setIsConfirmModalOpen(true);
    } else if (leadSubmitted && email.trim()) {
      setPendingSendTarget({
        recipientEmail: email.trim(),
        recipientRole: role,
        leadId: savedLeadId,
      });
      setIsConfirmModalOpen(true);
    } else if (quickEmail.trim()) {
      setPendingSendTarget({
        recipientEmail: quickEmail.trim(),
        recipientRole: role,
        leadId: savedLeadId,
      });
      setIsConfirmModalOpen(true);
    }
  };

  const handleConfirmSendEmail = async () => {
    const activeToken = gmailAccessToken || (await getAccessToken());
    if (!activeToken) {
      onAuthExpired();
      setIsConfirmModalOpen(false);
      return;
    }

    const targetEmail = (
      pendingSendTarget?.recipientEmail ||
      quickEmail ||
      email
    ).trim();
    const targetRole = pendingSendTarget?.recipientRole ?? role;
    const targetLeadId = pendingSendTarget?.leadId ?? savedLeadId;

    setIsSendingEmail(true);
    setEmailSendError(null);

    try {
      const { base64, fileName } = getDiagnosticPdfBase64(report, answers, reportId);
      const response = await fetch('/api/send-report-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          recipientEmail: targetEmail,
          role: targetRole,
          answers,
          report,
          reportId,
          leadId: targetLeadId,
          pdfBase64: base64,
          fileName,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onAuthExpired();
          setIsConfirmModalOpen(false);
          setEmailSendError(
            data.error ||
              'Gmail authorization expired. Please sign in with Google again to send.'
          );
          return;
        }
        throw new Error(data.error || 'Could not send email via Gmail.');
      }

      setEmailSentInfo({
        recipientEmail: data.recipientEmail || targetEmail,
        fileName: data.fileName || fileName,
      });
      setNeedsAuthForQuickEmail(false);
      setIsConfirmModalOpen(false);
    } catch (err: unknown) {
      setEmailSendError(
        err instanceof Error ? err.message : 'Failed to send email via Gmail.'
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <main className="relative flex-1 overflow-hidden bg-[#070A0E] text-[#F1F5F9]">
      {/* Subtle Ambient Glows */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-0 h-96 w-96 rounded-full bg-[#39FF14]/6 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-24 h-80 w-80 rounded-full bg-[#0F5C5B]/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Dashboard Toolbar */}
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
            <span className="text-[#39FF14]">4-Stage Healthcare Analytics Brief</span>
            <span aria-hidden="true">·</span>
            <span>Generated {generatedDate}</span>
            <span aria-hidden="true">·</span>
            <span>Zero PHI Collected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => downloadDiagnosticPdf(report, answers, true, reportId)}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-[#39FF14]/55 bg-[#39FF14]/10 px-4 py-2 text-sm font-semibold text-[#39FF14] transition-colors hover:bg-[#39FF14] hover:text-[#070A0E] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF14] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Download report as PDF</span>
            </button>

            <button
              type="button"
              onClick={onRetake}
              className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-white/30 hover:bg-white/[0.08] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Retake</span>
            </button>
          </div>
        </div>

        {/* Send to Email Box (Directly Below PDF Download Button) */}
        <section
          aria-label="Send diagnostic report to your inbox"
          className="mb-6 rounded-2xl border border-white/12 bg-white/[0.04] p-5 backdrop-blur-md shadow-[0_8px_28px_rgba(0,0,0,0.3)] sm:p-6"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-lg">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#39FF14]">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Direct PDF Email Delivery</span>
              </div>
              <h2 className="mt-1 font-display text-base font-bold text-white sm:text-lg">
                Want this report sent directly to your inbox?
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-300">
                Receive your formatted PDF diagnostic report directly via Gmail from{' '}
                <span className="font-mono text-slate-200">{SENDER_ADVISOR_EMAIL}</span>.
              </p>
            </div>

            <div className="w-full lg:max-w-lg">
              {emailSentInfo ? (
                <div
                  role="status"
                  className="flex items-center gap-2.5 rounded-xl border border-[#39FF14]/45 bg-[#39FF14]/12 px-4 py-3 text-sm text-white"
                >
                  <CheckCircle2
                    className="h-5 w-5 shrink-0 text-[#39FF14]"
                    aria-hidden="true"
                  />
                  <div>
                    <p className="font-bold text-[#39FF14]">
                      Report sent! Check your inbox.
                    </p>
                    <p className="text-xs text-slate-200">
                      Sent <span className="font-mono">{emailSentInfo.fileName}</span> to{' '}
                      <span className="font-semibold">{emailSentInfo.recipientEmail}</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleQuickEmailSubmit} noValidate className="space-y-2.5">
                  <div className="flex flex-col gap-2.5 sm:flex-row">
                    <label htmlFor="quick-report-email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="quick-report-email"
                      type="email"
                      required
                      value={quickEmail}
                      onChange={(e) => {
                        setQuickEmail(e.target.value);
                        if (quickEmailError) setQuickEmailError(null);
                      }}
                      placeholder="you@yourpractice.com"
                      className="min-h-[44px] flex-1 rounded-lg border border-white/15 bg-[#0B1017] px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#39FF14] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/25"
                    />
                    <button
                      type="submit"
                      disabled={isQuickSubmitting}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#39FF14] px-5 py-2 text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>
                        {isQuickSubmitting ? 'Preparing...' : 'Email me this report'}
                      </span>
                    </button>
                  </div>

                  {quickEmailError ? (
                    <p
                      role="alert"
                      className="flex items-center gap-1.5 text-xs text-red-400"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{quickEmailError}</span>
                    </p>
                  ) : null}

                  {needsAuthForQuickEmail && !gmailAccessToken ? (
                    <div className="flex flex-col gap-2.5 rounded-lg border border-amber-400/35 bg-amber-400/10 p-3 text-xs text-amber-100 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Connect Gmail (<span className="font-mono">{SENDER_ADVISOR_EMAIL}</span>)
                        to dispatch the PDF to <span className="font-semibold">{quickEmail.trim()}</span>.
                      </span>
                      <GoogleSignInButton
                        onClick={handleConnectAndPrepareEmail}
                        disabled={isLoggingIn}
                        label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                        compact
                      />
                    </div>
                  ) : null}
                </form>
              )}
            </div>
          </div>
        </section>

        {/* 1. HEADER & BRANDING (DEEP NAVY #0A192F + DARK TEAL CTA BOX) */}
        <section
          aria-label="Diagnostic report header"
          className="mb-8 overflow-hidden rounded-2xl border border-white/12 bg-[#0A192F] p-6 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)] sm:p-8"
        >
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12 lg:gap-8">
            {/* Left Top Corner: Stylish Graphic Block + Report ID + Prepared By */}
            <div className="flex flex-col justify-between lg:col-span-7">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#39FF14]/40 bg-[#0F5C5B]/45 shadow-[0_0_20px_rgba(57,255,20,0.16)]">
                  <svg viewBox="0 0 36 36" className="h-8 w-8" fill="none" aria-hidden="true">
                    <path
                      d="M15 5H21V15H31V21H21V31H15V21H5V15H15V5Z"
                      stroke="#39FF14"
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 18H13.5L16 13.5L19.5 22.5L22 18H28"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div>
                  <p className="font-mono text-xs font-bold tracking-wider text-[#39FF14] tabular-nums">
                    REPORT ID: {reportId}
                  </p>
                  <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                    Practice Analytics &amp; Action Roadmap
                  </h1>
                </div>
              </div>

              <div className="mt-6 border-t border-white/15 pt-4">
                <p className="text-sm font-semibold text-white">
                  Prepared by: Mr. Ali | Healthcare IT &amp; RCM Advisor
                </p>
                <p className="mt-0.5 text-xs text-slate-300">
                  Syed Zahid Ali · Vendor-Neutral Diagnostic for EMR, Practice Management, RCM
                  &amp; Full-Suite EHR Users
                </p>
              </div>
            </div>

            {/* Right Top Corner: Dark Teal High-Contrast CTA Box */}
            <div className="flex flex-col justify-between rounded-xl border border-[#39FF14]/25 bg-[#0F5C5B] p-5 text-white sm:p-6 lg:col-span-5">
              <p className="font-display text-base font-bold leading-snug text-white">
                Don&apos;t let this data sit in a drawer. Let&apos;s save your time and money. Book
                a 15-min diagnostic review with Mr. Ali today.
              </p>
              <div className="mt-5">
                <a
                  href={CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#39FF14] px-4 py-2.5 text-center text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <span>
                    Book a free 15-min diagnostic call with Mr. Ali, Healthcare IT &amp; RCM
                    Advisor.
                  </span>
                  <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* PHASE 2: VERTICAL TIMELINE OF THE 4 TYPES OF DATA ANALYTICS */}
        <div className="space-y-8">
          {/* CARD 1: DESCRIPTIVE ANALYTICS (What happened?) */}
          <AnalyticsCard
            Icon={FileSearch}
            stepNumber="01"
            questionTag="What happened?"
            title="Descriptive Analytics"
            subtitle="Your current baseline."
            delay={0}
            content={
              <div className="space-y-6">
                <p className="text-base leading-relaxed text-slate-200 tracking-[0.01em]">
                  {report.executiveSummary}
                </p>

                {/* Risk Score Gauges + Raw Inputs */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  {/* Visual 1: Revenue Risk Gauge */}
                  <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-xs font-semibold text-slate-400">
                          Revenue Risk Signal
                        </span>
                        <h3
                          className="mt-1.5 font-display text-base font-bold"
                          style={{
                            color:
                              revenueRisk.severity === 'low' ? '#39FF14' : revenueRisk.colorHex,
                          }}
                        >
                          {revenueRisk.label}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Denial lag:{' '}
                          <span className="font-semibold text-white">
                            {answers.denialDiscoveryLag}
                          </span>
                        </p>
                      </div>
                      <CircularRiskGauge metric={revenueRisk} />
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${revenueRisk.score}%`,
                          backgroundColor:
                            revenueRisk.severity === 'low' ? '#39FF14' : revenueRisk.colorHex,
                        }}
                      />
                    </div>
                  </div>

                  {/* Visual 2: Charting Burnout Gauge */}
                  <div className="flex flex-col justify-between rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                          <Clock className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
                          <span>After-Hours Charting</span>
                        </div>
                        <h3
                          className="mt-1.5 font-display text-base font-bold"
                          style={{
                            color:
                              burnoutRisk.severity === 'low' ? '#39FF14' : burnoutRisk.colorHex,
                          }}
                        >
                          {burnoutRisk.label}
                        </h3>
                        <p className="mt-1 text-xs text-slate-400">
                          Weekly load:{' '}
                          <span className="font-semibold text-white">
                            {answers.afterHoursChartingHours} hrs/wk
                          </span>
                        </p>
                      </div>
                      <CircularRiskGauge metric={burnoutRisk} />
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${burnoutRisk.score}%`,
                          backgroundColor:
                            burnoutRisk.severity === 'low' ? '#39FF14' : burnoutRisk.colorHex,
                        }}
                      />
                    </div>
                  </div>

                  {/* Raw Practice Inputs Baseline */}
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-4">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                      <Activity className="h-3.5 w-3.5 text-[#39FF14]" aria-hidden="true" />
                      <span>Reported Operational Inputs</span>
                    </div>
                    <dl className="mt-3 divide-y divide-white/10">
                      {postureRows.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-baseline justify-between gap-3 py-2 first:pt-1 last:pb-0"
                        >
                          <dt className="text-xs text-slate-400">{row.label}</dt>
                          <dd className="text-right font-mono text-xs font-semibold text-white tabular-nums">
                            {row.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </div>
            }
          />

          {/* CARD 2: DIAGNOSTIC ANALYTICS (Why did it happen?) */}
          <AnalyticsCard
            Icon={Search}
            stepNumber="02"
            questionTag="Why did it happen?"
            title="Diagnostic Analytics"
            subtitle="Root causes and operational risks identified in your practice."
            accentTone="amber"
            delay={0.05}
            content={
              <div className="space-y-5">
                {report.rcmRiskAlert ? (
                  <div
                    role="region"
                    aria-label="RCM Risk Alert"
                    className="rounded-xl border border-red-400/40 bg-red-500/12 p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                        <h3 className="font-display text-base font-bold text-red-200">
                          RCM Risk Alert
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-red-300">
                        Critical Revenue Risk
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-red-100">
                      {report.rcmRiskAlert}
                    </p>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {safeTopRisks.map((risk, index) => (
                    <div
                      key={`${risk.title}-${index}`}
                      className="flex flex-col justify-between rounded-xl border border-white/12 bg-white/[0.03] p-5"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-300 tabular-nums">
                          Root Cause 0{index + 1}
                        </span>
                        <h3 className="mt-1.5 font-display text-lg font-bold text-white">
                          {risk.title}
                        </h3>

                        {/* Highlighted Mechanism Causal Chain */}
                        <div className="mt-3 flex items-center gap-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/8 px-3.5 py-2.5 text-xs font-semibold text-[#39FF14]">
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>Mechanism: {risk.mechanism}</span>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                          {risk.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          {/* CARD 3: PREDICTIVE ANALYTICS (What is likely to happen?) */}
          <AnalyticsCard
            Icon={TrendingUp}
            stepNumber="03"
            questionTag="What is likely to happen?"
            title="Predictive Analytics"
            subtitle="Forecasted impact if left unaddressed."
            accentTone="cyan"
            delay={0.1}
            content={
              <div className="space-y-6">
                <div className="rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/[0.06] p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold tracking-wide text-slate-300">
                      Projected Annual Practice Impact
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      Industry estimate — not a guarantee
                    </span>
                  </div>

                  <p className="mt-3 font-display text-2xl font-extrabold tracking-tight text-[#39FF14] tabular-nums sm:text-4xl">
                    {report.impactRange}
                  </p>

                  <p className="mt-3 text-sm leading-relaxed text-slate-300">
                    {report.impactDisclaimer}
                  </p>
                </div>
              </div>
            }
          />

          {/* CARD 4: PRESCRIPTIVE ANALYTICS (What should we do about it?) */}
          <AnalyticsCard
            Icon={Settings}
            stepNumber="04"
            questionTag="What should we do about it?"
            title="Prescriptive Analytics"
            subtitle="Your action plan for business growth."
            delay={0.15}
            isLast
            content={
              <div className="space-y-7">
                {/* Priority Category Recommendation */}
                <div className="rounded-xl border border-[#39FF14]/35 bg-[#39FF14]/[0.07] p-5 sm:p-6">
                  <span className="text-xs font-bold tracking-wide text-[#39FF14]">
                    First Action Priority
                  </span>
                  <h3 className="mt-1.5 font-display text-xl font-bold text-white">
                    Prioritize first: {report.recommendedCategory}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-200">
                    {report.categoryRationale}
                  </p>
                </div>

                {/* Decision Catalyst Banner (Centered & Clean, No Raw URL Text) */}
                <div
                  aria-label="Decision Catalyst"
                  className="rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-6 py-7 text-center text-[#0A192F] sm:px-8 sm:py-8"
                >
                  <div className="mx-auto flex max-w-2xl flex-col items-center">
                    <h3 className="font-display text-xl font-extrabold tracking-tight text-[#0A192F] sm:text-2xl">
                      Stop guessing. Make a decision today.
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-[#334155] sm:text-base">
                      You have the diagnostic data. Now you need the right partner. I have already
                      vetted the top EMR and RCM vendors for US practices. Let me save you weeks of
                      research.
                    </p>

                    <div className="mt-6 flex w-full flex-col items-center">
                      <a
                        href={CALENDLY_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-lg bg-[#0F5C5B] px-7 py-3.5 text-center text-sm font-bold text-white shadow-md transition-colors hover:bg-[#0B4746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5C5B] sm:text-base"
                      >
                        <Calendar className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span>Book a free 15-min diagnostic call with Mr. Ali</span>
                        <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                      <p className="mt-2.5 max-w-lg text-xs leading-relaxed text-[#475569]">
                        Calendly will automatically detect your practice&apos;s time zone so you can
                        book without doing any math. You can also change it manually if needed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Market Snapshot: Estimated Vendor Pricing Comparison Table (Unblurred & Free) */}
                <div>
                  <div className="flex flex-col justify-between gap-2 pb-3 sm:flex-row sm:items-end">
                    <div>
                      <h3 className="font-display text-lg font-bold text-white sm:text-xl">
                        Market Snapshot: Estimated Vendor Pricing (For Reference)
                      </h3>
                      <p className="mt-1 text-xs font-medium text-[#39FF14]">
                        Vendor-neutral reference — EMR Pulse is not affiliated with these vendors.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-xl border border-slate-300 bg-white shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead>
                        <tr className="bg-[#0A192F] text-white">
                          <th
                            scope="col"
                            className="border-b border-[#1E3A5F] px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white"
                          >
                            Vendor Name
                          </th>
                          <th
                            scope="col"
                            className="border-b border-[#1E3A5F] px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white"
                          >
                            Solution Type
                          </th>
                          <th
                            scope="col"
                            className="border-b border-[#1E3A5F] px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white"
                          >
                            Est. Starting Price
                          </th>
                          <th
                            scope="col"
                            className="border-b border-[#1E3A5F] px-5 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white"
                          >
                            Best For
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {VENDOR_PRICING_TABLE.map((row, index) => (
                          <tr
                            key={row.vendorName}
                            className={index % 2 === 0 ? 'bg-white' : 'bg-slate-100'}
                          >
                            <td className="px-5 py-4 font-display font-bold text-[#0A192F] whitespace-nowrap">
                              {row.vendorName}
                            </td>
                            <td className="px-5 py-4 font-medium text-[#0F766E] whitespace-nowrap">
                              {row.solutionType}
                            </td>
                            <td className="px-5 py-4 font-mono text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap sm:text-sm">
                              {row.estStartingPrice}
                            </td>
                            <td className="px-5 py-4 leading-relaxed text-slate-700">
                              {row.bestFor}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Secondary "Still Confused?" CTA Box (Directly Below Table) */}
                <div
                  aria-label="Vendor negotiation advisory"
                  className="rounded-xl border border-[#39FF14]/35 bg-[#0A192F] px-6 py-7 text-center text-white shadow-[0_8px_28px_rgba(0,0,0,0.35)] sm:px-8"
                >
                  <div className="mx-auto flex max-w-2xl flex-col items-center">
                    <h3 className="font-display text-lg font-extrabold tracking-tight text-white sm:text-xl">
                      Still confused about which path fits your practice?
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-200">
                      Pricing changes fast, and hidden implementation fees are common. Let&apos;s
                      talk to a specialist. I&apos;ve vetted these vendors and can help you
                      negotiate the best rate and avoid bad contracts.
                    </p>
                    <a
                      href={CALENDLY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-[#39FF14] px-6 py-3 text-center text-sm font-bold text-[#070A0E] shadow-sm transition-colors hover:bg-[#52FF33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:text-base"
                    >
                      <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>Talk to Mr. Ali (Healthcare IT &amp; RCM Advisor)</span>
                      <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                {/* Integrated Lead Capture (LeadSubmissionPayload) */}
                <div
                  id="unlock-vendors"
                  className="rounded-xl border border-white/12 bg-white/[0.03] p-5 sm:p-6"
                >
                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#39FF14]">
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        <span>Prescriptive Action Plan Delivery</span>
                      </div>
                      <h3 className="mt-2 font-display text-lg font-bold text-white">
                        Get this prescriptive action plan sent to your inbox.
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
                        Enter your role and practice email to receive a saved copy of your
                        diagnostic roadmap and pricing benchmark for team review.
                      </p>
                    </div>

                    <div className="lg:col-span-7 space-y-4">
                      {/* Gmail Sender Connection Banner */}
                      <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#0B1017] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs">
                          {gmailAccessToken ? (
                            <p className="font-medium text-slate-200">
                              Gmail connected:{' '}
                              <span className="font-mono font-semibold text-[#39FF14]">
                                {authUserEmail || SENDER_ADVISOR_EMAIL}
                              </span>{' '}
                              <span className="text-slate-400">
                                (BCC copy to {SENDER_ADVISOR_EMAIL})
                              </span>
                            </p>
                          ) : (
                            <p className="text-slate-300">
                              Sign in with{' '}
                              <span className="font-mono font-semibold text-white">
                                {SENDER_ADVISOR_EMAIL}
                              </span>{' '}
                              to send the PDF report email automatically.
                            </p>
                          )}
                        </div>

                        {!gmailAccessToken ? (
                          <GoogleSignInButton
                            onClick={handleConnectAndPrepareEmail}
                            disabled={isLoggingIn}
                            label={isLoggingIn ? 'Connecting...' : 'Sign in with Google'}
                            compact
                          />
                        ) : null}
                      </div>

                      {authError ? (
                        <p
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-amber-300"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{authError}</span>
                        </p>
                      ) : null}

                      {leadSubmitted ? (
                        emailSentInfo ? (
                          <div
                            role="status"
                            className="flex items-start gap-3 rounded-lg border border-[#39FF14]/40 bg-[#39FF14]/10 p-4 text-sm text-white"
                          >
                            <CheckCircle2
                              className="mt-0.5 h-5 w-5 shrink-0 text-[#39FF14]"
                              aria-hidden="true"
                            />
                            <div>
                              <p className="font-bold text-[#39FF14]">
                                Report sent! Check your inbox.
                              </p>
                              <p className="mt-0.5 text-slate-200">
                                Sent from{' '}
                                <span className="font-semibold">{SENDER_ADVISOR_EMAIL}</span> to{' '}
                                <span className="font-semibold">
                                  {emailSentInfo.recipientEmail}
                                </span>{' '}
                                {role ? `(${role}) ` : ''}with{' '}
                                <span className="font-mono text-xs">
                                  {emailSentInfo.fileName}
                                </span>{' '}
                                attached and a BCC record sent to{' '}
                                <span className="font-semibold">{SENDER_ADVISOR_EMAIL}</span>.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div
                            role="status"
                            className="flex flex-col gap-3 rounded-lg border border-[#39FF14]/35 bg-[#39FF14]/8 p-4 text-sm text-white sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-start gap-3">
                              <CheckCircle2
                                className="mt-0.5 h-5 w-5 shrink-0 text-[#39FF14]"
                                aria-hidden="true"
                              />
                              <div>
                                <p className="font-bold text-[#39FF14]">
                                  Lead saved for {email} ({role}).
                                </p>
                                <p className="mt-0.5 text-xs text-slate-200">
                                  {gmailAccessToken
                                    ? 'Click send to review and email the PDF report with BCC to zahidshah343@gmail.com.'
                                    : 'Sign in with Google above to send the PDF report from zahidshah343@gmail.com.'}
                                </p>
                              </div>
                            </div>

                            {gmailAccessToken ? (
                              <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(true)}
                                className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#39FF14] px-4 py-2 text-xs font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] whitespace-nowrap shrink-0 cursor-pointer"
                              >
                                Review &amp; send email
                              </button>
                            ) : (
                              <GoogleSignInButton
                                onClick={handleConnectAndPrepareEmail}
                                disabled={isLoggingIn}
                                label={isLoggingIn ? 'Connecting...' : 'Sign in to send'}
                                compact
                              />
                            )}
                          </div>
                        )
                      ) : (
                        <form onSubmit={handleEmailSubmit} noValidate className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                            <div className="sm:col-span-5">
                              <label
                                htmlFor="lead-role"
                                className="mb-1 block text-xs font-semibold text-slate-300"
                              >
                                Your role
                              </label>
                              <select
                                id="lead-role"
                                required
                                value={role}
                                onChange={(e) => {
                                  setRole(e.target.value);
                                  if (formError) setFormError(null);
                                }}
                                className="min-h-[46px] w-full rounded-lg border border-white/15 bg-[#0B1017] px-3.5 py-2.5 text-sm text-white focus:border-[#39FF14] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/25"
                              >
                                <option value="">Select your role</option>
                                {LEAD_ROLES.map((roleOption) => (
                                  <option key={roleOption} value={roleOption}>
                                    {roleOption}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-7">
                              <label
                                htmlFor="lead-email"
                                className="mb-1 block text-xs font-semibold text-slate-300"
                              >
                                Practice or work email
                              </label>
                              <div className="flex flex-col gap-2.5 sm:flex-row">
                                <input
                                  id="lead-email"
                                  type="email"
                                  required
                                  value={email}
                                  onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (formError) setFormError(null);
                                  }}
                                  placeholder="you@yourpractice.com"
                                  className="min-h-[46px] flex-1 rounded-lg border border-white/15 bg-[#0B1017] px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#39FF14] focus:outline-none focus:ring-2 focus:ring-[#39FF14]/25"
                                />
                                <button
                                  type="submit"
                                  disabled={isSavingLead}
                                  className="inline-flex min-h-[46px] items-center justify-center rounded-lg bg-[#39FF14] px-5 py-2.5 text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  {isSavingLead ? 'Saving...' : 'Send action plan'}
                                </button>
                              </div>
                            </div>
                          </div>

                          {formError ? (
                            <p
                              role="alert"
                              className="flex items-center gap-1.5 text-xs text-red-400"
                            >
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                              <span>{formError}</span>
                            </p>
                          ) : null}
                        </form>
                      )}

                      {emailSendError && !isConfirmModalOpen ? (
                        <p
                          role="alert"
                          className="flex items-center gap-1.5 text-xs text-red-400"
                        >
                          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <span>{emailSendError}</span>
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            }
          />
        </div>

        {/* FOOTER SUMMARY BOX (4 Analytics Framework Synthesis) */}
        <motion.aside
          initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 rounded-2xl border border-[#39FF14]/25 bg-white/[0.04] p-6 backdrop-blur-md"
        >
          <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
            <span className="font-semibold text-[#39FF14]">Descriptive</span> shows you the past.{' '}
            <span className="font-semibold text-[#39FF14]">Diagnostic</span> explains the why.{' '}
            <span className="font-semibold text-[#39FF14]">Predictive</span> looks ahead.{' '}
            <span className="font-semibold text-[#39FF14]">Prescriptive</span> tells you what to do.
            Together, they turn data into decisions and decisions into business growth.
          </p>
        </motion.aside>
      </div>

      <ConfirmEmailModal
        isOpen={isConfirmModalOpen}
        recipientEmail={(
          pendingSendTarget?.recipientEmail ||
          quickEmail ||
          email
        ).trim()}
        recipientRole={pendingSendTarget?.recipientRole ?? role}
        connectedEmail={authUserEmail}
        attachmentFileName={attachmentFileName}
        isSending={isSendingEmail}
        errorMessage={emailSendError}
        onConfirm={handleConfirmSendEmail}
        onCancel={() => {
          setIsConfirmModalOpen(false);
          setEmailSendError(null);
        }}
      />
    </main>
  );
}
