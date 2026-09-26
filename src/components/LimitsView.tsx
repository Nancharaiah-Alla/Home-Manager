import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { MonthlyLimit, Category } from '../types';
import {
  Gauge,
  Plus,
  AlertTriangle,
  CheckCircle,
  X,
  Edit2,
  Trash2,
  ShieldAlert,
} from 'lucide-react';

interface LimitsViewProps {
  categories: Category[];
  onOpenAddExpense: () => void;
}

export const LimitsView: React.FC<LimitsViewProps> = ({ categories }) => {
  const { activeHome, formatAmount, currencySymbol } = useAuth();

  const [limits, setLimits] = useState<MonthlyLimit[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLimit, setEditingLimit] = useState<MonthlyLimit | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(''); // empty = overall household limit
  const [limitAmount, setLimitAmount] = useState('');
  const [alertThreshold, setAlertThreshold] = useState('80');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLimits = useCallback(async () => {
    if (!activeHome) return;
    setLoading(true);
    try {
      const data = await api.getLimits(activeHome.id, selectedMonth);
      setLimits(data);
    } catch (err) {
      console.error('Failed to fetch monthly limits:', err);
    } finally {
      setLoading(false);
    }
  }, [activeHome, selectedMonth]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const handleOpenAdd = () => {
    setEditingLimit(null);
    setSelectedCategoryId('');
    setLimitAmount('');
    setAlertThreshold('80');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lim: MonthlyLimit) => {
    setEditingLimit(lim);
    setSelectedCategoryId(lim.category_id || '');
    setLimitAmount(String(lim.limit_amount));
    setAlertThreshold(String(lim.alert_threshold || 80));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHome) return;
    setIsSubmitting(true);
    try {
      await api.createOrUpdateLimit(activeHome.id, {
        category_id: selectedCategoryId ? selectedCategoryId : null,
        limit_amount: parseFloat(limitAmount),
        alert_threshold: parseFloat(alertThreshold),
      });
      setIsModalOpen(false);
      await fetchLimits();
    } catch (err) {
      console.error('Failed to save spending limit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeHome) return;
    try {
      await api.deleteLimit(activeHome.id, id);
      await fetchLimits();
    } catch (err) {
      console.error('Failed to remove limit:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Monthly Spending Limits
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Set budget caps per category or overall to control everyday household expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg shadow-2xs text-slate-800"
          />

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Set New Limit</span>
          </button>
        </div>
      </div>

      {/* Limits Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">
          <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading limits...
        </div>
      ) : limits.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400 space-y-3">
          <Gauge className="w-8 h-8 text-slate-300 mx-auto" />
          <p>No monthly spending limits configured for this household.</p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100"
          >
            Create Groceries or Shopping Limit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {limits.map((lim) => {
            const isExceeded = lim.is_exceeded;
            const isWarning = lim.is_warning;

            let barColor = 'bg-emerald-700';
            if (isExceeded) barColor = 'bg-rose-600';
            else if (isWarning) barColor = 'bg-amber-500';

            return (
              <div
                key={lim.id}
                className={`p-5 bg-white rounded-xl border shadow-2xs flex flex-col justify-between transition-all ${
                  isExceeded
                    ? 'border-rose-200 ring-1 ring-rose-200'
                    : isWarning
                    ? 'border-amber-200 ring-1 ring-amber-200'
                    : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: lim.category_color || '#0284C7' }}
                      />
                      <h3 className="text-sm font-bold text-slate-900">
                        {lim.category_name || 'Overall Household Budget'}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(lim)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                        title="Edit limit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(lim.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                        title="Remove limit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Limit status figures */}
                  <div className="mt-4 flex items-baseline justify-between text-xs">
                    <div>
                      <span className="text-slate-500">Spent: </span>
                      <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                        {formatAmount(lim.spent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Limit: </span>
                      <span className="font-mono font-semibold text-slate-700 tabular-nums">
                        {formatAmount(lim.limit_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2 w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(2, lim.percentage))}%` }}
                    />
                  </div>

                  {/* Warning / status text */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 tabular-nums">{lim.percentage}% spent</span>

                    {isExceeded ? (
                      <span className="flex items-center gap-1 font-semibold text-rose-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Over budget by {formatAmount(lim.exceeded)}</span>
                      </span>
                    ) : isWarning ? (
                      <span className="flex items-center gap-1 font-medium text-amber-600">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Approaching limit · {formatAmount(lim.remaining)} left</span>
                      </span>
                    ) : (
                      <span className="text-emerald-800 font-medium">
                        Remaining: {formatAmount(lim.remaining)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Warning threshold: {lim.alert_threshold}%</span>
                  <span>Evaluated for {selectedMonth}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Limit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingLimit ? 'Edit Spending Limit' : 'Set Spending Limit'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Scope / Category
                </label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={!!editingLimit}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg disabled:bg-slate-100"
                >
                  <option value="">Overall Household Budget (All Expenses)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Monthly Limit Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={limitAmount}
                    onChange={(e) => setLimitAmount(e.target.value)}
                    placeholder="10000"
                    className="w-full pl-7 pr-3 py-2 font-mono border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Warning Alert Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={alertThreshold}
                  onChange={(e) => setAlertThreshold(e.target.value)}
                  placeholder="80"
                  className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  We will show an amber warning once spending reaches this percentage.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                >
                  {isSubmitting ? 'Saving...' : 'Save Limit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
