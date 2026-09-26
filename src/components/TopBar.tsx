import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavTab } from './Sidebar';
import {
  Plus,
  Menu,
  Settings,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Home,
  Wallet,
  RotateCw,
  Check,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';

interface TopBarProps {
  onOpenAddExpense: () => void;
  onNavigateToTab?: (tab: NavTab) => void;
  onOpenMobileSidebar: () => void;
  onLogout?: () => void;
  onSwitchAccount?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenAddExpense,
  onNavigateToTab,
  onOpenMobileSidebar,
  onLogout,
  onSwitchAccount,
}) => {
  const { user, homes, activeHome, setActiveHomeId, logout, updateProfile } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [showHomeSwitcher, setShowHomeSwitcher] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setIsEditingName(false);
        setShowHomeSwitcher(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
        setIsEditingName(false);
        setShowHomeSwitcher(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDropdownOpen]);

  // Initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'HM';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setIsSavingName(true);
    try {
      await updateProfile(newName.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to update name:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleSignOut = async () => {
    setIsDropdownOpen(false);
    await logout();
    if (onLogout) onLogout();
  };

  return (
    <header className="h-16 px-6 sm:px-8 flex items-center justify-between border-b border-[#EAE6DE] bg-[#FAF8F5]/90 backdrop-blur-xs sticky top-0 z-30">
      {/* Left zone: Active Home Indicator & Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden p-2 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-200/60 cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="font-serif-display font-bold text-sm text-slate-900">
            {activeHome?.name || 'Household'}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500">
            Ledger
          </span>
        </div>
      </div>

      {/* Right zone: + Add expense & HM Avatar with Dropdown */}
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={onOpenAddExpense}
          className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-[#232038] hover:bg-[#1A182B] text-white text-xs sm:text-sm font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add expense</span>
        </button>

        {/* Circular Profile Icon Container */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen((prev) => !prev);
              setNewName(user?.name || '');
              setIsEditingName(false);
              setShowHomeSwitcher(false);
            }}
            className={`w-9 h-9 rounded-full bg-[#B2E2D3] text-[#1E3B33] font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-[#232038]/20 transition-all cursor-pointer select-none ${
              isDropdownOpen ? 'ring-2 ring-[#232038] scale-105' : ''
            }`}
            title={user ? `${user.name} - Profile & Settings` : 'Profile & Settings'}
            aria-expanded={isDropdownOpen}
          >
            {getInitials()}
          </button>

          {/* Profile & Settings Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-[#EAE6DE] py-2 z-50 animate-in fade-in zoom-in-95 duration-100 overflow-hidden">
              {/* Profile Card Header */}
              <div className="p-4 bg-[#FAF8F5] border-b border-[#EAE6DE]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#B2E2D3] text-[#1E3B33] font-bold text-sm flex items-center justify-center shadow-2xs shrink-0">
                      {getInitials()}
                    </div>
                    <div className="min-w-0">
                      {isEditingName ? (
                        <form onSubmit={handleSaveName} className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="text-xs font-semibold px-2 py-1 bg-white border border-slate-300 rounded-lg w-32 focus:outline-hidden focus:border-[#232038]"
                            autoFocus
                          />
                          <button
                            type="submit"
                            disabled={isSavingName}
                            className="p-1 text-emerald-700 hover:text-emerald-900 bg-white rounded-md border border-slate-200"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingName(false)}
                            className="p-1 text-slate-400 hover:text-slate-600 bg-white rounded-md border border-slate-200"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[#232038] truncate block">
                            {user?.name || 'Household User'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setNewName(user?.name || '');
                              setIsEditingName(true);
                            }}
                            className="p-1 text-slate-400 hover:text-[#232038] rounded-md transition-colors"
                            title="Edit name"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                        {user?.email || 'Logged in'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Household Tag */}
                <div className="mt-3 pt-2.5 border-t border-[#EDE8DF] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Home className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-medium text-slate-700 truncate max-w-[150px]">
                      {activeHome?.name || 'Shared home'}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#84630A] bg-[#F6C343]/20 px-2 py-0.5 rounded-full capitalize">
                    {activeHome?.role || 'Admin'}
                  </span>
                </div>
              </div>

              {/* Menu Navigation Items */}
              <div className="p-1.5 space-y-0.5 text-xs text-slate-700">
                {/* 1. Household Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigateToTab) onNavigateToTab('settings');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] transition-colors text-left group cursor-pointer"
                >
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-[#232038]" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Household Settings</div>
                    <div className="text-[10px] text-slate-400">Members, currency & home name</div>
                  </div>
                </button>

                {/* 2. Category Limits */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigateToTab) onNavigateToTab('limits');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] transition-colors text-left group cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-slate-400 group-hover:text-[#232038]" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Category Limits</div>
                    <div className="text-[10px] text-slate-400">Monthly budget thresholds</div>
                  </div>
                </button>

                {/* 3. Recurring Bills */}
                <button
                  type="button"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    if (onNavigateToTab) onNavigateToTab('recurring');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] transition-colors text-left group cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-slate-400 group-hover:text-[#232038]" />
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">Recurring Bills</div>
                    <div className="text-[10px] text-slate-400">Rent, electricity & internet</div>
                  </div>
                </button>

                {/* 4. Switch Household Toggle */}
                {homes.length > 1 && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowHomeSwitcher((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#FAF8F5] transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Home className="w-4 h-4 text-slate-400 group-hover:text-[#232038]" />
                        <span className="font-medium text-slate-900">Switch Household</span>
                      </div>
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                          showHomeSwitcher ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {showHomeSwitcher && (
                      <div className="my-1 mx-2 p-1.5 bg-[#FAF8F5] rounded-xl border border-[#EDE8DF] space-y-1">
                        {homes.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => {
                              setActiveHomeId(h.id);
                              setShowHomeSwitcher(false);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                              h.id === activeHome?.id
                                ? 'bg-white text-[#232038] font-bold shadow-2xs'
                                : 'text-slate-600 hover:bg-white/60'
                            }`}
                          >
                            <span className="truncate">{h.name}</span>
                            {h.id === activeHome?.id && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Actions: Sign Out & Switch Account */}
              <div className="p-1.5 border-t border-[#EAE6DE] space-y-0.5 text-xs">
                {onSwitchAccount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      onSwitchAccount();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FAF8F5] text-slate-600 hover:text-slate-900 transition-colors text-left cursor-pointer"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>Switch Account</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
