/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/LoginPage';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { RecurringView } from './components/RecurringView';
import { LimitsView } from './components/LimitsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { AddExpenseModal } from './components/AddExpenseModal';
import { Category, Merchant } from './types';
import { api } from './api';

type AppViewState = 'landing' | 'login' | 'app';

function HomeManagerContent() {
  const { user, activeHome, loading, login, loginGoogle } = useAuth();

  // Initially show the landing page as requested
  const [viewState, setViewState] = useState<AppViewState>('landing');

  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Expense drill-down filter state
  const [expenseMerchantFilter, setExpenseMerchantFilter] = useState<string | undefined>(undefined);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string | undefined>(undefined);

  // Global Categories & Merchants cache for instant modal loading
  const [categories, setCategories] = useState<Category[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchMetadata = useCallback(async () => {
    if (!activeHome) return;
    try {
      const [cats, mers] = await Promise.all([
        api.getCategories(activeHome.id),
        api.getMerchants(activeHome.id),
      ]);
      setCategories(cats);
      setMerchants(mers);
    } catch (err) {
      console.error('Error fetching categories & merchants:', err);
    }
  }, [activeHome]);

  useEffect(() => {
    if (viewState === 'app') {
      fetchMetadata();
    }
  }, [fetchMetadata, refreshTrigger, viewState]);

  // Keyboard shortcut: Press 'e' to open Quick Add Expense
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'e' || e.key === 'E') &&
        viewState === 'app' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setIsAddExpenseOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewState]);

  const handleNavigateToExpenses = (merchant?: string, category?: string) => {
    setExpenseMerchantFilter(merchant);
    setExpenseCategoryFilter(category);
    setCurrentTab('expenses');
  };

  const handleExpenseAdded = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDemoSignInFromLanding = async () => {
    try {
      await login('demo@homemanager.app', 'password123');
      setViewState('app');
    } catch {
      // If error, open login page
      setViewState('login');
    }
  };

  const handleContinueWithGoogle = async () => {
    if (user) {
      setViewState('app');
      return;
    }
    try {
      await loginGoogle();
      setViewState('app');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (!msg.includes('closed before completion')) {
        setViewState('login');
      }
    }
  };

  // Automatically resume to app if user session is loaded
  useEffect(() => {
    if (!loading && user) {
      setViewState('app');
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center space-y-3">
        <div className="w-9 h-9 border-3 border-[#232038] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-600 tracking-wide font-serif-display text-sm">
          Opening Home Manager...
        </p>
      </div>
    );
  }

  // 1. Landing Page
  if (viewState === 'landing') {
    return (
      <LandingPage
        onContinueWithGoogle={handleContinueWithGoogle}
        onExploreDemo={handleDemoSignInFromLanding}
        onOpenApp={() => setViewState('app')}
      />
    );
  }

  // 2. Google Login Page
  if (viewState === 'login') {
    return (
      <LoginPage
        onBackToLanding={() => setViewState('landing')}
        onSuccess={() => setViewState('app')}
      />
    );
  }

  // 3. Then the current page appears (Full application with sidebar and top bar)
  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex">
      {/* Sidebar matching screenshot */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab !== 'expenses') {
            setExpenseMerchantFilter(undefined);
            setExpenseCategoryFilter(undefined);
          }
          setCurrentTab(tab);
        }}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        onNavigateLanding={() => setViewState('landing')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header matching screenshot */}
        <TopBar
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          onNavigateToTab={(tab) => {
            if (tab !== 'expenses') {
              setExpenseMerchantFilter(undefined);
              setExpenseCategoryFilter(undefined);
            }
            setCurrentTab(tab);
          }}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onLogout={() => setViewState('landing')}
          onSwitchAccount={() => {
            setViewState('login');
          }}
        />

        {/* Content Viewport */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8">
          {currentTab === 'dashboard' && (
            <DashboardView
              key={`dash-${refreshTrigger}`}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
              onNavigateToExpenses={handleNavigateToExpenses}
              onNavigateToRecurring={() => setCurrentTab('recurring')}
              onNavigateToLimits={() => setCurrentTab('limits')}
            />
          )}

          {currentTab === 'expenses' && (
            <ExpensesView
              key={`exp-${refreshTrigger}-${expenseMerchantFilter || ''}-${expenseCategoryFilter || ''}`}
              initialMerchant={expenseMerchantFilter}
              initialCategory={expenseCategoryFilter}
              categories={categories}
              merchants={merchants}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            />
          )}

          {currentTab === 'recurring' && (
            <RecurringView
              key={`rec-${refreshTrigger}`}
              categories={categories}
              merchants={merchants}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            />
          )}

          {currentTab === 'limits' && (
            <LimitsView
              key={`lim-${refreshTrigger}`}
              categories={categories}
              onOpenAddExpense={() => setIsAddExpenseOpen(true)}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView key={`rep-${refreshTrigger}`} />
          )}

          {currentTab === 'settings' && (
            <SettingsView key={`set-${refreshTrigger}`} />
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-[#EAE6DE] bg-transparent py-4 px-6 sm:px-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 mt-auto">
          <div className="flex items-center gap-2">
            <span className="font-serif-display font-bold text-slate-800 text-sm">Home Manager</span>
            <span>·</span>
            <span>The household ledger</span>
          </div>
          <div>
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white border border-slate-300 rounded text-slate-600 shadow-2xs">E</kbd> anywhere to quickly record an expense
          </div>
        </footer>
      </div>

      {/* Fast Quick-Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        onExpenseAdded={handleExpenseAdded}
        categories={categories}
        merchants={merchants}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HomeManagerContent />
    </AuthProvider>
  );
}
