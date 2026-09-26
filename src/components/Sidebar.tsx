import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutGrid,
  CreditCard,
  CalendarCheck,
  Wallet,
  BarChart2,
  Settings,
  ChevronDown,
  LogOut,
  Plus,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'expenses' | 'recurring' | 'limits' | 'reports' | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  onNavigateLanding?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpenMobile,
  onCloseMobile,
  onNavigateLanding,
}) => {
  const { user, homes, activeHome, setActiveHomeId, logout } = useAuth();
  const [showHomeDropdown, setShowHomeDropdown] = useState(false);

  const navLinks: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Overview',
      icon: <LayoutGrid className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: <CreditCard className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: 'recurring',
      label: 'Recurring',
      icon: <CalendarCheck className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: 'limits',
      label: 'Category limits',
      icon: <Wallet className="w-5 h-5 stroke-[1.8]" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart2 className="w-5 h-5 stroke-[1.8]" />,
    },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#232038] text-white flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Part: Brand, Home Picker, Primary Nav */}
        <div className="p-6">
          {/* Brand Header */}
          <button
            type="button"
            onClick={onNavigateLanding || (() => handleNavClick('dashboard'))}
            className="w-full flex items-center gap-3.5 mb-8 text-left group cursor-pointer"
          >
            {/* Warm gold house icon */}
            <div className="w-11 h-11 rounded-2xl bg-[#F6C343] group-hover:bg-[#EAB635] flex items-center justify-center shrink-0 shadow-sm transition-colors">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#232038"
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6"
              >
                <path d="M3 10.5 12 3l9 7.5v10.5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
                <path d="M9 22V12h6v10" />
              </svg>
            </div>

            <div>
              <div className="font-serif-display text-white text-[19px] leading-[1.15] font-bold tracking-tight">
                Home
              </div>
              <div className="font-serif-display text-white text-[19px] leading-[1.15] font-bold tracking-tight">
                Manager
              </div>
              <div className="text-[12px] text-[#9D99B5] tracking-tight mt-0.5 font-normal">
                The Household Ledger
              </div>
            </div>
          </button>

          {/* YOUR HOME Section */}
          <div className="mb-7">
            <div className="text-[11px] font-bold text-[#837F9D] uppercase tracking-wider mb-2.5 px-1">
              Your Home
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowHomeDropdown(!showHomeDropdown)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#2E2A48] transition-colors text-left group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-[#393454] text-[#D8D4EE] font-bold text-xs flex items-center justify-center shrink-0">
                    {activeHome?.name?.charAt(0).toUpperCase() || 'H'}
                  </div>
                  <span className="text-[14px] font-semibold text-white truncate">
                    {activeHome?.name || 'Shared home'}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-[#837F9D] group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* Household switcher popup */}
              {showHomeDropdown && (
                <div
                  className="absolute left-0 right-0 mt-1.5 bg-[#2E2A48] border border-[#3E395F] rounded-xl shadow-xl py-1.5 z-50 text-xs"
                  onMouseLeave={() => setShowHomeDropdown(false)}
                >
                  <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#837F9D] tracking-wider">
                    Switch Household
                  </div>
                  {homes.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => {
                        setActiveHomeId(h.id);
                        setShowHomeDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-[#383355] ${
                        h.id === activeHome?.id
                          ? 'text-white font-semibold bg-[#383355]'
                          : 'text-[#B4B0CB]'
                      }`}
                    >
                      <span className="truncate">{h.name}</span>
                      {h.id === activeHome?.id && (
                        <span className="text-[10px] text-[#F6C343] font-medium">Active</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-[#3E395F] mt-1 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab('settings');
                        setShowHomeDropdown(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-[#B4B0CB] hover:text-white hover:bg-[#383355]"
                    >
                      + Manage homes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Primary Navigation Links */}
          <nav className="space-y-1.5">
            {navLinks.map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleNavClick(tab.id)}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-[#383354] text-white shadow-2xs font-semibold'
                      : 'text-[#9D99B5] hover:text-white hover:bg-[#2C2945]'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-[#8E8AAB]'}>
                    {tab.icon}
                  </span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Part: Settings & User Profile */}
        <div className="p-6 border-t border-[#2F2B48] space-y-2">
          {/* Settings */}
          <button
            onClick={() => handleNavClick('settings')}
            className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
              currentTab === 'settings'
                ? 'bg-[#383354] text-white font-semibold'
                : 'text-[#9D99B5] hover:text-white hover:bg-[#2C2945]'
            }`}
          >
            <Settings className="w-5 h-5 stroke-[1.8]" />
            <span>Settings</span>
          </button>

          {/* User Sign-out or quick status */}
          {user ? (
            <div className="pt-2 flex items-center justify-between px-2 text-xs text-[#837F9D]">
              <span className="truncate max-w-[130px] font-medium text-[#B4B0CB]">
                {user.name}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  if (onNavigateLanding) onNavigateLanding();
                }}
                className="text-xs text-[#9D99B5] hover:text-rose-400 p-1 transition-colors cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
};
