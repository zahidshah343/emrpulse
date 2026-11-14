import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingView } from './components/LandingView';
import { DiagnosticForm } from './components/DiagnosticForm';
import { ReportView } from './components/ReportView';
import {
  clearAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './lib/firebaseAuth';
import type { DiagnosticAnswers, DiagnosticReport } from './types/diagnostic';

type AppStep = 'landing' | 'diagnostic' | 'report';

export default function App() {
  const [step, setStep] = useState<AppStep>('landing');
  const [answers, setAnswers] = useState<DiagnosticAnswers | null>(null);
  const [report, setReport] = useState<DiagnosticReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [authUser, setAuthUser] = useState<User | null>(null);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setAuthUser(user);
        setGmailAccessToken(token);
        setAuthError(null);
      },
      () => {
        setAuthUser(null);
        setGmailAccessToken(null);
      }
    );
    return unsubscribe;
  }, []);

  const handleGoogleSignIn = async (): Promise<string | null> => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      setAuthUser(result.user);
      setGmailAccessToken(result.accessToken);
      return result.accessToken;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Google sign-in was cancelled or failed.';
      setAuthError(message);
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await logout();
    setAuthUser(null);
    setGmailAccessToken(null);
    setAuthError(null);
  };

  const handleAuthExpired = () => {
    clearAccessToken();
    setGmailAccessToken(null);
    setAuthError('Gmail session expired. Please sign in with Google again to send emails.');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartDiagnostic = () => {
    setErrorMessage(null);
    setStep('diagnostic');
    scrollToTop();
  };

  const handleGoHome = () => {
    setErrorMessage(null);
    setStep('landing');
    scrollToTop();
  };

  const handleDiagnosticSubmit = async (submittedAnswers: DiagnosticAnswers) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: submittedAnswers }),
      });

      const data = (await response.json().catch(() => ({}))) as Partial<DiagnosticReport> & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate diagnostic report.');
      }

      setAnswers(submittedAnswers);
      setReport(data as DiagnosticReport);
      setStep('report');
      scrollToTop();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while generating your diagnostic.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#070A0E] text-[#F1F5F9]">
      <Header
        currentStep={step}
        onStartDiagnostic={handleStartDiagnostic}
        onGoHome={handleGoHome}
        authUserEmail={authUser?.email ?? null}
        isGmailConnected={Boolean(gmailAccessToken)}
        isLoggingIn={isLoggingIn}
        onGoogleSignIn={handleGoogleSignIn}
        onGoogleSignOut={handleGoogleSignOut}
      />

      {step === 'landing' && <LandingView onStartDiagnostic={handleStartDiagnostic} />}

      {step === 'diagnostic' && (
        <DiagnosticForm
          initialAnswers={answers ?? {}}
          isSubmitting={isSubmitting}
          errorMessage={errorMessage}
          onSubmit={handleDiagnosticSubmit}
          onBackToHome={handleGoHome}
        />
      )}

      {step === 'report' && answers && report && (
        <ReportView
          answers={answers}
          report={report}
          onRetake={handleStartDiagnostic}
          authUserEmail={authUser?.email ?? null}
          gmailAccessToken={gmailAccessToken}
          isLoggingIn={isLoggingIn}
          authError={authError}
          onGoogleSignIn={handleGoogleSignIn}
          onAuthExpired={handleAuthExpired}
        />
      )}

      <Footer />
    </div>
  );
}
