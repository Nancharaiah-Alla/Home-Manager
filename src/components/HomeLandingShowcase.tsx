import React from 'react';
import {
  Home as HomeIcon,
  Receipt,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Users,
  Edit3,
  Eye,
  ShoppingBag,
  TrendingDown,
  PieChart,
  Laptop,
  Check,
  Lock,
} from 'lucide-react';

interface HomeLandingShowcaseProps {
  onStartHome: () => void;
  onExploreDemo: () => void;
}

export const HomeLandingShowcase: React.FC<HomeLandingShowcaseProps> = ({
  onStartHome,
  onExploreDemo,
}) => {
  return (
    <div className="space-y-16 py-4">
      {/* 1. Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-4 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#232038] text-[#F6C343] text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#F6C343]" />
          <span>Modern Household Expense Ledger</span>
        </div>

        <h1 className="font-serif-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#232038] leading-[1.15]">
          Shared household expenses made transparent, effortless, and peaceful.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto font-normal">
          Home Manager is a simple, dedicated expense ledger for families, couples, and roommates.
          Record what was bought in seconds, assign Editor and Viewer roles, and keep spending safely within monthly runway limits.
        </p>

        {/* Hero CTAs */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4">
          <button
            type="button"
            onClick={onStartHome}
            className="w-full sm:w-auto px-7 py-3.5 text-sm sm:text-base font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2.5"
          >
            <HomeIcon className="w-4 h-4 text-[#F6C343]" />
            <span>Start a Home</span>
          </button>

          <button
            type="button"
            onClick={onExploreDemo}
            className="w-full sm:w-auto px-6 py-3.5 text-sm sm:text-base font-bold text-[#232038] bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 rounded-2xl shadow-2xs hover:shadow-xs transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2.5"
          >
            <Receipt className="w-4 h-4 text-[#232038]" />
            <span>Demo Expense Ledger</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <p className="text-xs text-slate-400 font-medium pt-1">
          Secure Phone + OTP • Single-device login protection • No passwords or email clutter
        </p>
      </section>

      {/* 2. Cross-Way Expense Tracker Preview (Display / Advertising Showcase) */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Inside Look</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            <span>Display Preview</span>
          </div>
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#232038]">
            See how it looks and works inside
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            A cross-way snapshot of the clean household ledger and budget runway tracking.
          </p>
        </div>

        {/* Mock Display Card Frame */}
        <div className="bg-white border border-[#E8E4DA] rounded-3xl shadow-xl overflow-hidden max-w-5xl mx-auto">
          {/* Mock Browser/Window Header */}
          <div className="bg-[#FAF8F5] border-b border-[#F0ECE4] px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-400/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
              <span className="ml-2 text-xs font-semibold text-slate-500 hidden sm:inline">
                Home Manager — Household Ledger Preview
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                Advertising Display
              </span>
              <button
                type="button"
                onClick={onExploreDemo}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Try Live Demo</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6 bg-[#FCFBF9]">
            {/* Display Snapshot Metrics (Cross-way preview) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Card 1 */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DA] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Total Spent</span>
                  <span className="text-[10px] text-[#232038] font-bold bg-[#FAF8F5] px-2 py-0.5 rounded-full">
                    6 purchases
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#232038]">
                  30,890
                </div>
                <div className="text-[11px] text-slate-500">6 transactions recorded</div>
              </div>

              {/* Card 2 */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DA] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Fixed vs Variable</span>
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">
                    Split Ratio
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Fixed</span>
                    <strong className="text-[#232038] font-mono text-sm">20,350</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Variable</span>
                    <strong className="text-emerald-700 font-mono text-sm">10,540</strong>
                  </div>
                </div>
                {/* Visual Ratio Bar */}
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden flex">
                  <div className="bg-[#232038] h-full" style={{ width: '66%' }} />
                  <div className="bg-emerald-500 h-full" style={{ width: '34%' }} />
                </div>
              </div>

              {/* Card 3 */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8E4DA] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Runway Target</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
                    77% used
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold text-[#232038]">
                  40,000
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold">
                  +9,110 buffer remaining
                </div>
              </div>
            </div>

            {/* Display Ledger Table Preview */}
            <div className="bg-white border border-[#E8E4DA] rounded-2xl overflow-hidden shadow-2xs">
              <div className="px-4 py-3 bg-[#FAF8F5] border-b border-[#F0ECE4] flex items-center justify-between text-xs font-bold text-slate-600">
                <span>Household Expenses</span>
                <span className="text-[11px] text-slate-400">Display Only</span>
              </div>

              <div className="divide-y divide-slate-100">
                {[
                  {
                    cat: 'Housing',
                    color: '#9333EA',
                    merchant: 'Property Landlord',
                    desc: 'Apartment Rent',
                    type: 'fixed',
                    paidBy: 'Allan',
                    amount: '18,000',
                  },
                  {
                    cat: 'Shopping',
                    color: '#D97706',
                    merchant: 'Amazon',
                    desc: 'Cordless Vacuum Cleaner',
                    type: 'variable',
                    paidBy: 'Allan',
                    amount: '4,940',
                  },
                  {
                    cat: 'Utilities',
                    color: '#DC2626',
                    merchant: 'Electricity Board',
                    desc: 'Power & Grid Utility Bill',
                    type: 'fixed',
                    paidBy: 'Sarah',
                    amount: '2,350',
                  },
                  {
                    cat: 'Healthcare',
                    color: '#059669',
                    merchant: 'Apollo Pharmacy',
                    desc: 'First Aid Kit & Vitamin C',
                    type: 'variable',
                    paidBy: 'Sarah',
                    amount: '1,420',
                  },
                  {
                    cat: 'Groceries',
                    color: '#16A34A',
                    merchant: 'Blinkit',
                    desc: 'Fresh Milk, Farm Eggs & Sourdough',
                    type: 'variable',
                    paidBy: 'Sarah',
                    amount: '680',
                  },
                ].map((row, i) => (
                  <div
                    key={i}
                    className="px-4 py-3 flex items-center justify-between text-xs hover:bg-[#FAF8F5]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: row.color }}
                      >
                        {row.cat}
                      </span>
                      <div>
                        <div className="font-bold text-slate-800">{row.merchant}</div>
                        <div className="text-[11px] text-slate-500">{row.desc}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="hidden sm:inline-block text-[11px] text-slate-400">
                        Paid by {row.paidBy}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md hidden sm:inline-block ${
                          row.type === 'fixed'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {row.type}
                      </span>
                      <span className="font-mono font-bold text-sm text-[#232038]">
                        {row.amount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Interactive prompt inside preview */}
              <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                <div className="flex items-center gap-2 text-xs text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Want to test adding, editing, or filtering expenses? Try the interactive guest demo!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onExploreDemo}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-1.5 shrink-0"
                >
                  <Receipt className="w-3.5 h-3.5 text-[#F6C343]" />
                  <span>Try Demo Expense Ledger</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. What is this Application? */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#232038]">
            What is Home Manager?
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            A single, peaceful source of truth for home expenses. Built to replace messy split bills, lost receipts, and confusing group chats.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#232038] text-base">Instant Recording</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Separate where you bought from what you bought in 5 seconds. Distinguish fixed bills from variable daily spend with zero math.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#232038] text-base">Two Member Roles</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Assign <strong>Editors</strong> to add their own spending, or <strong>Viewers</strong> to request products/items to buy for the home.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#232038] text-base">Single-Device Privacy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Protected by Phone + OTP authentication with immediate multi-device detection to ensure your session remains secure and isolated.
            </p>
          </div>
        </div>
      </section>

      {/* 4. To Whom It Helps */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#232038]">
            To Whom It Helps
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Designed for anyone managing real-world shared living costs.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DA] flex items-center justify-center text-xl shrink-0">
              🏡
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-[#232038] text-sm">Couples & Partners</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Share rent, utilities, and daily groceries transparently without awkward reminders or financial friction.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DA] flex items-center justify-center text-xl shrink-0">
              👨‍👩‍👧‍👦
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-[#232038] text-sm">Families & Households</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Keep track of household essentials, pharmacy, school supplies, and stay comfortably within monthly targets.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DA] flex items-center justify-center text-xl shrink-0">
              🤝
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-[#232038] text-sm">Roommates & Flatmates</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Track shared apartment rent, high-speed WiFi bills, and kitchen supplies with complete visibility on who paid.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-[#E8E4DA] shadow-xs flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DA] flex items-center justify-center text-xl shrink-0">
              👤
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-[#232038] text-sm">Solo Living</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                A calm, distraction-free view to separate fixed overhead commitments from discretionary everyday spending.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Clear Member Roles Explained */}
      <section className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <h2 className="font-serif-display text-2xl sm:text-3xl font-bold text-[#232038]">
            Collaborative Roles Made Simple
          </h2>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Give everyone the right permissions when you setup your home.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Editor */}
          <div className="p-6 rounded-3xl bg-white border border-indigo-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Editor</h3>
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                    Direct Spender
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Editors can record their own expenses and daily spending directly into the household ledger. Ideal for spouses, flatmates, or financial partners who regularly make purchases.
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Adds expenses directly to the home ledger</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Can view all household spending and metrics</span>
              </li>
            </ul>
          </div>

          {/* Viewer */}
          <div className="p-6 rounded-3xl bg-white border border-emerald-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Viewer</h3>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                    Purchase Requester
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Viewers can view the home and request products/items to buy. The admin can accept the request, purchase it, and add the expense to the ledger. Perfect for kids, dependents, or flatmates requesting groceries.
            </p>
            <ul className="text-xs text-slate-500 space-y-1.5 pt-1">
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Can view all household spending</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Submits purchase requests for admin/editor to buy</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 6. Bottom Banner CTA */}
      <section className="bg-gradient-to-br from-[#232038] to-[#181528] text-white rounded-3xl p-8 sm:p-12 shadow-sm text-center max-w-4xl mx-auto space-y-6 relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-b from-[#F6C343]/15 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F6C343]/20 border border-[#F6C343]/30 text-[#F6C343] text-xs font-bold">
            <HomeIcon className="w-3.5 h-3.5" />
            <span>Setup In Under 1 Minute</span>
          </div>

          <h2 className="font-serif-display text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            Ready to bring clarity to your household expenses?
          </h2>

          <p className="text-sm text-slate-300 leading-relaxed">
            Test the live demo right in your browser or start a home with your phone number and OTP.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onStartHome}
              className="w-full sm:w-auto px-7 py-3 text-sm font-bold text-[#232038] bg-[#F6C343] hover:bg-[#fad36b] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <HomeIcon className="w-4 h-4 text-[#232038]" />
              <span>Start a Home</span>
            </button>

            <button
              type="button"
              onClick={onExploreDemo}
              className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4 text-[#F6C343]" />
              <span>Demo Expense Ledger</span>
            </button>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="text-center text-xs text-slate-400 py-6 border-t border-[#E8E4DA]">
        <p>© 2026 Home Manager • Simple Household Expense Ledger</p>
      </footer>
    </div>
  );
};
