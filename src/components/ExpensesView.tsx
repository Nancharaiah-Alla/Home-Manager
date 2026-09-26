import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Expense, Category, Merchant, ExpenseType } from '../types';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  Calendar,
  X,
  ChevronDown,
  ArrowUpDown,
  Tag,
  Building,
  Check,
  AlertCircle,
} from 'lucide-react';

interface ExpensesViewProps {
  initialMerchant?: string;
  initialCategory?: string;
  categories: Category[];
  merchants: Merchant[];
  onOpenAddExpense: () => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  initialMerchant,
  initialCategory,
  categories,
  merchants,
  onOpenAddExpense,
}) => {
  const { activeHome, formatAmount, currencySymbol } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [selectedMerchant, setSelectedMerchant] = useState<string>(initialMerchant || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || '');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editMerchantName, setEditMerchantName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editType, setEditType] = useState<ExpenseType>('variable');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!activeHome) return;
    setLoading(true);
    setError(null);
    try {
      const merchantObj = selectedMerchant
        ? merchants.find((m) => m.name.toLowerCase() === selectedMerchant.toLowerCase())
        : null;
      const categoryObj = selectedCategory
        ? categories.find((c) => c.name.toLowerCase() === selectedCategory.toLowerCase())
        : null;

      const data = await api.getExpenses(activeHome.id, {
        month: selectedMonth || undefined,
        search: search.trim() || undefined,
        merchant_id: merchantObj ? merchantObj.id : undefined,
        category_id: categoryObj ? categoryObj.id : undefined,
        expense_type: selectedType || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setExpenses(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  }, [
    activeHome,
    selectedMonth,
    search,
    selectedMerchant,
    selectedCategory,
    selectedType,
    sortBy,
    sortOrder,
    merchants,
    categories,
  ]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Handle Edit Modal
  const startEdit = (exp: Expense) => {
    setEditingExpense(exp);
    setEditMerchantName(exp.merchant_name);
    setEditAmount(String(exp.amount));
    setEditDescription(exp.description);
    setEditDate(exp.date);
    setEditType(exp.expense_type);
    setEditCategoryId(exp.category_id);
    setEditNotes(exp.notes || '');
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHome || !editingExpense) return;
    setIsUpdating(true);
    try {
      await api.updateExpense(activeHome.id, editingExpense.id, {
        merchant_name: editMerchantName.trim(),
        amount: parseFloat(editAmount),
        description: editDescription.trim(),
        date: editDate,
        expense_type: editType,
        category_id: editCategoryId,
        notes: editNotes.trim(),
      });
      setEditingExpense(null);
      await fetchExpenses();
    } catch (err) {
      console.error('Failed to update expense:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!activeHome) return;
    try {
      await api.deleteExpense(activeHome.id, id);
      setDeleteConfirmId(null);
      await fetchExpenses();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  const totalFilteredAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Expense History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Full ledger of household expenditures, searchable by merchant and item
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeHome && (
            <a
              href={api.getExportUrl(activeHome.id, selectedMonth)}
              download
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </a>
          )}

          <button
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors"
          >
            <span>+ Add Expense</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {/* Search & Month Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses by merchant, description, notes (e.g. Pressure Cooker, Blinkit)..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-700"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-emerald-700"
            />
          </div>
        </div>

        {/* Granular Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-100 text-xs">
          {/* Merchant Filter */}
          <div>
            <select
              value={selectedMerchant}
              onChange={(e) => setSelectedMerchant(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden"
            >
              <option value="">All Merchants</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden"
            >
              <option value="">All Types (Fixed & Variable)</option>
              <option value="variable">Variable / One-time</option>
              <option value="fixed">Fixed / Recurring</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [s, o] = e.target.value.split('-');
                setSortBy(s);
                setSortOrder(o as 'asc' | 'desc');
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-slate-700 focus:outline-hidden"
            >
              <option value="date-desc">Date: Newest First</option>
              <option value="date-asc">Date: Oldest First</option>
              <option value="amount-desc">Amount: Highest First</option>
              <option value="amount-asc">Amount: Lowest First</option>
              <option value="merchant-asc">Merchant: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filtered Summary Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 rounded-lg text-xs text-slate-600">
        <div>
          Showing <span className="font-semibold text-slate-900">{expenses.length}</span> recorded{' '}
          {expenses.length === 1 ? 'expense' : 'expenses'}
          {selectedMonth && <span> for {selectedMonth}</span>}
          {selectedMerchant && <span> at {selectedMerchant}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span>Filtered Total:</span>
          <span className="font-mono font-bold text-slate-950 text-sm tabular-nums">
            {formatAmount(totalFilteredAmount)}
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 space-y-2">
            <p>No expenses found matching the selected filters.</p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedMerchant('');
                setSelectedCategory('');
                setSelectedType('');
              }}
              className="text-emerald-800 font-semibold hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Merchant</th>
                  <th className="py-3 px-4">Description (What was bought)</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 tabular-nums">
                      {exp.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {exp.merchant_name}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{exp.description}</div>
                      {exp.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 italic">{exp.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: exp.category_color || '#2563EB' }}
                        />
                        <span>{exp.category_name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-slate-500">
                        {exp.expense_type === 'fixed' ? 'Fixed' : 'Variable'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatAmount(exp.amount)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(exp)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Delete this expense?</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to remove this transaction? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit Expense</h3>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateExpense} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Merchant</label>
                <input
                  type="text"
                  value={editMerchantName}
                  onChange={(e) => setEditMerchantName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount</label>
                  <input
                    type="number"
                    step="any"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description / Purchased Item
                </label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
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
                  <label className="block font-semibold text-slate-700 mb-1">Expense Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as ExpenseType)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="variable">Variable / One-time</option>
                    <option value="fixed">Fixed / Recurring</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-3 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
