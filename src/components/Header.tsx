import { LogOut, Mail } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton';

interface HeaderProps {
  currentStep: 'landing' | 'diagnostic' | 'report';
  onStartDiagnostic: () => void;
  onGoHome: () => void;
  authUserEmail: string | null;
  isGmailConnected: boolean;
  isLoggingIn: boolean;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

export function Header({
  currentStep,
  onStartDiagnostic,
  onGoHome,
  authUserEmail,
  isGmailConnected,
  isLoggingIn,
  onGoogleSignIn,
  onGoogleSignOut,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070A0E]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <button
          type="button"
          onClick={onGoHome}
          className="font-display text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#39FF14] cursor-pointer"
        >
          EMR Pulse
        </button>

        {currentStep === 'landing' ? (
          <nav
            aria-label="Primary"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            <a
              href="#how-it-works"
              className="hover:text-[#39FF14] transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
            <a
              href="#vendors"
              className="hover:text-[#39FF14] transition-colors whitespace-nowrap shrink-0"
            >
              Vendors covered
            </a>
            <a
              href="#no-phi"
              className="hover:text-[#39FF14] transition-colors whitespace-nowrap shrink-0"
            >
              No-PHI pledge
            </a>
          </nav>
        ) : (
          <div className="hidden lg:flex items-center gap-3 text-xs font-medium text-slate-400">
            <span>Vendor-neutral assessment</span>
            <span aria-hidden="true">·</span>
            <span>Workflow &amp; operations only</span>
          </div>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          {isGmailConnected && authUserEmail ? (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/8 px-3 py-1.5 text-xs text-slate-200">
              <Mail className="h-3.5 w-3.5 shrink-0 text-[#39FF14]" aria-hidden="true" />
              <span className="max-w-[165px] truncate font-mono text-[11px] text-white">
                {authUserEmail}
              </span>
              <button
                type="button"
                onClick={onGoogleSignOut}
                title="Disconnect Google account"
                className="inline-flex items-center gap-1 border-l border-white/15 pl-2 text-[11px] font-medium text-slate-300 transition-colors hover:text-white cursor-pointer"
              >
                <LogOut className="h-3 w-3" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <div className="hidden sm:block">
              <GoogleSignInButton
                onClick={onGoogleSignIn}
                disabled={isLoggingIn}
                label={isLoggingIn ? 'Signing in...' : 'Sign in with Google'}
                compact
              />
            </div>
          )}

          {currentStep === 'landing' ? (
            <button
              type="button"
              onClick={onStartDiagnostic}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#39FF14] px-4 py-2 text-sm font-bold text-[#070A0E] transition-colors hover:bg-[#52FF33] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF14] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Start diagnostic
            </button>
          ) : (
            <button
              type="button"
              onClick={currentStep === 'report' ? onStartDiagnostic : onGoHome}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition-colors hover:border-[#39FF14]/50 hover:bg-white/[0.08] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#39FF14] whitespace-nowrap shrink-0 cursor-pointer"
            >
              {currentStep === 'report' ? 'Retake diagnostic' : 'Exit to overview'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
