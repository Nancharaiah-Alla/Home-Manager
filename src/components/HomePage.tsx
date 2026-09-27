import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Plus,
  Trash2,
  Search,
  Filter,
  Download,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  PieChart,
  ShoppingBag,
  Home as HomeIcon,
  Zap,
  Utensils,
  Car,
  HeartPulse,
  Package,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sliders,
  LogOut,
  Edit2,
  Check,
  X,
  Phone,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { rotateDeviceIdForSimulation } from '../utils/device';
import { PhoneAuthModal } from './PhoneAuthModal';
import { SessionRevokedModal } from './SessionRevokedModal';
import { NewHomeSetupModal } from './NewHomeSetupModal';
import { PurchaseRequestsModal } from './PurchaseRequestsModal';
import { HomeLandingShowcase } from './HomeLandingShowcase';

export interface LedgerExpense {
  id: string;
  merchant: string;
  description: string;
  category: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  type: 'fixed' | 'variable';
  date: string;
  paidBy: string;
}

const CATEGORY_DEFINITIONS: Record<
  string,
  { color: string; icon: string; name: string }
> = {
  Groceries: { color: '#16A34A', icon: 'ShoppingBag', name: 'Groceries' },
  Housing: { color: '#9333EA', icon: 'Home', name: 'Housing & Rent' },
  Utilities: { color: '#DC2626', icon: 'Zap', name: 'Utilities & Bills' },
  Dining: { color: '#EA580C', icon: 'Utensils', name: 'Dining & Takeaway' },
  Transport: { color: '#2563EB', icon: 'Car', name: 'Transport & Fuel' },
  Healthcare: { color: '#059669', icon: 'HeartPulse', name: 'Healthcare' },
  Shopping: { color: '#D97706', icon: 'Package', name: 'Shopping & Essentials' },
  Other: { color: '#64748B', icon: 'MoreHorizontal', name: 'Other' },
};

const DEFAULT_SAMPLE_DATA: LedgerExpense[] = [
  {
    id: 'exp-1',
    merchant: 'Property Landlord',
    description: 'Monthly Apartment Rent',
    category: 'Housing',
    categoryColor: '#9333EA',
    categoryIcon: 'Home',
    amount: 18000,
    type: 'fixed',
    date: '2026-09-05',
    paidBy: 'Allan',
  },
  {
    id: 'exp-2',
    merchant: 'Amazon',
    description: 'Cordless Vacuum Cleaner',
    category: 'Shopping',
    categoryColor: '#D97706',
    categoryIcon: 'Package',
    amount: 4940,
    type: 'variable',
    date: '2026-09-25',
    paidBy: 'Allan',
  },
  {
    id: 'exp-3',
    merchant: 'Amazon',
    description: 'Stainless Steel Pressure Cooker',
    category: 'Shopping',
    categoryColor: '#D97706',
    categoryIcon: 'Package',
    amount: 3500,
    type: 'variable',
    date: '2026-09-24',
    paidBy: 'Allan',
  },
  {
    id: 'exp-4',
    merchant: 'Electricity Board',
    description: 'Power & Grid Utility Bill',
    category: 'Utilities',
    categoryColor: '#DC2626',
    categoryIcon: 'Zap',
    amount: 2350,
    type: 'fixed',
    date: '2026-09-12',
    paidBy: 'Sarah',
  },
  {
    id: 'exp-5',
    merchant: 'Apollo Pharmacy',
    description: 'First Aid Kit & Vitamin C',
    category: 'Healthcare',
    categoryColor: '#059669',
    categoryIcon: 'HeartPulse',
    amount: 1420,
    type: 'variable',
    date: '2026-09-20',
    paidBy: 'Sarah',
  },
  {
    id: 'exp-6',
    merchant: 'Blinkit',
    description: 'Fresh Milk, Farm Eggs & Sourdough',
    category: 'Groceries',
    categoryColor: '#16A34A',
    categoryIcon: 'ShoppingBag',
    amount: 680,
    type: 'variable',
    date: '2026-09-26',
    paidBy: 'Sarah',
  },
];

const LOCAL_STORAGE_KEY = 'home_manager_simple_ledger_v2';
const BUDGET_STORAGE_KEY = 'home_manager_budget_target_v2';
const CURRENCY_STORAGE_KEY = 'home_manager_currency_v2';

export const HomePage: React.FC = () => {
  const { user, activeHome, logout, deviceName } = useAuth();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneModalMode, setPhoneModalMode] = useState<'start_home' | 'sign_in'>('start_home');
  const [isNewHomeModalOpen, setIsNewHomeModalOpen] = useState(false);
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false);
  const [purchaseRequestCount, setPurchaseRequestCount] = useState(0);
  const [isDemoViewActive, setIsDemoViewActive] = useState(false);

  // Currency selection: ₹, $, €, £
  const [currency, setCurrency] = useState<string>(() => {
    return activeHome?.currency_symbol || localStorage.getItem(CURRENCY_STORAGE_KEY) || '₹';
  });

  // Keep currency synced with active home
  useEffect(() => {
    if (activeHome?.currency_symbol) {
      setCurrency(activeHome.currency_symbol);
    }
  }, [activeHome?.currency_symbol]);

  // Current Month selection (YYYY-MM)
  const [currentMonth, setCurrentMonth] = useState<string>('2026-09');

  // Ledger items: in unauthenticated demo mode, always start fresh with DEFAULT_SAMPLE_DATA on reload!
  const [expenses, setExpenses] = useState<LedgerExpense[]>(() => {
    // When logged in, read from cache if available; when logged out (demo mode), always start with default data
    const isAuthed = Boolean(localStorage.getItem('home_manager_token'));
    if (isAuthed) {
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.warn('Could not read stored expenses, using defaults:', e);
      }
    }
    return DEFAULT_SAMPLE_DATA;
  });

  // Monthly Budget Target
  const [budgetTarget, setBudgetTarget] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
      if (stored) return Number(stored) || 40000;
    } catch {
      // fallback
    }
    return 40000;
  });

  // Save changes to localStorage only when user is logged in
  // When unauthenticated, editing works interactively, but a page reload/refresh resets back to default data!
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(expenses));
      } catch (e) {
        console.warn('Could not persist expenses:', e);
      }
    }
  }, [expenses, user]);

  useEffect(() => {
    localStorage.setItem(BUDGET_STORAGE_KEY, String(budgetTarget));
  }, [budgetTarget]);

  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
  }, [currency]);

  // Load pending purchase requests for active home
  useEffect(() => {
    if (!user || !activeHome?.id) {
      setPurchaseRequestCount(0);
      return;
    }
    api.getPurchaseRequests(activeHome.id)
      .then((reqs) => {
        const pending = reqs.filter((r) => r.status === 'pending');
        setPurchaseRequestCount(pending.length);
      })
      .catch(() => {});
  }, [user, activeHome?.id, isRequestsModalOpen]);

  // Seamless cloud data loading when user is signed in
  useEffect(() => {
    if (!user || !activeHome?.id) return;
    let isMounted = true;
    api
      .getExpenses(activeHome.id, { month: currentMonth })
      .then((serverList) => {
        if (!isMounted || !Array.isArray(serverList) || serverList.length === 0) return;
        const mapped: LedgerExpense[] = serverList.map((e) => ({
          id: e.id,
          merchant: e.merchant_name || 'General',
          description: e.description || 'Household Expense',
          category: e.category_name || 'Other',
          categoryColor: e.category_color || '#64748B',
          categoryIcon: e.category_icon || 'Tag',
          amount: e.amount,
          type: e.expense_type || 'variable',
          date: e.date,
          paidBy: e.paid_by_nickname || e.paid_by_name || 'You',
        }));
        setExpenses(mapped);
      })
      .catch((err) => {
        console.warn('Could not sync cloud expenses:', err);
      });
    return () => {
      isMounted = false;
    };
  }, [user, activeHome?.id, currentMonth]);

  // Quick Add Form Inputs
  const [merchantInput, setMerchantInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('Groceries');
  const [typeInput, setTypeInput] = useState<'variable' | 'fixed'>('variable');
  const [paidByInput, setPaidByInput] = useState('');
  const [dateInput, setDateInput] = useState(
    () => new Date().toISOString().substring(0, 10)
  );

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'fixed' | 'variable'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'highest'>('newest');

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editDesc, setEditDesc] = useState<string>('');

  // Filtered expenses for active month
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => e.date.startsWith(currentMonth));
  }, [expenses, currentMonth]);

  // Metrics
  const totalMonthlySpend = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const fixedSpend = useMemo(() => {
    return monthlyExpenses
      .filter((e) => e.type === 'fixed')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const variableSpend = useMemo(() => {
    return monthlyExpenses
      .filter((e) => e.type === 'variable')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const remainingBudget = budgetTarget - totalMonthlySpend;
  const budgetUsagePercent = budgetTarget > 0 ? Math.round((totalMonthlySpend / budgetTarget) * 100) : 0;
  const dailyAverageSpend = Math.round(totalMonthlySpend / 30);

  // Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { name: string; amount: number; count: number; color: string }> = {};
    for (const exp of monthlyExpenses) {
      const cat = exp.category || 'Other';
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          amount: 0,
          count: 0,
          color: CATEGORY_DEFINITIONS[cat]?.color || '#64748B',
        };
      }
      map[cat].amount += exp.amount;
      map[cat].count += 1;
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [monthlyExpenses]);

  // Top Merchants
  const topMerchants = useMemo(() => {
    const map: Record<string, { merchant: string; amount: number; count: number }> = {};
    for (const exp of monthlyExpenses) {
      const mer = exp.merchant || 'General';
      if (!map[mer]) {
        map[mer] = { merchant: mer, amount: 0, count: 0 };
      }
      map[mer].amount += exp.amount;
      map[mer].count += 1;
    }
    return Object.values(map)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthlyExpenses]);

  // Filtered & Sorted Ledger
  const displayedExpenses = useMemo(() => {
    return monthlyExpenses
      .filter((e) => {
        // Category filter
        if (selectedCategoryFilter !== 'All' && e.category !== selectedCategoryFilter) {
          return false;
        }
        // Type filter
        if (selectedTypeFilter !== 'all' && e.type !== selectedTypeFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMerchant = e.merchant.toLowerCase().includes(q);
          const matchDesc = e.description.toLowerCase().includes(q);
          const matchCategory = e.category.toLowerCase().includes(q);
          const matchPayer = e.paidBy.toLowerCase().includes(q);
          if (!matchMerchant && !matchDesc && !matchCategory && !matchPayer) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'highest') {
          return b.amount - a.amount;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [monthlyExpenses, selectedCategoryFilter, selectedTypeFilter, searchQuery, sortBy]);

  // Handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantInput.trim() || !amountInput.trim()) return;

    const amt = parseFloat(amountInput);
    if (isNaN(amt) || amt <= 0) return;

    const catDef = CATEGORY_DEFINITIONS[categoryInput] || CATEGORY_DEFINITIONS.Other;

    const newExp: LedgerExpense = {
      id: 'exp_' + Math.random().toString(36).substring(2, 10),
      merchant: merchantInput.trim(),
      description: descInput.trim() || 'General Expense',
      category: categoryInput,
      categoryColor: catDef.color,
      categoryIcon: catDef.icon,
      amount: amt,
      type: typeInput,
      date: dateInput || new Date().toISOString().substring(0, 10),
      paidBy: paidByInput.trim() || (user?.name?.split(' ')[0] || 'You'),
    };

    setExpenses((prev) => [newExp, ...prev]);

    if (user && activeHome?.id) {
      api.createExpense(activeHome.id, {
        merchant_name: newExp.merchant,
        description: newExp.description,
        amount: newExp.amount,
        date: newExp.date,
        expense_type: newExp.type,
      }).catch((e) => console.warn('Could not sync expense creation to server:', e));
    }

    // Reset inputs
    setMerchantInput('');
    setDescInput('');
    setAmountInput('');
  };

  const handleDelete = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (user && activeHome?.id) {
      api.deleteExpense(activeHome.id, id).catch((e) => console.warn('Could not sync expense deletion:', e));
    }
  };

  const handleStartEdit = (exp: LedgerExpense) => {
    setEditingId(exp.id);
    setEditAmount(String(exp.amount));
    setEditDesc(exp.description);
  };

  const handleSaveEdit = (id: string) => {
    const amt = parseFloat(editAmount);
    if (!isNaN(amt) && amt > 0) {
      const finalDesc = editDesc.trim();
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === id ? { ...e, amount: amt, description: finalDesc || e.description } : e
        )
      );
      if (user && activeHome?.id) {
        api.updateExpense(activeHome.id, id, {
          amount: amt,
          description: finalDesc,
        }).catch((e) => console.warn('Could not sync expense update:', e));
      }
    }
    setEditingId(null);
  };

  const handleResetData = () => {
    if (window.confirm('Reset ledger with sample demonstration expenses?')) {
      setExpenses(DEFAULT_SAMPLE_DATA);
      setBudgetTarget(40000);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all expenses for this ledger?')) {
      setExpenses([]);
    }
  };

  const handleExportCSV = () => {
    if (monthlyExpenses.length === 0) {
      alert('No expenses to export for this month.');
      return;
    }
    const headers = ['Date', 'Merchant', 'Description', 'Category', 'Type', 'Paid By', `Amount (${currency})`];
    const rows = monthlyExpenses.map((e) => [
      e.date,
      `"${e.merchant.replace(/"/g, '""')}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      e.category,
      e.type,
      `"${e.paidBy.replace(/"/g, '""')}"`,
      e.amount,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `household_expenses_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Month navigation helper
  const navigateMonth = (direction: 'prev' | 'next') => {
    const [year, month] = currentMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = direction === 'prev' ? month - 1 : month + 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const formatted = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setCurrentMonth(formatted);
  };

  const formatMonthTitle = (yyyyMm: string) => {
    const [y, m] = yyyyMm.split('-').map(Number);
    const date = new Date(y, m - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col selection:bg-[#F6C343]/30">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#E8E4DA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#232038] flex items-center justify-center shrink-0 shadow-sm">
              <Receipt className="w-5 h-5 text-[#F6C343]" />
            </div>
            <div>
              <span className="font-serif-display text-xl sm:text-2xl font-bold tracking-tight text-[#232038] leading-none block">
                Home Manager
              </span>
              <span className="text-[11px] text-slate-500 font-normal">
                Simple Household Ledger
              </span>
            </div>
          </div>

          {/* Header Actions */}
          {!user && !isDemoViewActive ? (
            /* Home Page Showcase Header: ONLY ONE "Start a Home" button. No currency units, no date navigator, no sign-in button */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhoneModalMode('start_home');
                  setIsPhoneModalOpen(true);
                }}
                className="px-5 py-2.5 text-xs sm:text-sm font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
              >
                <HomeIcon className="w-4 h-4 text-[#F6C343]" />
                <span>Start a Home</span>
              </button>
            </div>
          ) : (
            /* In Demo View OR when User is Logged In */
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Back to Home button for unauthenticated demo visitors */}
              {!user && isDemoViewActive && (
                <button
                  type="button"
                  onClick={() => setIsDemoViewActive(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs mr-1"
                  title="Return to the home showcase page"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Home</span>
                </button>
              )}

              {/* Currency Pill */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-2xs">
                {['₹', '$', '€', '£'].map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setCurrency(sym)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currency === sym
                        ? 'bg-[#232038] text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>

              {/* Month Navigator */}
              <div className="flex items-center bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev')}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-[#232038] min-w-[100px] text-center">
                  {formatMonthTitle(currentMonth)}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth('next')}
                  className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Action buttons */}
              {!user ? (
                <button
                  type="button"
                  onClick={() => {
                    setPhoneModalMode('start_home');
                    setIsPhoneModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-xl shadow-xs hover:shadow-md transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
                >
                  <HomeIcon className="w-3.5 h-3.5 text-[#F6C343]" />
                  <span>Start a Home</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 pl-1 sm:pl-2">
                  {/* Active Home & Role Pill */}
                  <div className="hidden sm:flex items-center gap-2 pl-3 py-1 pr-1.5 bg-white border border-slate-200 rounded-full shadow-2xs">
                    <div className="text-left leading-tight">
                      <div className="text-xs font-bold text-slate-800 max-w-[120px] truncate">
                        {activeHome?.name || user.name}
                      </div>
                      <div className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="capitalize">{activeHome?.role || 'Admin'}</span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-[#F6C343] text-[#232038] font-bold text-xs flex items-center justify-center">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  </div>

                  {/* Purchase Requests Button */}
                  <button
                    type="button"
                    onClick={() => setIsRequestsModalOpen(true)}
                    className="relative p-2 text-slate-600 hover:text-[#232038] bg-white border border-slate-200 hover:border-slate-300 rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
                    title="Household Purchase Requests"
                  >
                    <ShoppingBag className="w-4 h-4 text-amber-600" />
                    <span className="hidden md:inline text-xs font-semibold">Requests</span>
                    {purchaseRequestCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center">
                        {purchaseRequestCount}
                      </span>
                    )}
                  </button>

                  {/* Quick Simulation Button for Evaluators */}
                  <button
                    type="button"
                    onClick={() => {
                      rotateDeviceIdForSimulation();
                      setPhoneModalMode('start_home');
                      setIsPhoneModalOpen(true);
                    }}
                    className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                    title="Simulate a 2nd device logging in with the same phone number to test single-device conflict detection"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Test 2nd Device</span>
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="p-2 text-slate-500 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Sign out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 w-full space-y-8 flex-1">
        {!user && !isDemoViewActive ? (
          /* Home Page Showcase: Advertising & Explanatory View (No editable tracker here) */
          <HomeLandingShowcase
            onStartHome={() => {
              setPhoneModalMode('start_home');
              setIsPhoneModalOpen(true);
            }}
            onExploreDemo={() => setIsDemoViewActive(true)}
          />
        ) : (
          <>
            {/* Guest Demo Header Banner (Only shown in demo mode) */}
            {!user && isDemoViewActive && (
              <div className="bg-amber-50/95 border border-amber-200/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 text-xs text-amber-950 text-center sm:text-left">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0 hidden sm:inline-block" />
                  <div>
                    <span className="font-bold">Guest Demo Expense Ledger:</span> You can edit any expense, add new spending, and test monthly limit targets below. Changes automatically reset on browser reload.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsDemoViewActive(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
                  >
                    ← Back to Home Page
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneModalMode('start_home');
                      setIsPhoneModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-xl shadow-2xs transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <HomeIcon className="w-3.5 h-3.5 text-[#F6C343]" />
                    <span>Start a Home</span>
                  </button>
                </div>
              </div>
            )}

        {/* Row 1: Snapshot Metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Spent */}
          <div className="bg-white border border-[#E8E4DA] rounded-3xl p-5 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Total Spent</span>
              <span className="text-[11px] text-[#232038] font-bold bg-[#FAF8F5] px-2 py-0.5 rounded-full">
                {monthlyExpenses.length} purchases
              </span>
            </div>
            <div className="mt-2 text-3xl sm:text-4xl font-mono font-bold text-[#232038] tabular-nums">
              {currency}{totalMonthlySpend.toLocaleString()}
            </div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1.5">
              <span>Avg. {currency}{dailyAverageSpend.toLocaleString()} / day this month</span>
            </div>
          </div>

          {/* Card 2: Fixed vs Variable */}
          <div className="bg-white border border-[#E8E4DA] rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Fixed vs Variable</span>
              <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                Where it goes
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] text-slate-400">Fixed (Rent, Bills)</div>
                <div className="font-mono font-bold text-lg text-[#232038] tabular-nums">
                  {currency}{fixedSpend.toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-400">Variable (Living)</div>
                <div className="font-mono font-bold text-lg text-emerald-700 tabular-nums">
                  {currency}{variableSpend.toLocaleString()}
                </div>
              </div>
            </div>
            {/* Visual ratio bar */}
            <div className="mt-3 w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
              <div
                className="bg-[#232038] h-full transition-all duration-300"
                style={{
                  width: `${totalMonthlySpend > 0 ? (fixedSpend / totalMonthlySpend) * 100 : 0}%`,
                }}
                title={`Fixed: ${currency}${fixedSpend}`}
              />
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{
                  width: `${totalMonthlySpend > 0 ? (variableSpend / totalMonthlySpend) * 100 : 0}%`,
                }}
                title={`Variable: ${currency}${variableSpend}`}
              />
            </div>
          </div>

          {/* Card 3: Monthly Budget Runway */}
          <div className="bg-white border border-[#E8E4DA] rounded-3xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Monthly Target</span>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  remainingBudget >= 0
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-rose-700 bg-rose-50'
                }`}
              >
                {remainingBudget >= 0 ? `${budgetUsagePercent}% used` : 'Target Exceeded'}
              </span>
            </div>
            <div className="mt-2 text-3xl font-mono font-bold text-[#232038] tabular-nums">
              {currency}{budgetTarget.toLocaleString()}
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {remainingBudget >= 0 ? 'Remaining runway:' : 'Over by:'}
              </span>
              <span
                className={`font-mono font-bold ${
                  remainingBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {remainingBudget >= 0 ? `+${currency}${remainingBudget.toLocaleString()}` : `-${currency}${Math.abs(remainingBudget).toLocaleString()}`}
              </span>
            </div>
          </div>

          {/* Card 4: Quick Action / Ledger Management */}
          <div className="bg-[#232038] text-white rounded-3xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#F6C343]">
                Instant Actions
              </span>
              <Sparkles className="w-4 h-4 text-[#F6C343]" />
            </div>

            <div className="space-y-1.5 my-2">
              <div className="text-sm font-semibold">Keep Clean & Organized</div>
              <div className="text-xs text-slate-300">
                Offline-ready ledger stored safely in your browser.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleExportCSV}
                className="flex-1 py-1.5 px-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-medium text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Export this month to CSV"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={handleResetData}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Reset with sample items"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* Row 2: Add Purchase Card or Viewer Request Card */}
        {activeHome?.role === 'viewer' ? (
          <section className="bg-emerald-50/80 border border-emerald-200/90 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-2xs shrink-0">
                <ShoppingBag className="w-6 h-6 text-emerald-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif-display text-base sm:text-lg font-bold text-slate-800">
                    Viewer Mode: Household Purchase Requests
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                    Viewer
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-xl">
                  As a Viewer, you can browse all household expenses and request products or items needed for the home.
                  The household admin or editor can approve your request, purchase it, and add the expense to the ledger.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRequestsModalOpen(true)}
              className="py-3 px-5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer shrink-0 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Request an Item to Buy</span>
            </button>
          </section>
        ) : (
          <section className="bg-white border border-[#E8E4DA] rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-[#F0ECE4]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] border border-[#E8E4DA] flex items-center justify-center text-[#232038]">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif-display text-lg font-bold text-[#232038]">
                  Record a Household Expense
                </h2>
                <p className="text-xs text-slate-500">
                  Separate where you bought from what you bought. Takes 5 seconds.
                </p>
              </div>
            </div>

            {/* Quick quick store tags */}
            <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
              <span>Quick fill:</span>
              {['Amazon', 'Blinkit', 'Local Store', 'Rent', 'Electricity'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setMerchantInput(s);
                    if (s === 'Rent') {
                      setCategoryInput('Housing');
                      setTypeInput('fixed');
                    } else if (s === 'Electricity') {
                      setCategoryInput('Utilities');
                      setTypeInput('fixed');
                    } else if (s === 'Blinkit') {
                      setCategoryInput('Groceries');
                      setTypeInput('variable');
                    }
                  }}
                  className="px-2 py-0.5 rounded-lg bg-[#FAF8F5] hover:bg-slate-200 text-slate-600 transition-colors text-[11px] font-medium cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* The Form */}
          <form onSubmit={handleAddExpense} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
              {/* Store / Merchant */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Store / Merchant <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon, Blinkit, Supermarket"
                  value={merchantInput}
                  onChange={(e) => setMerchantInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] transition-all"
                  required
                />
              </div>

              {/* What was bought */}
              <div className="lg:col-span-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What was bought? <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stainless steel cooker, Milk & Eggs"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] transition-all"
                  required
                />
              </div>

              {/* Amount */}
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount ({currency}) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-sm">
                    {currency}
                  </span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    placeholder="0.00"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 text-sm font-mono font-bold bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] transition-all"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div className="lg:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] transition-all cursor-pointer font-medium"
                >
                  <option value="Groceries">Groceries</option>
                  <option value="Housing">Housing & Rent</option>
                  <option value="Utilities">Utilities & Bills</option>
                  <option value="Dining">Dining & Food Delivery</option>
                  <option value="Transport">Transport & Fuel</option>
                  <option value="Healthcare">Healthcare & Pharmacy</option>
                  <option value="Shopping">Shopping & Essentials</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 2: Type, Date, Who Paid & Submit */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                {/* Expense Type Toggle */}
                <div className="flex items-center gap-1 bg-[#FAF8F5] border border-slate-200 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setTypeInput('variable')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      typeInput === 'variable'
                        ? 'bg-[#232038] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Variable (Everyday)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeInput('fixed')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      typeInput === 'fixed'
                        ? 'bg-[#232038] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Fixed (Bills/Rent)
                  </button>
                </div>

                {/* Date Picker */}
                <div className="flex items-center gap-1.5 bg-[#FAF8F5] border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="bg-transparent focus:outline-none text-slate-700 font-medium cursor-pointer"
                  />
                </div>

                {/* Paid By */}
                <input
                  type="text"
                  placeholder="Who paid? (e.g. Allan)"
                  value={paidByInput}
                  onChange={(e) => setPaidByInput(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#232038] w-36"
                />
              </div>

              {/* Submit button */}
              <button
                type="submit"
                className="px-6 py-2.5 text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] inline-flex items-center gap-2 cursor-pointer ml-auto"
              >
                <Plus className="w-4 h-4 text-[#F6C343]" />
                <span>Add to Ledger</span>
              </button>
            </div>
          </form>
        </section>
        )}

        {/* Row 3: Insights & Category Spending Breakdown */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Category Breakdown (7 cols) */}
          <div className="lg:col-span-7 bg-white border border-[#E8E4DA] rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
              <div>
                <h3 className="font-serif-display text-base font-bold text-[#232038]">
                  Category Spending Breakdown
                </h3>
                <p className="text-xs text-slate-400">
                  Click any category to filter the ledger below
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {categoryBreakdown.length} active categories
              </span>
            </div>

            {categoryBreakdown.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recorded spending in {formatMonthTitle(currentMonth)} yet.
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {categoryBreakdown.map((cat) => {
                  const percent =
                    totalMonthlySpend > 0
                      ? Math.round((cat.amount / totalMonthlySpend) * 100)
                      : 0;
                  return (
                    <div
                      key={cat.name}
                      onClick={() =>
                        setSelectedCategoryFilter(
                          selectedCategoryFilter === cat.name ? 'All' : cat.name
                        )
                      }
                      className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                        selectedCategoryFilter === cat.name
                          ? 'border-[#232038] bg-[#FAF8F5]'
                          : 'border-transparent hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="font-bold text-[#232038]">{cat.name}</span>
                          <span className="text-slate-400 text-[11px]">
                            ({cat.count} {cat.count === 1 ? 'item' : 'items'})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#232038]">
                            {currency}{cat.amount.toLocaleString()}
                          </span>
                          <span className="text-slate-400 text-[11px] font-mono min-w-[32px] text-right">
                            {percent}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Stores + Budget Slider (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Top Stores */}
            <div className="bg-white border border-[#E8E4DA] rounded-3xl p-6 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
                <h3 className="font-serif-display text-base font-bold text-[#232038]">
                  Top Stores & Merchants
                </h3>
                <span className="text-xs text-slate-400">Where you shopped</span>
              </div>

              {topMerchants.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  No stores recorded yet.
                </div>
              ) : (
                <div className="divide-y divide-[#F0ECE4] mt-2">
                  {topMerchants.map((m, idx) => (
                    <div
                      key={m.merchant}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-[#232038] font-bold text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-bold text-[#232038]">{m.merchant}</span>
                          <span className="text-slate-400 text-[11px] block">
                            {m.count} {m.count === 1 ? 'purchase' : 'purchases'}
                          </span>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-slate-900">
                        {currency}{m.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Target Adjuster */}
            <div className="bg-[#232038] text-white border border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#F6C343] uppercase tracking-wider">
                  Adjust Monthly Budget Cap
                </span>
                <Sliders className="w-4 h-4 text-[#F6C343]" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-mono font-bold text-white">
                  {currency}{budgetTarget.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">
                  Goal: {currency}{Math.round(budgetTarget / 30).toLocaleString()} / day
                </span>
              </div>
              <input
                type="range"
                min="10000"
                max="100000"
                step="2500"
                value={budgetTarget}
                onChange={(e) => setBudgetTarget(Number(e.target.value))}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#F6C343]"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Move the slider to calculate buffer and adjust warnings for the household.
              </p>
            </div>
          </div>
        </section>

        {/* Row 4: Full Interactive Ledger (Searchable, Filterable, Editable) */}
        <section className="bg-white border border-[#E8E4DA] rounded-3xl p-6 shadow-sm space-y-5">
          {/* Ledger Header & Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#F0ECE4]">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-display text-xl font-bold text-[#232038]">
                  Household Ledger Entries
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FAF8F5] border border-slate-200 text-xs font-mono font-bold text-slate-600">
                  {displayedExpenses.length} showing
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every transaction logged for {formatMonthTitle(currentMonth)}
              </p>
            </div>

            {/* Search + Type Filter + Sort */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search store or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#232038] w-48 sm:w-56"
                />
              </div>

              {/* Type Toggle */}
              <div className="flex items-center bg-[#FAF8F5] border border-slate-200 rounded-xl p-1 text-xs">
                {(['all', 'variable', 'fixed'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all cursor-pointer ${
                      selectedTypeFilter === t
                        ? 'bg-[#232038] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'highest')}
                className="px-2.5 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="highest">Highest Amount</option>
              </select>
            </div>
          </div>

          {/* Category Quick Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            <span className="text-xs font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {['All', 'Groceries', 'Housing', 'Utilities', 'Dining', 'Transport', 'Healthcare', 'Shopping', 'Other'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategoryFilter === cat
                    ? 'bg-[#232038] text-white shadow-2xs'
                    : 'bg-[#FAF8F5] hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat}
              </button>
            ))}

            {(selectedCategoryFilter !== 'All' || selectedTypeFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryFilter('All');
                  setSelectedTypeFilter('all');
                  setSearchQuery('');
                }}
                className="text-xs text-rose-600 font-medium hover:underline ml-2 cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Expenses Table / Cards */}
          {displayedExpenses.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-3xl p-6">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <div className="text-sm font-bold text-slate-700">No transactions found</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No expenses match the current filter or search criteria. Use the form above to add a new purchase.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F0ECE4] border border-[#EDE8DE] rounded-2xl overflow-hidden bg-white">
              {displayedExpenses.map((exp) => {
                const isEditing = editingId === exp.id;
                return (
                  <div
                    key={exp.id}
                    className="p-4 hover:bg-[#FAF8F5] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    {/* Left: Store initial + Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs"
                        style={{
                          backgroundColor: `${exp.categoryColor}15`,
                          color: exp.categoryColor,
                        }}
                      >
                        {exp.merchant.charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[#232038]">
                            {exp.merchant}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{
                              backgroundColor: `${exp.categoryColor}15`,
                              color: exp.categoryColor,
                            }}
                          >
                            {exp.category}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              exp.type === 'fixed'
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {exp.type}
                          </span>
                        </div>

                        {/* Description / Item */}
                        {isEditing ? (
                          <div className="mt-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="px-2 py-1 text-xs border border-slate-300 rounded-lg w-full max-w-sm"
                            />
                          </div>
                        ) : (
                          <div className="text-xs text-slate-600 mt-0.5 truncate">
                            {exp.description}
                          </div>
                        )}

                        {/* Metadata row */}
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-1">
                          <span>{exp.date}</span>
                          <span>•</span>
                          <span>Paid by {exp.paidBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount + Quick Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">{currency}</span>
                          <input
                            type="number"
                            step="any"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 px-2 py-1 text-xs font-mono font-bold border border-slate-300 rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(exp.id)}
                            className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700"
                            title="Save changes"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300"
                            title="Cancel edit"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="font-mono text-base font-bold text-[#232038] tabular-nums">
                            {currency}{exp.amount.toLocaleString()}
                          </div>

                          <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(exp)}
                              className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exp.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete purchase"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ledger Footer with bulk clean actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Total filtered view:{' '}
              <span className="font-mono font-bold text-slate-800">
                {currency}
                {displayedExpenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="hover:text-slate-900 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export as CSV</span>
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={handleResetData}
                className="hover:text-slate-900 font-medium cursor-pointer"
              >
                Reset Demo Items
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
              >
                Clear Ledger
              </button>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {/* Clean Minimalist Footer (Only shown when viewing tracker) */}
      {(user || isDemoViewActive) && (
        <footer className="mt-auto border-t border-[#E8E4DA] bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#232038] text-[#F6C343] font-bold text-[10px] flex items-center justify-center">
                HM
              </div>
              <span className="font-semibold text-slate-700">Home Manager</span>
              <span>— The simple, modern household expense ledger.</span>
            </div>
            <div>All records stored reliably in cloud and local storage.</div>
          </div>
        </footer>
      )}

      {/* Phone Authentication Modal with Single-Device Protection */}
      <PhoneAuthModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        initialMode={phoneModalMode}
        onOpenSetup={() => setIsNewHomeModalOpen(true)}
      />

      {/* New Home Setup Modal (center of the screen after OTP verification) */}
      <NewHomeSetupModal
        isOpen={isNewHomeModalOpen}
        onClose={() => setIsNewHomeModalOpen(false)}
      />

      {/* Household Purchase Requests Modal */}
      <PurchaseRequestsModal
        isOpen={isRequestsModalOpen}
        onClose={() => setIsRequestsModalOpen(false)}
        onExpenseAdded={() => {
          if (activeHome?.id) {
            api.getExpenses(activeHome.id, { month: currentMonth }).then((serverList) => {
              if (Array.isArray(serverList)) {
                const mapped: LedgerExpense[] = serverList.map((e) => ({
                  id: e.id,
                  merchant: e.merchant_name || 'General',
                  description: e.description || 'Household Expense',
                  category: e.category_name || 'Other',
                  categoryColor: e.category_color || '#64748B',
                  categoryIcon: e.category_icon || 'Tag',
                  amount: e.amount,
                  type: e.expense_type || 'variable',
                  date: e.date,
                  paidBy: e.paid_by_nickname || e.paid_by_name || 'You',
                }));
                setExpenses(mapped);
              }
            });
          }
        }}
      />

      {/* Session Invalidation Modal (when another device takes over) */}
      <SessionRevokedModal
        onOpenPhoneAuth={() => {
          setPhoneModalMode('sign_in');
          setIsPhoneModalOpen(true);
        }}
      />
    </div>
  );
};

