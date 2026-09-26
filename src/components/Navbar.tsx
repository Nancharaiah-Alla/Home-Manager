import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Plus,
  LayoutDashboard,
  Receipt,
  RotateCw,
  Gauge,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'expenses' | 'recurring' | 'limits' | 'reports' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddExpense: () => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddExpense,
  onOpenAuth,
}) => {
  const { user, homes, activeHome, setActiveHomeId, logout } = useAuth();
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'recurring', label: 'Recurring', icon: <RotateCw className="w-4 h-4" /> },
    { id: 'limits', label: 'Monthly Limits', icon: <Gauge className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: 'Home Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* ZONE 1: Brand & Household Context */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center text-white shadow-xs">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-emerald-800 transition-colors">
                Home Manager
              </span>
            </button>

            {/* Household Switcher Pill */}
            {activeHome && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200/80 rounded-md transition-colors"
                >
                  <span className="max-w-[120px] truncate">{activeHome.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                </button>

                {showHomeDropdown && (
                  <div
                    className="absolute left-0 mt-1.5 w-52 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setShowHomeDropdown(false)}
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Households
                    </div>
                    {homes.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          setActiveHomeId(h.id);
                          setShowHomeDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 ${
                          h.id === activeHome.id ? 'font-semibold text-emerald-800 bg-emerald-50/50' : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate">{h.name}</span>
                        {h.id === activeHome.id && <span className="text-[10px] text-emerald-700 font-medium">Active</span>}
                      </button>
                    ))}
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTab('settings');
                          setShowHomeDropdown(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      >
                        Manage Households...
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ZONE 2: 4-6 Text Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? 'text-emerald-950 bg-emerald-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={isActive ? 'text-emerald-700' : 'text-slate-400'}>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* ZONE 3: Primary Action + User Profile */}
          <div className="flex items-center gap-3">
            {/* Primary Action Button */}
            <button
              onClick={onOpenAddExpense}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Expense</span>
            </button>

            {/* User Profile or Login Trigger */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100 transition-colors focus-visible:outline-hidden"
                  title={user.name}
                >
                  <div
                    className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shadow-xs"
                    style={{ backgroundColor: user.avatar_color || '#2563EB' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </button>

                {showUserDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onMouseLeave={() => setShowUserDropdown(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('settings');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      Household & Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                Sign In
              </button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          <div className="py-2 text-xs font-medium text-slate-500 flex items-center justify-between border-b border-slate-100 mb-2">
            <span>Household: {activeHome?.name || 'Default'}</span>
            <span className="text-[11px] text-emerald-800">
              {user ? `Signed in as ${user.name}` : 'Not signed in'}
            </span>
          </div>
          {navLinks.map((tab) => {
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onSelectTab(tab.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center gap-3 ${
                  isActive
                    ? 'text-emerald-950 bg-emerald-50/80 font-semibold'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className={isActive ? 'text-emerald-700' : 'text-slate-400'}>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
