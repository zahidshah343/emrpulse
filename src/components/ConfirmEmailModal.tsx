import { Mail, Paperclip, Send, X } from 'lucide-react';
import { CALENDLY_URL } from '../data/questions';
import { SENDER_ADVISOR_EMAIL } from '../lib/firebaseAuth';

interface ConfirmEmailModalProps {
  isOpen: boolean;
  recipientEmail: string;
  recipientRole: string;
  connectedEmail: string | null;
  attachmentFileName: string;
  isSending: boolean;
  errorMessage: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmEmailModal({
  isOpen,
  recipientEmail,
  recipientRole,
  connectedEmail,
  attachmentFileName,
  isSending,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmEmailModalProps) {
  if (!isOpen) return null;

  const greetingRole = recipientRole || 'there';
  const subject = 'Your EMR Pulse Diagnostic Report & Next Steps';
  const bodyPreview = `Hi ${greetingRole}, thank you for using EMR Pulse. Attached is your personalized diagnostic report. If you want to save weeks of vendor research and get priority pricing, book a free 15-min call with me here: ${CALENDLY_URL}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-email-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#0C1118] p-6 text-slate-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#39FF14]/40 bg-[#39FF14]/10 text-[#39FF14]">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="confirm-email-title"
                className="font-display text-base font-bold text-white"
              >
                Confirm Diagnostic Report Email
              </h2>
              <p className="text-xs text-slate-400">
                Review recipient, BCC record, and PDF attachment before sending via Gmail.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            aria-label="Cancel email delivery"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3.5 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-400">From:</span>
              <span className="font-mono text-white">
                {connectedEmail || SENDER_ADVISOR_EMAIL}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-400">To:</span>
              <span className="font-mono font-semibold text-[#39FF14]">
                {recipientEmail}
                {recipientRole ? ` (${recipientRole})` : ''}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold text-slate-400">BCC:</span>
              <span className="font-mono text-slate-200">{SENDER_ADVISOR_EMAIL}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2 border-t border-white/10 pt-2">
              <span className="font-semibold text-slate-400">Subject:</span>
              <span className="text-right font-semibold text-white">{subject}</span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3.5">
            <p className="mb-1.5 font-semibold text-slate-400">Message body:</p>
            <p className="leading-relaxed text-slate-200">{bodyPreview}</p>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-[#39FF14]/25 bg-[#39FF14]/6 px-3.5 py-2.5 text-slate-200">
            <Paperclip className="h-4 w-4 shrink-0 text-[#39FF14]" aria-hidden="true" />
            <span className="truncate font-mono text-xs">{attachmentFileName}</span>
          </div>

          {errorMessage ? (
            <p
              role="alert"
              className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
            >
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSending}
            className="inline-flex min-h-[42px] items-center justify-center rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/[0.08] disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSending}
            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-[#39FF14] px-5 py-2 text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] disabled:opacity-60 cursor-pointer"
          >
            <Send className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{isSending ? 'Sending email...' : 'Confirm & Send Email'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
