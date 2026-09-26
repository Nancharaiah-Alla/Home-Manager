import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Expense } from '../types';
import {
  BarChart3,
  Calendar,
  Download,
  FileText,
  Table,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Building,
  Tag,
  CheckCircle,
  Eye,
  Printer,
} from 'lucide-react';
import { MonthlyReportModal } from './MonthlyReportModal';
import {
  exportMonthlyPDFReport,
  exportMonthlyCSVReport,
} from '../utils/reportExporter';

export const ReportsView: React.FC = () => {
  const { activeHome, formatAmount } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState('2026-09');
  const [report, setReport] = useState<{
    month: string;
    totals: { total_spending: number; fixed_spending: number; variable_spending: number; count: number };
    merchants: { name: string; amount: number; count: number }[];
    categories: { name: string; color: string; icon: string; amount: number; count: number }[];
    dailyTimeline: { date: string; amount: number; count: number }[];
    availableMonths: string[];
  } | null>(null);

  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  const downloadMenuRef = useRef<HTMLDivElement>(null);

  const fetchReport = useCallback(async () => {
    if (!activeHome) return;
    setLoading(true);
    try {
      const data = await api.getMonthlyReport(activeHome.id, selectedMonth);
      setReport(data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  }, [activeHome, selectedMonth]);

  const fetchMonthExpenses = useCallback(async () => {
    if (!activeHome) return;
    setLoadingExpenses(true);
    try {
      const exps = await api.getExpenses(activeHome.id, {
        month: selectedMonth,
        sort_by: 'date',
        sort_order: 'desc',
      });
      setMonthExpenses(exps);
    } catch (err) {
      console.error('Failed to fetch monthly expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  }, [activeHome, selectedMonth]);

  useEffect(() => {
    fetchReport();
    fetchMonthExpenses();
  }, [fetchReport, fetchMonthExpenses]);

  // Close download menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showDownloadMenu]);

  const handleMonthChange = (delta: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    const newMonthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(newMonthStr);
  };

  const formatMonthName = (monthStr: string) => {
    const [y, m] = monthStr.split('-');
    const date = new Date(Number(y), Number(m) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const handleDirectDownloadPDF = () => {
    if (!activeHome || !report) return;
    setShowDownloadMenu(false);
    try {
      exportMonthlyPDFReport({
        home: activeHome,
        report,
        expenses: monthExpenses,
      });
      setDownloadSuccessMsg('PDF Report downloaded successfully!');
      setTimeout(() => setDownloadSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  const handleDirectDownloadCSV = () => {
    if (!activeHome || !report) return;
    setShowDownloadMenu(false);
    try {
      exportMonthlyCSVReport({
        home: activeHome,
        reportMonth: selectedMonth,
        expenses: monthExpenses,
      });
      setDownloadSuccessMsg('CSV Spreadsheet downloaded successfully!');
      setTimeout(() => setDownloadSuccessMsg(null), 3500);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const totals = report?.totals || { total_spending: 0, fixed_spending: 0, variable_spending: 0, count: 0 };
  const merchants = report?.merchants || [];
  const categories = report?.categories || [];
  const dailyTimeline = report?.dailyTimeline || [];

  const maxDailyAmount = Math.max(...dailyTimeline.map((d) => d.amount), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAE6DE]">
        <div>
          <h1 className="font-serif-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Monthly Summary & Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Financial summary, breakdown, and offline records for {formatMonthName(selectedMonth)}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          {/* Month Selector */}
          <div className="flex items-center bg-white border border-[#EAE6DE] rounded-xl shadow-2xs p-1">
            <button
              onClick={() => handleMonthChange(-1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-[#F4F1EA] rounded-lg transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="px-3 text-xs font-semibold text-slate-800 min-w-[130px] text-center font-serif-display">
              {formatMonthName(selectedMonth)}
            </div>
            <button
              onClick={() => handleMonthChange(1)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-[#F4F1EA] rounded-lg transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Download Monthly Report Button & Dropdown */}
          <div className="relative" ref={downloadMenuRef}>
            <div className="inline-flex rounded-full shadow-2xs bg-[#232038] hover:bg-[#181627] text-white transition-all">
              {/* Primary Action Button: Opens the Download Report modal */}
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-l-full hover:bg-[#181627] transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-[#F6C343]" />
                <span>Download Monthly Report</span>
              </button>

              {/* Dropdown Toggle Arrow */}
              <button
                type="button"
                onClick={() => setShowDownloadMenu((prev) => !prev)}
                className="px-2.5 py-2 border-l border-white/15 rounded-r-full hover:bg-[#181627] transition-colors cursor-pointer"
                title="Report formats"
                aria-expanded={showDownloadMenu}
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {showDownloadMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-[#EAE6DE] py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Select Format
                </div>

                {/* 1. PDF Statement */}
                <button
                  type="button"
                  onClick={handleDirectDownloadPDF}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#FAF8F5] transition-colors text-left group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">
                    PDF
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-black">
                      Download PDF Statement
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Formatted family report with itemized ledger
                    </div>
                  </div>
                </button>

                {/* 2. CSV Spreadsheet */}
                <button
                  type="button"
                  onClick={handleDirectDownloadCSV}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 hover:bg-[#FAF8F5] transition-colors text-left group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
                    CSV
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-800 group-hover:text-black">
                      Download CSV Spreadsheet
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Structured rows for Excel or Google Sheets
                    </div>
                  </div>
                </button>

                {/* 3. Preview & Print Statement */}
                <div className="border-t border-[#F0ECE4] mt-1 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDownloadMenu(false);
                      setIsReportModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-[#FAF8F5] transition-colors text-left text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-400" />
                    <span>Preview & Print Statement</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success notification banner */}
      {downloadSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-800 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccessMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-500 font-serif-display">
          <div className="w-7 h-7 border-2 border-[#232038] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Compiling monthly summary...
        </div>
      ) : (
        <>
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Monthly Expenditure
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-slate-950 tabular-nums">
                {formatAmount(totals.total_spending)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Across {totals.count} recorded purchases in {formatMonthName(selectedMonth)}
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Fixed Commitments
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {formatAmount(totals.fixed_spending)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {totals.total_spending > 0
                  ? `${Math.round((totals.fixed_spending / totals.total_spending) * 100)}% of household outflow`
                  : '0%'}
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Variable Purchases
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold font-mono text-slate-900 tabular-nums">
                {formatAmount(totals.variable_spending)}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                {totals.total_spending > 0
                  ? `${Math.round((totals.variable_spending / totals.total_spending) * 100)}% of household outflow`
                  : '0%'}
              </div>
            </div>
          </div>

          {/* Daily Spending Timeline */}
          <div className="p-6 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-serif-display text-base font-bold text-slate-900">
                  Daily Spending Flow
                </h3>
                <p className="text-[11px] text-slate-500">
                  Expenses distributed across the calendar days
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Peak day: {formatAmount(maxDailyAmount)}
              </span>
            </div>

            <div className="mt-6">
              {dailyTimeline.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-[#FAF8F5] rounded-xl border border-dashed border-[#EAE6DE]">
                  No daily transaction data for {formatMonthName(selectedMonth)}.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-end gap-1.5 h-36 pt-4 px-2">
                    {dailyTimeline.map((item) => {
                      const heightPercent = Math.max(12, Math.round((item.amount / maxDailyAmount) * 100));
                      const dayNumber = item.date.split('-')[2];
                      return (
                        <div
                          key={item.date}
                          className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                        >
                          {/* Hover Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-[#232038] text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-20 pointer-events-none font-mono shadow-md">
                            {item.date}: {formatAmount(item.amount)}
                          </div>
                          <div
                            className="w-full bg-[#232038] hover:bg-[#F6C343] rounded-t-sm transition-colors cursor-pointer"
                            style={{ height: `${heightPercent}%` }}
                          />
                          <span className="text-[10px] text-slate-400 font-mono">
                            {dayNumber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Two Columns: Top Merchants & Top Categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Merchants Ranking */}
            <div className="p-6 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
              <h3 className="font-serif-display text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Top Merchants Breakdown
              </h3>

              <div className="mt-4 divide-y divide-slate-100">
                {merchants.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No merchant data recorded.</p>
                ) : (
                  merchants.map((m, idx) => {
                    const pct = totals.total_spending > 0 ? (m.amount / totals.total_spending) * 100 : 0;
                    return (
                      <div key={m.name} className="py-3 flex items-center justify-between text-xs hover:bg-[#FAF8F5] px-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-slate-400 w-4 text-right font-medium">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900">{m.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {m.count} {m.count === 1 ? 'transaction' : 'transactions'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatAmount(m.amount)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Categories Ranking */}
            <div className="p-6 bg-white rounded-2xl border border-[#EAE6DE] shadow-2xs">
              <h3 className="font-serif-display text-base font-bold text-slate-900 pb-3 border-b border-slate-100">
                Spending by Category Breakdown
              </h3>

              <div className="mt-4 divide-y divide-slate-100">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No category data recorded.</p>
                ) : (
                  categories.map((c) => {
                    const pct = totals.total_spending > 0 ? (c.amount / totals.total_spending) * 100 : 0;
                    return (
                      <div key={c.name} className="py-3 flex items-center justify-between text-xs hover:bg-[#FAF8F5] px-2 rounded-xl transition-colors">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: c.color || '#232038' }}
                          />
                          <div>
                            <div className="font-semibold text-slate-900">{c.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {c.count} {c.count === 1 ? 'item' : 'items'}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatAmount(c.amount)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            {pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Monthly Report Download & Print Modal */}
      {activeHome && report && (
        <MonthlyReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          home={activeHome}
          report={report}
          expenses={monthExpenses}
          loadingExpenses={loadingExpenses}
        />
      )}
    </div>
  );
};
