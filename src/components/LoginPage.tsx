import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Sparkles, AlertCircle, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onBackToLanding: () => void;
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToLanding,
  onSuccess,
}) => {
  const { loginGoogle, login } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginGoogle();
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google authentication failed';
      if (!msg.includes('closed before completion')) {
        setError(msg);
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await login('demo@homemanager.app', 'password123');
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Demo sign in failed');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col justify-between selection:bg-[#F6C343]/30">
      {/* Top Header */}
      <header className="w-full max-w-4xl mx-auto px-6 h-18 flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#232038] py-2 px-3 rounded-full hover:bg-slate-200/50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#F6C343] flex items-center justify-center shrink-0 shadow-2xs">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#232038"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M3 10.5 12 3l9 7.5v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
          <span className="font-serif-display font-bold text-base text-[#232038]">
            Home Manager
          </span>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 max-w-md w-full mx-auto px-6 py-10 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-[#E4DFD5] shadow-lg p-8 sm:p-10 space-y-6 text-center">
          {/* Header */}
          <div className="space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#F6C343]/20 flex items-center justify-center text-[#232038] mb-3">
              <ShieldCheck className="w-7 h-7 text-[#232038]" />
            </div>
            <h1 className="font-serif-display text-2xl font-bold text-[#232038]">
              Sign in to Home Manager
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
              Continue with your verified Google account to access or create your household ledger.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Official Google OAuth Sign-In Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={isGoogleLoading}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 py-3 px-5 bg-white hover:bg-slate-50 border border-slate-300 rounded-full text-sm font-semibold text-slate-700 shadow-2xs hover:shadow-xs transition-all active:scale-[0.99] cursor-pointer disabled:opacity-60"
            >
              {isGoogleLoading ? (
                <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{isGoogleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
            </button>
          </div>

          {/* Secure note */}
          <p className="text-[11px] text-slate-400">
            Secure, passwordless authentication backed by Google OAuth 2.0.
          </p>

          {/* Demo Household Option */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isGoogleLoading}
              onClick={handleDemoSignIn}
              className="text-xs text-slate-500 hover:text-[#232038] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D99A18]" />
              <span>Or explore sample Demo Household</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-4xl mx-auto px-6 h-12 flex items-center justify-center text-xs text-slate-400">
        <span>Home Manager · The Household Ledger</span>
      </footer>
    </div>
  );
};
