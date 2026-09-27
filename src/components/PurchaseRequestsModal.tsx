import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  AlertCircle,
  DollarSign,
  User,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { PurchaseRequest } from '../types';

interface PurchaseRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseAdded?: () => void;
}

export const PurchaseRequestsModal: React.FC<PurchaseRequestsModalProps> = ({
  isOpen,
  onClose,
  onExpenseAdded,
}) => {
  const { activeHome, user, formatAmount } = useAuth();

  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Request Form state
  const [isAdding, setIsAdding] = useState(false);
  const [itemName, setItemName] = useState('');
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Check if current user is admin/editor vs viewer
  const userRole = activeHome?.role || 'admin';
  const canApprove = userRole === 'admin' || userRole === 'editor';

  const loadRequests = async () => {
    if (!activeHome?.id) return;
    setLoading(true);
    try {
      const data = await api.getPurchaseRequests(activeHome.id);
      setRequests(data);
    } catch (err: unknown) {
      console.warn('Failed to load purchase requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeHome?.id) {
      loadRequests();
    }
  }, [isOpen, activeHome?.id]);

  if (!isOpen) return null;

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!itemName.trim()) {
      setErrorMsg('Please enter an item name.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createPurchaseRequest(activeHome!.id, {
        item_name: itemName.trim(),
        estimated_amount: estimatedAmount ? parseFloat(estimatedAmount) : undefined,
        notes: notes.trim() || undefined,
      });

      setItemName('');
      setEstimatedAmount('');
      setNotes('');
      setIsAdding(false);
      setSuccessMsg('Your request has been submitted to household admins!');
      loadRequests();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await api.acceptPurchaseRequest(activeHome!.id, requestId);
      setSuccessMsg('Item marked as purchased and added to household expenses!');
      loadRequests();
      if (onExpenseAdded) onExpenseAdded();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to accept request.');
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.rejectPurchaseRequest(activeHome!.id, requestId);
      setSuccessMsg('Request marked as rejected.');
      loadRequests();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to reject request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E4DA] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-[#F0ECE4] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#232038] text-[#F6C343] flex items-center justify-center font-bold shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif-display text-lg font-bold text-[#232038]">
                Household Purchase Requests
              </h3>
              <p className="text-xs text-slate-500">
                {canApprove
                  ? 'Review and approve items requested by household members'
                  : 'Request items or groceries for the home admin to buy'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Action to create new request */}
          {!isAdding ? (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-3 px-4 border-2 border-dashed border-[#E8E4DA] hover:border-[#232038] rounded-2xl text-xs font-bold text-slate-700 hover:text-[#232038] bg-[#FAF8F5] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#F6C343]" />
              <span>Request a New Item to Buy</span>
            </button>
          ) : (
            <form
              onSubmit={handleCreateRequest}
              className="p-4 rounded-2xl bg-[#FAF8F5] border border-slate-200 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  New Item Request
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Item Name (e.g. Dish soap, Oat milk, Air filters)"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#232038] font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Est. Amount (e.g. 150)"
                    value={estimatedAmount}
                    onChange={(e) => setEstimatedAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#232038]"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Store / Notes (e.g. Blinkit)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#232038]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#232038] hover:bg-[#181627] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          )}

          {/* List of requests */}
          <div className="space-y-2.5 pt-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Recent Requests ({requests.length})
            </div>

            {loading && requests.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8 bg-[#FAF8F5] rounded-2xl border border-[#E8E4DA] text-xs text-slate-500 space-y-1">
                <ShoppingBag className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                <div className="font-semibold text-slate-700">No requests yet</div>
                <div>Anyone in the household can request items needed for the home.</div>
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    req.status === 'accepted'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : req.status === 'rejected'
                      ? 'bg-slate-50 border-slate-200 opacity-60'
                      : 'bg-white border-[#E8E4DA] shadow-2xs'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {req.item_name}
                      </span>
                      {req.estimated_amount && (
                        <span className="text-xs font-mono font-bold text-[#232038] bg-slate-100 px-2 py-0.5 rounded-md shrink-0">
                          {formatAmount(req.estimated_amount)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{req.requested_by_name || 'Member'}</span>
                      </span>
                      {req.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate">{req.notes}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {req.status === 'pending' ? (
                      canApprove ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAccept(req.id)}
                            className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                            title="Accept and record purchase expense"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Buy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(req.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Reject request"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending Approval</span>
                        </span>
                      )
                    ) : req.status === 'accepted' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Purchased</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                        Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
