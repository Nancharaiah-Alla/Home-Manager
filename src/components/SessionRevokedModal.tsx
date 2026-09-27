import React from 'react';
import { ShieldAlert, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SessionRevokedModalProps {
  onOpenPhoneAuth?: () => void;
}

export const SessionRevokedModal: React.FC<SessionRevokedModalProps> = ({ onOpenPhoneAuth }) => {
  const { sessionRevokedMessage, clearSessionRevokedMessage } = useAuth();

  if (!sessionRevokedMessage) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E4DA] rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-5 text-center relative">
        <div className="w-14 h-14 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-7 h-7 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h3 className="font-serif-display text-xl font-bold text-[#232038]">
            Session Disconnected
          </h3>
          <p className="text-sm font-semibold text-slate-800 leading-snug px-2">
            “You have been logged out because your account was signed in on another device.”
          </p>
          <p className="text-xs text-slate-500 leading-relaxed px-4 pt-1">
            Single-device security has transferred active authorization to your other device. All your cloud-stored expenses, categories, and household budgets are safe and unchanged.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={clearSessionRevokedMessage}
            className="w-full py-3 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-colors cursor-pointer"
          >
            Acknowledge
          </button>
          {onOpenPhoneAuth && (
            <button
              type="button"
              onClick={() => {
                clearSessionRevokedMessage();
                onOpenPhoneAuth();
              }}
              className="w-full py-3 px-4 text-xs font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-2xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>Sign In Here Again</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#F6C343]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
