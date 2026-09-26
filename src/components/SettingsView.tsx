import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { HomeMember, MemberRole } from '../types';
import {
  Home,
  Users,
  Shield,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Coins,
  Settings,
  Mail,
  UserPlus,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { activeHome, homes, refreshMe, setActiveHomeId, user } = useAuth();

  const [homeName, setHomeName] = useState(activeHome?.name || '');
  const [currencySymbol, setCurrencySymbol] = useState(activeHome?.currency_symbol || '₹');
  const [currencyCode, setCurrencyCode] = useState(activeHome?.currency_code || 'INR');
  const [members, setMembers] = useState<HomeMember[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Invite Member Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNickname, setInviteNickname] = useState('');
  const [inviteRole, setInviteRole] = useState<MemberRole>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Create New Household Modal State
  const [isNewHomeModalOpen, setIsNewHomeModalOpen] = useState(false);
  const [newHomeName, setNewHomeName] = useState('');
  const [newHomeCurrency, setNewHomeCurrency] = useState('₹');

  useEffect(() => {
    if (activeHome) {
      setHomeName(activeHome.name);
      setCurrencySymbol(activeHome.currency_symbol || '₹');
      setCurrencyCode(activeHome.currency_code || 'INR');
      fetchMembers();
    }
  }, [activeHome]);

  const fetchMembers = async () => {
    if (!activeHome) return;
    try {
      const details = await api.getHomeDetails(activeHome.id);
      if (details.members) setMembers(details.members);
    } catch (err) {
      console.error('Failed fetching household members:', err);
    }
  };

  const handleUpdateHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHome) return;
    setIsSaving(true);
    setMessage(null);
    try {
      await api.updateHome(activeHome.id, homeName.trim(), currencySymbol, currencyCode);
      await refreshMe();
      setMessage('Household settings updated successfully.');
      setTimeout(() => setMessage(null), 3000);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update household');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeHome) return;
    setIsInviting(true);
    setInviteError(null);
    try {
      await api.addMember(activeHome.id, inviteEmail.trim(), inviteRole, inviteNickname.trim() || undefined);
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInviteNickname('');
      await fetchMembers();
      await refreshMe();
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to add member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!activeHome) return;
    try {
      await api.removeMember(activeHome.id, memberId);
      await fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const handleCreateNewHome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHomeName.trim()) return;
    try {
      const newHome = await api.createHome(newHomeName.trim(), newHomeCurrency, 'INR');
      await refreshMe();
      setActiveHomeId(newHome.id);
      setIsNewHomeModalOpen(false);
      setNewHomeName('');
    } catch (err) {
      console.error('Failed to create new household:', err);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Household Settings
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Configure {activeHome?.name || 'Home'}, members, roles, and currency preferences
          </p>
        </div>

        <button
          onClick={() => setIsNewHomeModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors self-start sm:self-auto"
        >
          <Home className="w-3.5 h-3.5 text-slate-500" />
          <span>+ Create New Household</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-700" />
          <span>{message}</span>
        </div>
      )}

      {/* Household Profile Card */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4 text-emerald-700" />
          <span>General Household Details</span>
        </h2>

        <form onSubmit={handleUpdateHome} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Household / Home Name
              </label>
              <input
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                placeholder="e.g. My Home, Sharma Household, Green Villa"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Currency Symbol
              </label>
              <select
                value={currencySymbol}
                onChange={(e) => {
                  setCurrencySymbol(e.target.value);
                  if (e.target.value === '₹') setCurrencyCode('INR');
                  if (e.target.value === '$') setCurrencyCode('USD');
                  if (e.target.value === '€') setCurrencyCode('EUR');
                  if (e.target.value === '£') setCurrencyCode('GBP');
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="₹">₹ - Indian Rupee (INR)</option>
                <option value="$">$ - US Dollar (USD)</option>
                <option value="€">€ - Euro (EUR)</option>
                <option value="£">£ - British Pound (GBP)</option>
                <option value="AED">AED - UAE Dirham</option>
                <option value="S$">S$ - Singapore Dollar</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Household Members Management */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              <span>Household Members & Permissions</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Support parents, couples, roommates, and family contributors under one household
            </p>
          </div>

          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>
        </div>

        {/* Member List */}
        <div className="divide-y divide-slate-100">
          {members.map((m) => {
            const isMainAdmin = Boolean(
              (activeHome?.created_by_user_id && m.user_id === activeHome.created_by_user_id) ||
              m.role === 'admin'
            );
            const isDeletable = !isMainAdmin && (m.role === 'member' || m.role === 'viewer');

            return (
              <div key={m.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full text-white font-bold flex items-center justify-center text-xs shadow-2xs"
                    style={{ backgroundColor: m.color || m.avatar_color || '#2563EB' }}
                  >
                    {(m.nickname || m.name || 'M').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{m.name}</span>
                      {m.nickname && m.nickname !== m.name && (
                        <span className="text-slate-400">({m.nickname})</span>
                      )}
                      {user?.id === m.user_id && (
                        <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                          You
                        </span>
                      )}
                      {isMainAdmin && (
                        <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.5 rounded font-medium">
                          Main Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">{m.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-md capitalize ${
                    isMainAdmin
                      ? 'bg-amber-100/70 text-amber-900 font-semibold'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {isMainAdmin ? 'Main Admin' : m.role}
                  </span>

                  {/* Delete/Dustbin icon: KEPT for members and viewers, REMOVED behind main admin */}
                  {isDeletable ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                      title={`Remove ${m.name} (${m.role}) from household`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Role Permissions Reference */}
        <div className="mt-6 p-4 bg-slate-50/70 rounded-lg border border-slate-200/80 text-[11px] text-slate-600 space-y-2">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Role Permissions Reference</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div>
              <span className="font-bold text-slate-900">Admin:</span> Full control over household
              settings, inviting members, managing limits, and all expenses.
            </div>
            <div>
              <span className="font-bold text-slate-900">Member:</span> Record everyday expenses,
              mark recurring bills as paid, edit own expenses.
            </div>
            <div>
              <span className="font-bold text-slate-900">Viewer:</span> Read-only visibility into
              household spending, reports, and limits.
            </div>
          </div>
        </div>
      </div>

      {/* Switch Household Section */}
      <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-2">Your Registered Households</h2>
        <p className="text-xs text-slate-500 mb-4">
          Switch between separate homes or properties (e.g. Primary Residence, Vacation Home)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {homes.map((h) => {
            const isCurrent = h.id === activeHome?.id;
            return (
              <div
                key={h.id}
                onClick={() => setActiveHomeId(h.id)}
                className={`p-3.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-all ${
                  isCurrent
                    ? 'border-emerald-700 bg-emerald-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="font-semibold text-slate-900">{h.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Currency: {h.currency_symbol} · Role: {h.role || 'Admin'}
                  </div>
                </div>
                {isCurrent ? (
                  <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                    Active
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 hover:text-slate-900">
                    Switch →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Add Household Member</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add a partner, roommate, parent, or family contributor to {activeHome?.name}.
            </p>

            {inviteError && (
              <div className="p-2.5 mb-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteMember} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Member Email</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. partner@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nickname / Display Name
                </label>
                <input
                  type="text"
                  value={inviteNickname}
                  onChange={(e) => setInviteNickname(e.target.value)}
                  placeholder="e.g. Priya, Dad, Roommate Alex"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Household Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="member">Member (Can add & edit expenses)</option>
                  <option value="admin">Admin (Can manage settings & limits)</option>
                  <option value="viewer">Viewer (Read-only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                >
                  {isInviting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Household Modal */}
      {isNewHomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Create New Household</h3>
            <p className="text-xs text-slate-500 mb-4">
              Add another home, apartment, or shared flat to manage.
            </p>

            <form onSubmit={handleCreateNewHome} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Household Name</label>
                <input
                  type="text"
                  value={newHomeName}
                  onChange={(e) => setNewHomeName(e.target.value)}
                  placeholder="e.g. Vacation Villa, Flat 402"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                <select
                  value={newHomeCurrency}
                  onChange={(e) => setNewHomeCurrency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="₹">₹ - Indian Rupee</option>
                  <option value="$">$ - US Dollar</option>
                  <option value="€">€ - Euro</option>
                  <option value="£">£ - British Pound</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewHomeModalOpen(false)}
                  className="px-3 py-2 font-medium text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-2xs"
                >
                  Create Household
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
