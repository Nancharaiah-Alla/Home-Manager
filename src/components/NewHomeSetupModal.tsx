import React, { useState } from 'react';
import {
  Home as HomeIcon,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Eye,
  Edit3,
  DollarSign,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SetupMemberInput } from '../types';

interface NewHomeSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

const COMMON_CURRENCIES = [
  { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  { symbol: '$', code: 'USD', label: 'USD ($)' },
  { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  { symbol: '£', code: 'GBP', label: 'GBP (£)' },
  { symbol: 'AED', code: 'AED', label: 'AED (د.إ)' },
  { symbol: 'C$', code: 'CAD', label: 'CAD ($)' },
];

export const NewHomeSetupModal: React.FC<NewHomeSetupModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const { user, setupNewHome } = useAuth();

  const [homeName, setHomeName] = useState(
    user?.name ? `${user.name}'s Residence` : 'Our Household'
  );
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [currencyCode, setCurrencyCode] = useState('INR');

  const [members, setMembers] = useState<SetupMemberInput[]>([
    { name: '', phone: '', role: 'editor' },
  ]);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddMember = () => {
    setMembers((prev) => [...prev, { name: '', phone: '', role: 'editor' }]);
  };

  const handleRemoveMember = (index: number) => {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (
    index: number,
    field: keyof SetupMemberInput,
    val: string
  ) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: val } : m))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!homeName.trim()) {
      setErrorMsg('Please enter a name for your home.');
      return;
    }

    // Filter out completely empty members
    const validMembers = members.filter((m) => m.name.trim().length > 0);

    setLoading(true);
    try {
      await setupNewHome({
        homeName: homeName.trim(),
        currencySymbol,
        currencyCode,
        members: validMembers,
      });

      if (onComplete) onComplete();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to setup home. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E4DA] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#F0ECE4] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#232038] text-[#F6C343] flex items-center justify-center font-bold shadow-xs">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-display text-xl font-bold text-[#232038]">
                  Setup Your New Home
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#F6C343]/20 text-[#232038]">
                  New Home
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Choose your currency, name your home, and add household members.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Currency / Unit */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              1. Currency / Currency Unit
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COMMON_CURRENCIES.map((c) => {
                const isSelected = currencyCode === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setCurrencyCode(c.code);
                      setCurrencySymbol(c.symbol);
                    }}
                    className={`py-2.5 px-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? 'bg-[#232038] text-white border-[#232038] shadow-xs ring-2 ring-[#232038]/20'
                        : 'bg-[#FAF8F5] text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span className="text-base">{c.symbol}</span>
                    <span className="text-[10px] opacity-80">{c.code}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              Select the currency symbol used across your household expenses and budget limits.
            </p>
          </div>

          {/* 2. Home Name */}
          <div className="space-y-1.5 pt-2 border-t border-[#F0ECE4]">
            <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
              2. Home Name
            </label>
            <div className="relative">
              <HomeIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="e.g., Maple Apartment 4B or The Miller Family"
                className="w-full pl-10 pr-4 py-3 text-sm bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] font-medium"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500">
              This name will be displayed at the top of your household expense ledger.
            </p>
          </div>

          {/* 3. Add Members */}
          <div className="space-y-3 pt-2 border-t border-[#F0ECE4]">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                  3. Add Members & Roles
                </label>
                <p className="text-[11px] text-slate-500">
                  Invite your family, roommates, or flatmates to join your ledger.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddMember}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            </div>

            {/* Current User Card (Admin) */}
            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#232038] text-[#F6C343] font-bold text-xs flex items-center justify-center">
                  {user?.name?.charAt(0) || 'Y'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {user?.name || 'You'} (You)
                  </div>
                  <div className="text-[10px] text-slate-500">{user?.phone || 'Account Phone'}</div>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold">
                <ShieldCheck className="w-3 h-3 text-amber-700" />
                <span>Admin & Owner</span>
              </div>
            </div>

            {/* Dynamic Members List */}
            <div className="space-y-3">
              {members.map((member, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-slate-200/90 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Member #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <input
                        type="text"
                        placeholder="Member Name (e.g. Alex, Mom)"
                        value={member.name}
                        onChange={(e) =>
                          handleMemberChange(idx, 'name', e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#232038]"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Phone or Email (Optional)"
                        value={member.phone || ''}
                        onChange={(e) =>
                          handleMemberChange(idx, 'phone', e.target.value)
                        }
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#232038]"
                      />
                    </div>
                  </div>

                  {/* Role Selection: Editor vs Viewer */}
                  <div>
                    <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                      Assign Role:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleMemberChange(idx, 'role', 'editor')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                          member.role === 'editor'
                            ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xs'
                            : 'bg-white/50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <Edit3
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            member.role === 'editor'
                              ? 'text-indigo-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            Editor
                          </div>
                          <div className="text-[10px] text-slate-500 leading-snug">
                            Can add their own expenses & spending to the home.
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMemberChange(idx, 'role', 'viewer')}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                          member.role === 'viewer'
                            ? 'bg-white border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs'
                            : 'bg-white/50 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <Eye
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            member.role === 'viewer'
                              ? 'text-emerald-600'
                              : 'text-slate-400'
                          }`}
                        />
                        <div>
                          <div className="text-xs font-bold text-slate-800">
                            Viewer
                          </div>
                          <div className="text-[10px] text-slate-500 leading-snug">
                            Can view the home and request products/items to buy. The admin can accept the request, purchase it, and add the expense.
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-[#F0ECE4] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="py-2.5 px-4 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Skip / Do Later
            </button>
            <button
              type="submit"
              disabled={loading}
              className="py-2.5 px-6 text-xs font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span>Creating Home...</span>
              ) : (
                <>
                  <span>Finish Setup & Launch Home</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#F6C343]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
