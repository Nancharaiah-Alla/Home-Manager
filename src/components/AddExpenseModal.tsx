import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Category, Merchant, ExpenseType } from '../types';
import { X, Check, Zap, Sparkles, Tag, Calendar, UserCheck, AlertCircle } from 'lucide-react';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded: () => void;
  categories: Category[];
  merchants: Merchant[];
}

const COMMON_MERCHANTS = [
  { name: 'Amazon', category: 'Online Shopping', type: 'variable' as ExpenseType },
  { name: 'Flipkart', category: 'Online Shopping', type: 'variable' as ExpenseType },
  { name: 'Blinkit', category: 'Groceries', type: 'variable' as ExpenseType },
  { name: 'Zepto', category: 'Groceries', type: 'variable' as ExpenseType },
  { name: 'Instamart', category: 'Groceries', type: 'variable' as ExpenseType },
  { name: 'Local Store', category: 'Groceries', type: 'variable' as ExpenseType },
  { name: 'Electricity', category: 'Bills & Utilities', type: 'fixed' as ExpenseType },
  { name: 'House Rent', category: 'Home Essentials', type: 'fixed' as ExpenseType },
  { name: 'Internet', category: 'Bills & Utilities', type: 'fixed' as ExpenseType },
  { name: 'Mobile Recharge', category: 'Bills & Utilities', type: 'fixed' as ExpenseType },
];

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
  categories,
  merchants,
}) => {
  const { activeHome, currencySymbol } = useAuth();

  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [expenseType, setExpenseType] = useState<ExpenseType>('variable');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [paidByMemberId, setPaidByMemberId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick entry one-liner mode
  const [quickInput, setQuickInput] = useState('');
  const [activeMode, setActiveMode] = useState<'standard' | 'quick'>('standard');

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Auto focus amount when opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMessage(null);
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // When merchant changes, auto-select matched category & default expense type
  const handleSelectMerchant = (name: string) => {
    setMerchantName(name);
    const existing = merchants.find((m) => m.name.toLowerCase() === name.toLowerCase());
    const common = COMMON_MERCHANTS.find((m) => m.name.toLowerCase() === name.toLowerCase());

    if (existing?.default_category_id) {
      setCategoryId(existing.default_category_id);
    } else if (common) {
      const cat = categories.find((c) => c.name.toLowerCase() === common.category.toLowerCase());
      if (cat) setCategoryId(cat.id);
      setExpenseType(common.type);
    }
  };

  const handleQuickParse = (text: string) => {
    setQuickInput(text);
    // Parse format: [Merchant] [Amount] [Description] e.g. "Amazon 3500 Pressure Cooker"
    const parts = text.trim().split(/\s+/);
    if (parts.length >= 2) {
      // Find numeric part
      let foundAmountIndex = -1;
      for (let i = 0; i < parts.length; i++) {
        const cleaned = parts[i].replace(/[₹$,]/g, '');
        if (!isNaN(Number(cleaned)) && Number(cleaned) > 0) {
          foundAmountIndex = i;
          break;
        }
      }

      if (foundAmountIndex > 0) {
        const merchant = parts.slice(0, foundAmountIndex).join(' ');
        const amt = parts[foundAmountIndex].replace(/[₹$,]/g, '');
        const desc = parts.slice(foundAmountIndex + 1).join(' ');

        handleSelectMerchant(merchant);
        setAmount(amt);
        if (desc) setDescription(desc);
      }
    }
  };

  const resetForm = () => {
    setMerchantName('');
    setAmount('');
    setDescription('');
    setNotes('');
    setError(null);
    setQuickInput('');
  };

  const handleSubmit = async (addAnother = false) => {
    if (!activeHome) return;
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!merchantName.trim()) {
      setError('Please specify where the money was spent (Merchant)');
      return;
    }

    if (!description.trim()) {
      setError('Please describe what was purchased');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createExpense(activeHome.id, {
        merchant_name: merchantName.trim(),
        amount: numAmount,
        description: description.trim(),
        date,
        expense_type: expenseType,
        category_id: categoryId || undefined,
        notes: notes.trim() || undefined,
        paid_by_member_id: paidByMemberId || undefined,
      });

      onExpenseAdded();

      if (addAnother) {
        setSuccessMessage(`Added ${currencySymbol}${numAmount.toLocaleString('en-IN')} for ${merchantName}!`);
        resetForm();
        setTimeout(() => setSuccessMessage(null), 3000);
        amountInputRef.current?.focus();
      } else {
        onClose();
        resetForm();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE6DE] bg-[#FAF8F5]">
          <div>
            <h2 className="font-serif-display text-lg font-bold text-slate-900">Record Household Expense</h2>
            <p className="text-xs text-slate-500 mt-0.5">Where the money was spent and what was purchased</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <Check className="w-4 h-4 shrink-0 text-emerald-700" />
              <span className="font-medium">{successMessage}</span>
            </div>
          )}

          {/* Quick Entry Bar (Optional helper) */}
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Quick Entry Shortcut
              </span>
              <span className="text-[11px] text-slate-400">e.g. Amazon 3500 Pressure Cooker</span>
            </div>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => handleQuickParse(e.target.value)}
              placeholder="Type merchant, amount & item..."
              className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:border-emerald-700 focus:outline-hidden"
            />
          </div>

          {/* Quick Merchant Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              1. Merchant / Where was money spent?
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_MERCHANTS.map((m) => {
                const isSelected = merchantName.toLowerCase() === m.name.toLowerCase();
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => handleSelectMerchant(m.name)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Or type merchant name (e.g. Zepto, Local Store, Doctor)"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
            />
          </div>

          {/* Amount & Description Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                2. Amount
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                  {currencySymbol}
                </span>
                <input
                  ref={amountInputRef}
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3.5 py-2 text-base font-mono font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                3. What was purchased?
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Vacuum Cleaner, Groceries"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Expense Type (Fixed vs Variable) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Expense Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setExpenseType('variable')}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                  expenseType === 'variable'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Variable / One-time (Groceries, Shopping)
              </button>
              <button
                type="button"
                onClick={() => setExpenseType('fixed')}
                className={`py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${
                  expenseType === 'fixed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fixed / Recurring (Rent, Bills, EMI)
              </button>
            </div>
          </div>

          {/* Date & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Paid By & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                Paid By Member (Optional)
              </label>
              <select
                value={paidByMemberId}
                onChange={(e) => setPaidByMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
              >
                <option value="">Select Household Member...</option>
                {activeHome?.members?.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nickname || m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Paid with credit card, 5L model"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#EAE6DE] bg-[#FAF8F5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSubmit(true)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-full transition-colors disabled:opacity-50"
            >
              Save & Add Another
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              onClick={() => handleSubmit(false)}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#232038] hover:bg-[#1A182B] rounded-full shadow-2xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
