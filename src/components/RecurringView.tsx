import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { RecurringExpense, Category, Merchant } from '../types';
import {
  RotateCw,
  Plus,
  CheckCircle2,
  Calendar,
  AlertCircle,
  X,
  Edit2,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface RecurringViewProps {
  categories: Category[];
  merchants: Merchant[];
  onOpenAddExpense: () => void;
}

export const RecurringView: React.FC<RecurringViewProps> = ({
  categories,
  merchants,
}) => {
  const { activeHome, formatAmount, currencySymbol } = useAuth();

  const [recurringList, setRecurringList] = useState<RecurringExpense[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpense | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [dueDay, setDueDay] = useState('5');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const fetchRecurring = useCallback(async () => {
    if (!activeHome) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getRecurring(activeHome.id, selectedMonth);
      setRecurringList(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch recurring bills');
    } finally {
      setLoading(false);
    }
  }, [activeHome, selectedMonth]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setAmount('');
    setMerchantName('');
    setCategoryId(categories[0]?.id || '');
    setFrequency('monthly');
    setDueDay('5');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: RecurringExpense) => {
    setEditingItem(rec);
    setName(rec.name);
    setAmount(String(rec.amount));
    setMerchantName(rec.merchant_name);
    setCategoryId(rec.category_id);
    setFrequency(rec.frequency);
    setDueDay(String(rec.due_day));
    setNotes(rec.notes || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHome) return;
    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.updateRecurring(activeHome.id, editingItem.id, {
          name: name.trim(),
          amount: parseFloat(amount),
          frequency,
          due_day: parseInt(dueDay, 10),
          notes: notes.trim(),
        });
      } else {
        await api.createRecurring(activeHome.id, {
          name: name.trim(),
          amount: parseFloat(amount),
          merchant_name: merchantName.trim() || name.trim(),
          category_id: categoryId,
          frequency,
          due_day: parseInt(dueDay, 10),
          start_date: startDate,
          notes: notes.trim(),
        });
      }
      setIsModalOpen(false);
      await fetchRecurring();
    } catch (err) {
      console.error('Error saving recurring bill:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaid = async (id: string) => {
    if (!activeHome) return;
    setMarkingPaidId(id);
    try {
      await api.markRecurringPaid(activeHome.id, id, {
        date: `${selectedMonth}-01`,
      });
      await fetchRecurring();
    } catch (err) {
      console.error('Error marking bill paid:', err);
    } finally {
      setMarkingPaidId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!activeHome) return;
    try {
      await api.deleteRecurring(activeHome.id, id);
      await fetchRecurring();
    } catch (err) {
      console.error('Error deleting recurring bill:', err);
    }
  };

  const totalMonthlyCommitment = recurringList.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPaidThisMonth = recurringList
    .filter((r) => r.is_paid)
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Recurring Expenses
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Fixed household commitments (Rent, Electricity, WiFi, EMI, Maintenance)
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
            <span>Add Recurring Bill</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Total Monthly Commitment</div>
          <div className="mt-1 text-xl font-bold text-slate-900 font-mono tabular-nums">
            {formatAmount(totalMonthlyCommitment)}
          </div>
          <div className="mt-1.5 text-xs text-slate-400">
            {recurringList.length} fixed recurring obligations
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Paid for {selectedMonth}</div>
          <div className="mt-1 text-xl font-bold text-emerald-800 font-mono tabular-nums">
            {formatAmount(totalPaidThisMonth)}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {recurringList.filter((r) => r.is_paid).length} of {recurringList.length} bills settled
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-xs font-medium text-slate-500">Pending / Due This Month</div>
          <div className="mt-1 text-xl font-bold text-amber-800 font-mono tabular-nums">
            {formatAmount(Math.max(0, totalMonthlyCommitment - totalPaidThisMonth))}
          </div>
          <div className="mt-1.5 text-xs text-slate-500">
            {recurringList.filter((r) => !r.is_paid).length} pending payments
          </div>
        </div>
      </div>

      {/* Recurring Cards / Table */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading recurring expenses...
          </div>
        ) : recurringList.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
            No recurring expenses registered yet. Add your rent, electricity, or internet bills!
          </div>
        ) : (
          recurringList.map((rec) => (
            <div
              key={rec.id}
              className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white font-bold"
                  style={{ backgroundColor: rec.category_color || '#2563EB' }}
                >
                  <RotateCw className="w-5 h-5 text-white/90" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{rec.name}</h3>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-medium text-slate-600">{rec.merchant_name}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <span>Due on {rec.due_day}th of every month</span>
                    <span>·</span>
                    <span>{rec.category_name}</span>
                    {rec.notes && (
                      <>
                        <span>·</span>
                        <span className="italic text-slate-400">{rec.notes}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                <div className="text-left sm:text-right">
                  <div className="font-mono text-base font-bold text-slate-900 tabular-nums">
                    {formatAmount(rec.amount)}
                  </div>
                  <div className="text-[11px] text-slate-400">Monthly</div>
                </div>

                <div className="flex items-center gap-2">
                  {rec.is_paid ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      <span>Paid for {selectedMonth}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={markingPaidId === rec.id}
                      onClick={() => handleMarkPaid(rec.id)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                    >
                      {markingPaidId === rec.id ? 'Recording...' : 'Mark as Paid'}
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(rec)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? 'Edit Recurring Bill' : 'Add Recurring Bill'}
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
                  Bill Name (e.g. Apartment Rent, Electricity Bill, Fiber Internet)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rent"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">
                      {currencySymbol}
                    </span>
                    <input
                      type="number"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="15000"
                      className="w-full pl-7 pr-3 py-2 font-mono border border-slate-300 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Due Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    placeholder="5"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Merchant / Payee Name
                </label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. Landlord, Electricity Board, Airtel"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="monthly">Every Month</option>
                    <option value="weekly">Every Week</option>
                    <option value="quarterly">Every Quarter</option>
                    <option value="yearly">Every Year</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Auto-debit on 5th via bank transfer"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
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
                  {isSubmitting ? 'Saving...' : 'Save Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
