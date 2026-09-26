import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Expense, Home } from '../types';

interface MonthlyReportData {
  month: string;
  totals: {
    total_spending: number;
    fixed_spending: number;
    variable_spending: number;
    count: number;
  };
  merchants: { name: string; amount: number; count: number }[];
  categories: { name: string; color: string; icon: string; amount: number; count: number }[];
  dailyTimeline: { date: string; amount: number; count: number }[];
}

export function formatCurrencyValue(amount: number, symbol = '₹'): string {
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Generates and downloads a clean, professional, publication-quality PDF statement
 * formatted specifically for household records, binders, and offline documentation.
 */
export function exportMonthlyPDFReport({
  home,
  report,
  expenses,
}: {
  home: Home;
  report: MonthlyReportData;
  expenses: Expense[];
}): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const currencySymbol = home.currency_symbol || '₹';
  const monthLabel = formatMonthLabel(report.month);
  const now = new Date();
  const generatedDateStr = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Page geometry
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Header Banner: Slate Navy theme matching Home Manager
  doc.setFillColor(35, 32, 56); // #232038
  doc.rect(margin, 35, contentWidth, 68, 'F');

  // Accent Gold Pill Tag: #F6C343
  doc.setFillColor(246, 195, 67);
  doc.roundedRect(margin + 16, 47, 8, 44, 2, 2, 'F');

  // Title & Subtitle inside banner
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('HOME MANAGER', margin + 32, 63);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(190, 185, 215);
  doc.text('Monthly Household Expense Ledger & Financial Statement', margin + 32, 77);

  // Household & Period on right side of banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(home.name, pageWidth - margin - 16, 62, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(246, 195, 67);
  doc.text(`Period: ${monthLabel}`, pageWidth - margin - 16, 76, { align: 'right' });

  doc.setTextColor(180, 175, 205);
  doc.setFontSize(8);
  doc.text(`Generated on ${generatedDateStr}`, pageWidth - margin - 16, 88, { align: 'right' });

  // Summary Metrics Grid (4 Stat Boxes)
  let yPos = 118;
  const cardGap = 8;
  const cardWidth = (contentWidth - cardGap * 3) / 4;
  const cardHeight = 52;

  const summaryStats = [
    {
      title: 'TOTAL SPENT',
      val: formatCurrencyValue(report.totals.total_spending, currencySymbol),
      sub: `${report.totals.count} transactions`,
      bg: [250, 248, 245],
      border: [234, 230, 222],
      highlight: true,
    },
    {
      title: 'FIXED EXPENSES',
      val: formatCurrencyValue(report.totals.fixed_spending, currencySymbol),
      sub:
        report.totals.total_spending > 0
          ? `${Math.round((report.totals.fixed_spending / report.totals.total_spending) * 100)}% of total`
          : '0%',
      bg: [255, 255, 255],
      border: [234, 230, 222],
    },
    {
      title: 'VARIABLE SPENDING',
      val: formatCurrencyValue(report.totals.variable_spending, currencySymbol),
      sub:
        report.totals.total_spending > 0
          ? `${Math.round((report.totals.variable_spending / report.totals.total_spending) * 100)}% of total`
          : '0%',
      bg: [255, 255, 255],
      border: [234, 230, 222],
    },
    {
      title: 'DAILY AVERAGE',
      val: formatCurrencyValue(
        report.totals.count > 0 ? Math.round(report.totals.total_spending / 30) : 0,
        currencySymbol
      ),
      sub: 'Approx / day',
      bg: [255, 255, 255],
      border: [234, 230, 222],
    },
  ];

  summaryStats.forEach((stat, i) => {
    const cardX = margin + i * (cardWidth + cardGap);
    doc.setFillColor(stat.bg[0], stat.bg[1], stat.bg[2]);
    doc.setDrawColor(stat.border[0], stat.border[1], stat.border[2]);
    doc.setLineWidth(0.75);
    doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 4, 4, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(115, 110, 130);
    doc.text(stat.title, cardX + 8, yPos + 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(stat.highlight ? 35 : 20, stat.highlight ? 32 : 20, stat.highlight ? 56 : 20);
    doc.text(stat.val, cardX + 8, yPos + 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 140);
    doc.text(stat.sub, cardX + 8, yPos + 44);
  });

  // Section 1: Merchants & Categories summary tables side by side
  yPos += cardHeight + 16;

  // Header line
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(35, 32, 56);
  doc.text('SPENDING BREAKDOWN', margin, yPos);
  yPos += 8;

  // 1. Top Merchants Table
  const topMerchantsData = (report.merchants || []).slice(0, 5).map((m, idx) => {
    const pct =
      report.totals.total_spending > 0
        ? `${((m.amount / report.totals.total_spending) * 100).toFixed(1)}%`
        : '0%';
    return [
      `#${idx + 1}`,
      m.name,
      `${m.count} txns`,
      formatCurrencyValue(m.amount, currencySymbol),
      pct,
    ];
  });

  const halfWidth = (contentWidth - 12) / 2;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin + halfWidth + 12 },
    tableWidth: halfWidth,
    head: [['#', 'Merchant', 'Count', 'Total', 'Share']],
    body: topMerchantsData.length > 0 ? topMerchantsData : [['-', 'No transactions', '-', '-', '-']],
    theme: 'plain',
    headStyles: {
      fillColor: [240, 238, 233],
      textColor: [35, 32, 56],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40],
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    columnStyles: {
      0: { cellWidth: 18, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 42, halign: 'right' },
      3: { cellWidth: 52, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 32, halign: 'right' },
    },
  });

  // 2. Spending by Category Table
  const topCategoriesData = (report.categories || []).slice(0, 5).map((c) => {
    const pct =
      report.totals.total_spending > 0
        ? `${((c.amount / report.totals.total_spending) * 100).toFixed(1)}%`
        : '0%';
    return [
      c.name,
      `${c.count} items`,
      formatCurrencyValue(c.amount, currencySymbol),
      pct,
    ];
  });

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin + halfWidth + 12, right: margin },
    tableWidth: halfWidth,
    head: [['Category', 'Count', 'Total', 'Share']],
    body: topCategoriesData.length > 0 ? topCategoriesData : [['No categories', '-', '-', '-']],
    theme: 'plain',
    headStyles: {
      fillColor: [240, 238, 233],
      textColor: [35, 32, 56],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [40, 40, 40],
      cellPadding: 3.5,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold' },
      1: { cellWidth: 42, halign: 'right' },
      2: { cellWidth: 54, halign: 'right', fontStyle: 'bold' },
      3: { cellWidth: 32, halign: 'right' },
    },
  });

  // Section 2: Full Itemized Expense Ledger
  // Find current Y after the tables
  // @ts-expect-error lastAutoTable is populated by autoTable plugin
  const lastY = Math.max(doc.lastAutoTable?.finalY || yPos + 80, 240);
  const ledgerStartY = lastY + 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(35, 32, 56);
  doc.text(`ITEMIZED EXPENSE TRANSACTIONS (${expenses.length} RECORDS)`, margin, ledgerStartY);

  const expensesTableData = expenses.map((exp) => {
    return [
      exp.date,
      exp.merchant_name || '—',
      exp.description || '—',
      exp.category_name || '—',
      exp.expense_type === 'fixed' ? 'Fixed' : 'Variable',
      exp.paid_by_nickname || exp.paid_by_name || 'Household',
      formatCurrencyValue(exp.amount, currencySymbol),
    ];
  });

  autoTable(doc, {
    startY: ledgerStartY + 6,
    margin: { left: margin, right: margin, bottom: 40 },
    head: [['Date', 'Merchant', 'Description', 'Category', 'Type', 'Paid By', 'Amount']],
    body: expensesTableData.length > 0 ? expensesTableData : [['—', 'No expenses recorded this month', '—', '—', '—', '—', '—']],
    theme: 'striped',
    headStyles: {
      fillColor: [35, 32, 56], // #232038
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 5,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30],
      cellPadding: 4,
    },
    alternateRowStyles: {
      fillColor: [250, 248, 245],
    },
    columnStyles: {
      0: { cellWidth: 58 },
      1: { cellWidth: 80, fontStyle: 'bold' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 78 },
      4: { cellWidth: 44, halign: 'center' },
      5: { cellWidth: 58 },
      6: { cellWidth: 64, halign: 'right', fontStyle: 'bold' },
    },
    didDrawPage: (data) => {
      // Footer on every page
      const pageNumber = doc.internal.pages.length - 1;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 150);
      doc.text(
        `Home Manager · ${home.name} · Monthly Report: ${monthLabel}`,
        margin,
        doc.internal.pageSize.getHeight() - 20
      );
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth - margin,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'right' }
      );
    },
  });

  // Save the PDF file
  const filename = `HomeManager-Report-${home.name.replace(/[^a-zA-Z0-9]/g, '_')}-${report.month}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a clean, structured CSV file directly in the browser
 */
export function exportMonthlyCSVReport({
  home,
  reportMonth,
  expenses,
}: {
  home: Home;
  reportMonth: string;
  expenses: Expense[];
}): void {
  const headers = [
    'Date',
    'Merchant',
    'Description',
    'Category',
    'Expense Type',
    `Amount (${home.currency_symbol || 'INR'})`,
    'Paid By',
    'Notes',
  ];

  const rows = expenses.map((exp) => [
    exp.date,
    `"${(exp.merchant_name || '').replace(/"/g, '""')}"`,
    `"${(exp.description || '').replace(/"/g, '""')}"`,
    `"${(exp.category_name || '').replace(/"/g, '""')}"`,
    exp.expense_type,
    exp.amount,
    `"${(exp.paid_by_nickname || exp.paid_by_name || '').replace(/"/g, '""')}"`,
    `"${(exp.notes || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `HomeManager-Expenses-${home.name.replace(/[^a-zA-Z0-9]/g, '_')}-${reportMonth}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
