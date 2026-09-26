import React, { useState } from 'react';
import { Home, Expense } from '../types';
import {
  X,
  Download,
  FileText,
  Table,
  Printer,
  CheckCircle,
  Building,
  Tag,
  Calendar,
  Sparkles,
  Receipt,
} from 'lucide-react';
import {
  exportMonthlyPDFReport,
  exportMonthlyCSVReport,
  formatCurrencyValue,
  formatMonthLabel,
} from '../utils/reportExporter';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  home: Home;
  report: {
    month: string;
    totals: { total_spending: number; fixed_spending: number; variable_spending: number; count: number };
    merchants: { name: string; amount: number; count: number }[];
    categories: { name: string; color: string; icon: string; amount: number; count: number }[];
    dailyTimeline: { date: string; amount: number; count: number }[];
  };
  expenses: Expense[];
  loadingExpenses?: boolean;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  onClose,
  home,
  report,
  expenses,
  loadingExpenses,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const monthLabel = formatMonthLabel(report.month);
  const currencySymbol = home.currency_symbol || '₹';

  const handleDownloadPDF = () => {
    try {
      exportMonthlyPDFReport({
        home,
        report,
        expenses,
      });
      setDownloadSuccess('PDF Report downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    }
  };

  const handleDownloadCSV = () => {
    try {
      exportMonthlyCSVReport({
        home,
        reportMonth: report.month,
        expenses,
      });
      setDownloadSuccess('CSV Spreadsheet downloaded successfully!');
      setTimeout(() => setDownloadSuccess(null), 3500);
    } catch (err) {
      console.error('Failed to generate CSV:', err);
    }
  };

  const handlePrint = () => {
    // Print current statement preview
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#EAE6DE] overflow-hidden my-auto flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAE6DE] bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#232038] text-white flex items-center justify-center">
              <FileText className="w-4 h-4 text-[#F6C343]" />
            </div>
            <div>
              <h2 className="font-serif-display text-lg font-bold text-slate-900">
                Download Monthly Report
              </h2>
              <p className="text-xs text-slate-500">
                {home.name} · {monthLabel} statement & offline family records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast if triggered */}
        {downloadSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Content Preview */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Action Download Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. PDF Card */}
            <div className="p-4 rounded-2xl border border-[#EAE6DE] bg-[#FAF8F5] hover:border-[#232038]/30 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center">
                    PDF
                  </div>
                  <span className="text-[10px] font-semibold text-[#84630A] bg-[#F6C343]/30 px-2 py-0.5 rounded-full">
                    Printable
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[#232038]">
                  Clean PDF Statement
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Publication-quality document with household letterhead, spending breakdown cards, top merchants, and complete transaction ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadPDF}
                disabled={loadingExpenses}
                className="mt-4 w-full py-2.5 px-4 bg-[#232038] hover:bg-[#181627] text-white text-xs font-semibold rounded-full shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Statement</span>
              </button>
            </div>

            {/* 2. CSV Card */}
            <div className="p-4 rounded-2xl border border-[#EAE6DE] bg-[#FAF8F5] hover:border-[#232038]/30 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center">
                    CSV
                  </div>
                  <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Spreadsheet
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[#232038]">
                  CSV Ledger Spreadsheet
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Structured row-by-row table containing dates, merchants, items, categories, amounts, paid-by members, and notes for Excel or Sheets.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadCSV}
                disabled={loadingExpenses}
                className="mt-4 w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-full shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                <Table className="w-3.5 h-3.5 text-emerald-700" />
                <span>Download CSV File</span>
              </button>
            </div>
          </div>

          {/* Statement Document Preview */}
          <div className="border border-[#EAE6DE] rounded-2xl p-5 bg-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  Document Preview
                </span>
                <div className="font-serif-display text-base font-bold text-[#232038]">
                  {home.name} — {monthLabel} Summary
                </div>
              </div>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-[#FAF8F5] hover:bg-slate-200/50 rounded-lg border border-[#EAE6DE] transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Statement</span>
              </button>
            </div>

            {/* Quick Stat Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF]">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Outflow</div>
                <div className="text-base font-bold font-mono text-[#232038] mt-0.5 tabular-nums">
                  {formatCurrencyValue(report.totals.total_spending, currencySymbol)}
                </div>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF]">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Fixed (Rent/Bills)</div>
                <div className="text-base font-bold font-mono text-[#232038] mt-0.5 tabular-nums">
                  {formatCurrencyValue(report.totals.fixed_spending, currencySymbol)}
                </div>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF]">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Variable Outflow</div>
                <div className="text-base font-bold font-mono text-[#232038] mt-0.5 tabular-nums">
                  {formatCurrencyValue(report.totals.variable_spending, currencySymbol)}
                </div>
              </div>
              <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF]">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Transactions</div>
                <div className="text-base font-bold font-mono text-[#232038] mt-0.5 tabular-nums">
                  {report.totals.count}
                </div>
              </div>
            </div>

            {/* Itemized Transactions Sample */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">
                  Itemized Expenses ({expenses.length} included in download)
                </span>
                <span className="text-[11px] text-slate-400">
                  Sorted by date descending
                </span>
              </div>

              {loadingExpenses ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  Loading expenses ledger...
                </div>
              ) : expenses.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400 bg-[#FAF8F5] rounded-xl border border-dashed border-[#EAE6DE]">
                  No expenses recorded in {monthLabel}.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-[#EAE6DE] rounded-xl divide-y divide-[#F0ECE4] text-xs">
                  {expenses.slice(0, 10).map((exp) => (
                    <div key={exp.id} className="p-2.5 flex items-center justify-between hover:bg-[#FAF8F5]">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {exp.date.split('-').slice(1).join('/')}
                        </span>
                        <div className="min-w-0">
                          <span className="font-semibold text-[#232038] truncate block">
                            {exp.merchant_name} <span className="font-normal text-slate-400">· {exp.description}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {exp.category_name} · {exp.expense_type}
                          </span>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-slate-900 shrink-0 tabular-nums">
                        {formatCurrencyValue(exp.amount, currencySymbol)}
                      </div>
                    </div>
                  ))}
                  {expenses.length > 10 && (
                    <div className="p-2 bg-[#FAF8F5] text-center text-[11px] text-slate-500 font-medium">
                      + {expenses.length - 10} more transactions included in downloaded file
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#EAE6DE] bg-[#FAF8F5] flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Files are generated locally for full privacy.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
