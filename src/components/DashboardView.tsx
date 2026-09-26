import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { DashboardData, Expense } from '../types';
import {
  Calendar,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  TrendingDown,
  ShoppingBag,
  Zap,
  Building,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface DashboardViewProps {
  onOpenAddExpense: () => void;
  onNavigateToExpenses: (merchantFilter?: string, categoryFilter?: string) => void;
  onNavigateToRecurring: () => void;
  onNavigateToLimits: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddExpense,
  onNavigateToExpenses,
  onNavigateToRecurring,
  onNavigateToLimits,
}) => {
  const { activeHome, formatAmount, currencySymbol } = useAuth();

  // Current month default in YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return '2026-09';
  });

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [payingRecurringId, setPayingRecurringId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    if (!activeHome) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboard(activeHome.id, selectedMonth);
      setData(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load household dashboard');
    } finally {
      setLoading(false);
    }
  }, [activeHome, selectedMonth]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleMonthChange = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  const handleMarkRecurringPaid = async (recurringId: string) => {
    if (!activeHome) return;
    setPayingRecurringId(recurringId);
    try {
      await api.markRecurringPaid(activeHome.id, recurringId);
      await fetchDashboard();
    } catch (err) {
      console.error('Failed marking recurring bill as paid:', err);
    } finally {
      setPayingRecurringId(null);
    }
  };

  // Format month for display (e.g. September 2026)
  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  if (loading && !data) {
    return (
      <div className="py-16 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#232038] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500 font-medium font-serif-display">Loading household finances...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="py-12 text-center max-w-md mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs mb-4">
          {error}
        </div>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#232038] hover:bg-[#1A182B] rounded-full"
        >
          Try Again
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    total_spending: 0,
    fixed_expenses: 0,
    variable_expenses: 0,
    transaction_count: 0,
    remaining_budget: null,
    overall_limit: null,
  };

  const merchants = data?.spending_by_merchant || [];
  const categories = data?.spending_by_category || [];
  const recentExpenses = data?.recent_expenses || [];
  const limits = data?.limits || [];
  const recurring = data?.recurring_expenses || [];

  return (
    <div className="space-y-6">
      {/* Month Header & Overview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAE6DE]">
        <div>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {activeHome?.name || 'Shared home'} · Everyday household ledger and spending flow
          </p>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-white border border-[#EAE6DE] rounded-xl shadow-2xs p-1">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-[#F4F1EA] rounded-lg transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-semibold text-slate-800 min-w-[130px] text-center font-serif-display">
              {formatMonthName(selectedMonth)}
            </div>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-[#F4F1EA] rounded-lg transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4 Stat Overview Grid (Single elevation, tabular numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Spending */}
        <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Spent</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 font-mono tabular-nums">
            {formatAmount(summary.total_spending)}
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center gap-1.5">
            <span className="font-semibold text-slate-700 font-mono tabular-nums">
              {summary.transaction_count}
            </span>
            <span>transactions recorded</span>
          </div>
        </div>

        {/* Fixed / Recurring Expenses */}
        <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Fixed Expenses</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatAmount(summary.fixed_expenses)}
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center justify-between">
            <span>Rent & bills</span>
            <span className="font-medium text-slate-700 font-mono tabular-nums">
              {summary.total_spending > 0
                ? `${Math.round((summary.fixed_expenses / summary.total_spending) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Variable / One-time Expenses */}
        <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Variable Expenses</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {formatAmount(summary.variable_expenses)}
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center justify-between">
            <span>Groceries & shopping</span>
            <span className="font-medium text-slate-700 font-mono tabular-nums">
              {summary.total_spending > 0
                ? `${Math.round((summary.variable_expenses / summary.total_spending) * 100)}%`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Remaining Budget / Limit */}
        <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monthly Budget</div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
            {summary.remaining_budget !== null ? (
              formatAmount(summary.remaining_budget)
            ) : (
              <span className="text-slate-400 text-lg font-normal">Not Set</span>
            )}
          </div>
          <div className="mt-2.5 text-xs text-slate-500 flex items-center justify-between">
            {summary.overall_limit ? (
              <span>Remaining of {formatAmount(summary.overall_limit)}</span>
            ) : (
              <button
                onClick={onNavigateToLimits}
                className="text-[#232038] hover:underline font-semibold"
              >
                Set budget limit →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Budget Limit Warnings Banner if any limit exceeded or warning */}
      {limits.some((l) => l.is_warning || l.is_exceeded) && (
        <div className="space-y-2">
          {limits
            .filter((l) => l.is_warning || l.is_exceeded)
            .map((lim) => (
              <div
                key={lim.id}
                className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                  lim.is_exceeded
                    ? 'bg-rose-50/80 border-rose-200 text-rose-800'
                    : 'bg-amber-50/80 border-amber-200 text-amber-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      lim.is_exceeded ? 'text-rose-600' : 'text-amber-600'
                    }`}
                  />
                  <div>
                    <span className="font-semibold">
                      {lim.category_name || 'Overall Household'} Limit:{' '}
                    </span>
                    {lim.is_exceeded ? (
                      <span>
                        Exceeded by {formatAmount(lim.exceeded)} (Spent{' '}
                        {formatAmount(lim.spent)} of {formatAmount(lim.limit_amount)})
                      </span>
                    ) : (
                      <span>
                        Approaching limit ({lim.percentage}% spent — {formatAmount(lim.remaining)}{' '}
                        remaining)
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onNavigateToLimits}
                  className="font-medium underline hover:text-slate-900 shrink-0"
                >
                  Manage limits
                </button>
              </div>
            ))}
        </div>
      )}

      {/* Spending Breakdown Grid: Spending by Merchant & Spending by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Spending by Merchant */}
        <div className="bg-white rounded-2xl border border-[#EAE6DE] p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-serif-display text-base font-bold text-slate-900">Spending by Merchant</h2>
              <p className="text-[11px] text-slate-500">Where the money was spent this month</p>
            </div>
            <button
              onClick={() => onNavigateToExpenses()}
              className="text-xs text-[#232038] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View details</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {merchants.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No merchant spending recorded for {formatMonthName(selectedMonth)}.
              </p>
            ) : (
              merchants.slice(0, 6).map((m) => {
                const percentage =
                  summary.total_spending > 0
                    ? Math.round((m.total_amount / summary.total_spending) * 100)
                    : 0;
                return (
                  <div
                    key={m.merchant_id}
                    onClick={() => onNavigateToExpenses(m.merchant_name)}
                    className="group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 group-hover:text-[#232038] transition-colors">
                          {m.merchant_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {m.transaction_count} {m.transaction_count === 1 ? 'item' : 'items'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatAmount(m.total_amount)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 w-8 text-right tabular-nums">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Visual Bar */}
                    <div className="w-full bg-[#F3EFE8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-[#232038] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Spending by Category */}
        <div className="bg-white rounded-2xl border border-[#EAE6DE] p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-serif-display text-base font-bold text-slate-900">Spending by Category</h2>
              <p className="text-[11px] text-slate-500">Distribution across household needs</p>
            </div>
            <button
              onClick={() => onNavigateToExpenses()}
              className="text-xs text-[#232038] hover:underline font-semibold flex items-center gap-1"
            >
              <span>All categories</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 space-y-3.5">
            {categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No categories recorded for {formatMonthName(selectedMonth)}.
              </p>
            ) : (
              categories.slice(0, 6).map((cat) => {
                const percentage =
                  summary.total_spending > 0
                    ? Math.round((cat.total_amount / summary.total_spending) * 100)
                    : 0;
                return (
                  <div
                    key={cat.category_id}
                    onClick={() => onNavigateToExpenses(undefined, cat.category_name)}
                    className="group cursor-pointer"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.category_color || '#2563EB' }}
                        />
                        <span className="font-semibold text-slate-800 group-hover:text-[#232038] transition-colors">
                          {cat.category_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({cat.transaction_count})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatAmount(cat.total_amount)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 w-8 text-right tabular-nums">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    {/* Category bar */}
                    <div className="w-full bg-[#F3EFE8] h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: cat.category_color || '#232038',
                          width: `${Math.min(100, Math.max(3, percentage))}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Recurring Bills & Monthly Limits Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Recurring Bills */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-[#EAE6DE] p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-serif-display text-base font-bold text-slate-900">Recurring Bills</h2>
              <p className="text-[11px] text-slate-500">Rent, electricity, internet status</p>
            </div>
            <button
              onClick={onNavigateToRecurring}
              className="text-xs text-[#232038] hover:underline font-semibold"
            >
              Manage
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {recurring.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No recurring bills set up.</p>
            ) : (
              recurring.slice(0, 4).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl border border-[#EAE6DE] bg-[#FAF8F5] flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">{rec.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Due on {rec.due_day}th · {rec.merchant_name}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-semibold text-slate-900 tabular-nums">
                      {formatAmount(rec.amount)}
                    </div>
                    {rec.is_paid ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Paid
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={payingRecurringId === rec.id}
                        onClick={() => handleMarkRecurringPaid(rec.id)}
                        className="mt-0.5 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#232038] hover:bg-[#1A182B] rounded-lg transition-colors"
                      >
                        {payingRecurringId === rec.id ? 'Marking...' : 'Mark Paid'}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#EAE6DE] p-6 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="font-serif-display text-base font-bold text-slate-900">Recent Household Expenses</h2>
              <p className="text-[11px] text-slate-500">
                Merchant | Description | Amount | Date
              </p>
            </div>
            <button
              onClick={() => onNavigateToExpenses()}
              className="text-xs text-[#232038] hover:underline font-semibold flex items-center gap-1"
            >
              <span>View full history</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-3 divide-y divide-slate-100">
            {recentExpenses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent transactions. Click "+ Add expense" to record the first one!
              </div>
            ) : (
              recentExpenses.slice(0, 6).map((exp) => (
                <div
                  key={exp.id}
                  className="py-3 flex items-center justify-between gap-3 text-xs hover:bg-[#FAF8F5] px-2.5 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: exp.category_color || '#232038' }}
                      title={exp.category_name}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">
                          {exp.merchant_name}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 truncate">{exp.description}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{exp.category_name}</span>
                        {exp.paid_by_nickname && (
                          <>
                            <span>·</span>
                            <span>Paid by {exp.paid_by_nickname}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-900 tabular-nums text-sm">
                      {formatAmount(exp.amount)}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5 tabular-nums">
                      {exp.date}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
