import React, { useState, useEffect } from 'react';
import {
  Phone,
  ArrowRight,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Sparkles,
  KeyRound,
  Laptop,
  User,
  Home as HomeIcon,
  LogIn,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { rotateDeviceIdForSimulation } from '../utils/device';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'start_home' | 'sign_in';
  onOpenSetup?: () => void;
}

export const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'start_home',
  onOpenSetup,
}) => {
  const {
    sendPhoneOtp,
    verifyPhoneOtp,
    resolvePhoneConflict,
    deviceName,
  } = useAuth();

  const [authMode, setAuthMode] = useState<'start_home' | 'sign_in'>(initialMode);
  const [step, setStep] = useState<'phone' | 'otp' | 'conflict'>('phone');
  const [userName, setUserName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('+91 98765 43210');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthMode(initialMode);
      setStep('phone');
      setErrorMsg(null);
      setSuccessNotice(null);
      setOtpCode('');
    }
  }, [isOpen, initialMode]);

  // Conflict state
  const [conflictData, setConflictData] = useState<{
    conflictToken: string;
    currentDevice: string;
    message: string;
  } | null>(null);

  // Countdown for resend
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    if (authMode === 'start_home' && !userName.trim()) {
      setErrorMsg('Please enter your name to start a new home.');
      return;
    }

    const clean = phoneNumber.replace(/[\s\-()]/g, '');
    if (clean.length < 8) {
      setErrorMsg('Please enter a valid phone number (at least 10 digits).');
      return;
    }

    setLoading(true);
    try {
      const res = await sendPhoneOtp(clean);
      const code = res.devOtp || '123456';
      setDevOtp(code);
      setOtpCode(code);
      setSuccessNotice(`Verification code sent to ${clean}`);
      setStep('otp');
      setCountdown(30);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessNotice(null);

    const codeToVerify = (otpCode || devOtp || '123456').trim();
    if (!codeToVerify || codeToVerify.length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const clean = phoneNumber.replace(/[\s\-()]/g, '');
      const res = await verifyPhoneOtp(
        clean,
        codeToVerify,
        authMode === 'start_home' ? userName.trim() : undefined
      );

      if (res.conflict && res.conflictToken) {
        // Concurrency conflict detected!
        setConflictData({
          conflictToken: res.conflictToken,
          currentDevice: res.currentDevice || 'Another device',
          message:
            res.message ||
            'You’re currently logged in on another device. Do you want to log out there and continue here?',
        });
        setStep('conflict');
      } else {
        // Logged in successfully!
        onClose();
        // If this was a new user or "start_home" mode without prior homes, open setup window
        if (res.isNewUser || (authMode === 'start_home' && (!res.homes || res.homes.length === 0))) {
          if (onOpenSetup) {
            setTimeout(onOpenSetup, 150);
          }
        }
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Invalid verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConflictResolve = async (action: 'continue' | 'cancel') => {
    if (!conflictData) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      const res = await resolvePhoneConflict(conflictData.conflictToken, action);
      if (action === 'continue') {
        onClose();
        if (authMode === 'start_home' && onOpenSetup) {
          setTimeout(onOpenSetup, 150);
        }
      } else {
        // User cancelled; return to step 1
        setStep('phone');
        setConflictData(null);
        setOtpCode('');
        setSuccessNotice('Login cancelled. Your session on the previous device remains active.');
      }
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Failed to process session conflict.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#E8E4DA] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
        {/* Header with Mode Toggle Tabs */}
        <div className="p-6 pb-4 border-b border-[#F0ECE4] bg-[#FAF8F5]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#232038] text-[#F6C343] flex items-center justify-center font-bold shadow-xs">
                {authMode === 'start_home' ? (
                  <HomeIcon className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-serif-display text-lg font-bold text-[#232038]">
                  {step === 'conflict'
                    ? 'Active Session Detected'
                    : authMode === 'start_home'
                    ? 'Start a Home (New User)'
                    : 'Sign In (Existing User)'}
                </h3>
                <p className="text-xs text-slate-500">
                  {step === 'conflict'
                    ? 'Single-Device Protection Active'
                    : authMode === 'start_home'
                    ? 'Enter your name and phone to set up your home'
                    : 'Enter your phone number to access your account'}
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

          {/* Tab Selector between Start a Home (New user) vs Sign In / Login (Existing user) */}
          {step === 'phone' && (
            <div className="grid grid-cols-2 p-1 bg-slate-200/70 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('start_home');
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer text-center ${
                  authMode === 'start_home'
                    ? 'bg-white text-[#232038] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Start a Home</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('sign_in');
                  setErrorMsg(null);
                }}
                className={`py-2 rounded-lg transition-all cursor-pointer text-center ${
                  authMode === 'sign_in'
                    ? 'bg-white text-[#232038] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Sign In / Login</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success / Notice Banner */}
          {successNotice && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* STEP 1: PHONE FORM */}
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              {/* If New user / Start a Home, ask for Name + Phone */}
              {authMode === 'start_home' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full pl-10 pr-4 py-3 text-sm bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] font-medium"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Phone number input (both new and existing) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mobile Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-4 py-3 text-sm bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038] font-medium"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {authMode === 'start_home'
                    ? "We'll send a 6-digit OTP code to verify and launch your home setup."
                    : "We'll send a 6-digit OTP code to verify and access your account."}
                </p>
              </div>

              {/* Current Device Identifier Info */}
              <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DA] text-xs text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-500" />
                  <span>Logging in on: <strong>{deviceName}</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newId = rotateDeviceIdForSimulation();
                    setSuccessNotice(`Simulated New Device ID: ${newId.substring(0, 12)}...`);
                  }}
                  className="text-[10px] text-indigo-600 font-semibold hover:underline cursor-pointer"
                  title="Test login from a different device fingerprint"
                >
                  Simulate New Device
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Sending OTP...</span>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4 text-[#F6C343]" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                {authMode === 'start_home' ? (
                  <p className="text-xs text-slate-500">
                    Already have a home?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('sign_in')}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Sign In instead
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    New to Home Manager?{' '}
                    <button
                      type="button"
                      onClick={() => setAuthMode('start_home')}
                      className="text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      Start a Home
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {/* Test OTP Helper Box */}
              {devOtp && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Test OTP: <strong className="font-mono text-sm tracking-wider">{devOtp}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtp)}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg font-semibold text-[11px] cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    6-Digit Verification Code
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('phone')}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    Change details
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 text-center tracking-[0.4em] font-mono font-bold text-xl bg-[#FAF8F5] border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#232038]"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Didn't receive code?</span>
                {countdown > 0 ? (
                  <span className="font-mono font-bold text-slate-600">Resend in {countdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    className="text-indigo-600 font-semibold hover:underline cursor-pointer"
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-2xl shadow-sm hover:shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Verifying OTP...</span>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <CheckCircle2 className="w-4 h-4 text-[#F6C343]" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: CONFLICT DIALOG */}
          {step === 'conflict' && conflictData && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Single-Device Protection Alert</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-snug">
                  “You’re currently logged in on another device. Do you want to log out there and continue here?”
                </p>
                <div className="pt-2 text-xs text-slate-600 border-t border-amber-200/60 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Active Session: <strong>{conflictData.currentDevice}</strong></span>
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                To protect your household ledger, only one device can be active at a time.
                Selecting Continue will invalidate the other session and log you in here.
                All your cloud expenses remain intact.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleConflictResolve('cancel')}
                  disabled={loading}
                  className="py-3 px-4 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleConflictResolve('continue')}
                  disabled={loading}
                  className="py-3 px-4 text-sm font-semibold text-white bg-[#232038] hover:bg-[#181627] rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  {loading ? 'Switching...' : 'Continue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
