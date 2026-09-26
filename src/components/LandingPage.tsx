import React from 'react';
import { ArrowRight, Sparkles, Receipt, Home as HomeIcon, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onContinueWithGoogle: () => void;
  onExploreDemo: () => void;
  onOpenApp?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onContinueWithGoogle,
  onExploreDemo,
  onOpenApp,
}) => {
  const { user, activeHome, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col selection:bg-[#F6C343]/30">
      {/* Top Header */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-10 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#F6C343] flex items-center justify-center shrink-0 shadow-2xs">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#232038"
              strokeWidth="2.3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M3 10.5 12 3l9 7.5v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
          <div>
            <span className="font-serif-display text-xl font-bold tracking-tight text-[#232038] leading-none block">
              Home Manager
            </span>
            <span className="text-[11px] text-slate-500 tracking-tight font-normal">
              The Household Ledger
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                type="button"
                onClick={logout}
                className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-rose-600 rounded-full transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
              <button
                type="button"
                onClick={onOpenApp}
                className="px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-full shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
              >
                <HomeIcon className="w-3.5 h-3.5" />
                <span>Open {activeHome?.name || 'Dashboard'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onContinueWithGoogle}
              className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-full shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2.5"
            >
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
              <span>Continue with Google</span>
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 sm:px-10 pt-6 pb-16 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFECE6] text-[#232038] text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#F6C343]" />
              <span>Simple household expense management</span>
            </div>

            <h1 className="font-serif-display text-4xl sm:text-5xl lg:text-[52px] font-bold text-[#232038] leading-[1.12] tracking-tight">
              A little order for everyday household life.
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Easily record, organize, understand, and control everyday family spending.
              Know exactly where your money went, what you purchased, and what bills are coming up next.
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {user ? (
                <button
                  type="button"
                  onClick={onOpenApp}
                  className="px-6 py-3 text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                >
                  <span>Go to Household Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onContinueWithGoogle}
                    className="px-6 py-3 text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-full shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3 cursor-pointer"
                  >
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
                    <span>Continue with Google</span>
                    <ArrowRight className="w-4 h-4 ml-0.5" />
                  </button>

                  <button
                    type="button"
                    onClick={onExploreDemo}
                    className="px-5 py-3 text-sm font-semibold text-[#232038] bg-[#EFECE6] hover:bg-[#E5E1D8] rounded-full transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-[#D99A18]" />
                    <span>Explore Live Demo</span>
                  </button>
                </>
              )}
            </div>

            {/* Audience Badges */}
            <div className="pt-6 border-t border-[#EAE6DE] flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Perfect for:</span>
              <span>Couples</span>
              <span>·</span>
              <span>Parents</span>
              <span>·</span>
              <span>Shared Roommates</span>
              <span>·</span>
              <span>Families</span>
            </div>
          </div>

          {/* Right Column: Advertising board preview */}
          <div className="lg:col-span-6 relative flex justify-center lg:justify-end">
            <div className="absolute -top-12 -right-10 w-80 h-80 bg-[#F6C343]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-[#232038]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative w-full max-w-md transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500 ease-out shadow-2xl rounded-3xl bg-white border border-[#E4DFD5] p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#232038] flex items-center justify-center text-white">
                    <Receipt className="w-4 h-4 text-[#F6C343]" />
                  </div>
                  <div>
                    <div className="font-serif-display font-bold text-sm text-[#232038]">
                      Household Ledger
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Live expense tracking
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Month Total
                  </div>
                  <div className="font-mono text-base font-bold text-[#232038] tabular-nums">
                    ₹28,620
                  </div>
                </div>
              </div>

              {/* Expense List Preview */}
              <div className="mt-4 space-y-2">
                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DE] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#232038]">
                        Amazon <span className="font-normal text-slate-400">· Pressure Cooker</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Online Shopping · 5L Stainless Steel
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#232038] tabular-nums">
                    ₹3,500
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DE] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center font-bold text-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#232038]">
                        Amazon <span className="font-normal text-slate-400">· Vacuum Cleaner</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Home Essentials · Cordless stick
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#232038] tabular-nums">
                    ₹4,940
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DE] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#16A34A]/10 text-[#16A34A] flex items-center justify-center font-bold text-xs">
                      B
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#232038]">
                        Blinkit <span className="font-normal text-slate-400">· Groceries</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Milk, Eggs, Bread · 12 min delivery
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#232038] tabular-nums">
                    ₹680
                  </div>
                </div>

                <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DE] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#F6C343]/30 text-[#84630A] flex items-center justify-center font-bold text-xs">
                      R
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#232038]">
                        Rent <span className="font-normal text-slate-400">· Monthly Rent</span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Fixed bill · Due on 5th
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-[#232038] tabular-nums">
                    ₹15,000
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#F0ECE4] flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>Separates merchant from item</span>
                </div>
                <span className="font-medium text-[#232038]">Google OAuth 2.0 verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Principles */}
        <div className="mt-16 pt-10 border-t border-[#EAE6DE] grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#232038] text-white flex items-center justify-center font-bold text-xs">
              01
            </div>
            <h2 className="font-serif-display text-base font-bold text-[#232038]">
              Where vs What Clarity
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Never confuse merchant with purchase. See clearly what was purchased at each store.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#232038] text-white flex items-center justify-center font-bold text-xs">
              02
            </div>
            <h2 className="font-serif-display text-base font-bold text-[#232038]">
              Recurring Due Dates
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Track rent, electricity, and broadband due dates, and mark them as paid in one click.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-7 h-7 rounded-lg bg-[#232038] text-white flex items-center justify-center font-bold text-xs">
              03
            </div>
            <h2 className="font-serif-display text-base font-bold text-[#232038]">
              Budget Caps & Warnings
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Set monthly category spending caps to keep family finances on track effortlessly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};
