import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, Home, PhoneVerifyResponse, SetupMemberInput, HomeMember } from '../types';
import { api, getStoredToken, setStoredToken } from '../api';
import { getDeviceId, getDeviceName } from '../utils/device';

interface AuthContextType {
  user: User | null;
  homes: Home[];
  activeHome: Home | null;
  loading: boolean;
  currencySymbol: string;
  deviceId: string;
  deviceName: string;
  sessionRevokedMessage: string | null;
  clearSessionRevokedMessage: () => void;
  setActiveHomeId: (id: string) => void;
  sendPhoneOtp: (phone: string) => Promise<{ success: boolean; message: string; devOtp?: string; isExistingUser?: boolean; existingName?: string }>;
  verifyPhoneOtp: (phone: string, otp: string, name?: string) => Promise<PhoneVerifyResponse>;
  resolvePhoneConflict: (conflictToken: string, action: 'continue' | 'cancel') => Promise<{ success?: boolean; cancelled?: boolean; message?: string }>;
  setupNewHome: (payload: {
    homeName: string;
    currencySymbol?: string;
    currencyCode?: string;
    members?: SetupMemberInput[];
  }) => Promise<{ success: boolean; home: Home; members: HomeMember[] }>;
  updateProfile: (name: string, avatar_color?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  formatAmount: (amount: number) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [homes, setHomes] = useState<Home[]>([]);
  const [activeHomeId, setActiveHomeIdState] = useState<string | null>(() => {
    return localStorage.getItem('home_manager_active_home_id');
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [sessionRevokedMessage, setSessionRevokedMessage] = useState<string | null>(null);

  const deviceId = getDeviceId();
  const deviceName = getDeviceName();

  const clearSessionRevokedMessage = () => {
    setSessionRevokedMessage(null);
  };

  const handleRevocation = useCallback((msg?: string) => {
    const message = msg || 'You have been logged out because your account was signed in on another device.';
    setStoredToken(null);
    setUser(null);
    setHomes([]);
    setActiveHomeIdState(null);
    localStorage.removeItem('home_manager_active_home_id');
    setSessionRevokedMessage(message);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setHomes(data.homes);

      if (data.homes && data.homes.length > 0) {
        const exists = data.homes.find((h) => h.id === activeHomeId);
        if (!exists) {
          const firstId = data.homes[0].id;
          setActiveHomeIdState(firstId);
          localStorage.setItem('home_manager_active_home_id', firstId);
        }
      }
    } catch (err: unknown) {
      if ((err as { isSessionRevoked?: boolean })?.isSessionRevoked) {
        handleRevocation();
      } else {
        setUser(null);
        setHomes([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeHomeId, handleRevocation]);

  // Listen for global custom event dispatched from api.ts on 401 SESSION_REVOKED
  useEffect(() => {
    const onRevokedEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      handleRevocation(customEvent.detail?.message);
    };

    window.addEventListener('hm:session-revoked', onRevokedEvent);
    return () => {
      window.removeEventListener('hm:session-revoked', onRevokedEvent);
    };
  }, [handleRevocation]);

  // Periodic heartbeat session checking (every 3.5 seconds)
  const isCheckingSessionRef = useRef(false);
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      if (isCheckingSessionRef.current) return;
      isCheckingSessionRef.current = true;
      try {
        await api.checkSessionStatus();
      } catch (err: unknown) {
        if ((err as { isSessionRevoked?: boolean })?.isSessionRevoked) {
          handleRevocation((err as Error).message);
        }
      } finally {
        isCheckingSessionRef.current = false;
      }
    };

    const interval = setInterval(checkSession, 3500);

    // Also check immediately when window gains focus or tab becomes visible
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    window.addEventListener('focus', onVisibilityOrFocus);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onVisibilityOrFocus);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
    };
  }, [user, handleRevocation]);

  // Initial Auth Check
  useEffect(() => {
    const handleInitialAuth = async () => {
      const token = getStoredToken();
      if (token) {
        refreshMe();
      } else {
        setLoading(false);
      }
    };

    handleInitialAuth();
  }, [refreshMe]);

  const setActiveHomeId = (id: string) => {
    setActiveHomeIdState(id);
    localStorage.setItem('home_manager_active_home_id', id);
  };

  const sendPhoneOtp = async (phone: string) => {
    return api.sendPhoneOtp(phone);
  };

  const verifyPhoneOtp = async (phone: string, otp: string, name?: string): Promise<PhoneVerifyResponse> => {
    setLoading(true);
    try {
      const currentDevId = getDeviceId();
      const currentDevName = getDeviceName();
      const res = await api.verifyPhoneOtp(phone, otp, name, currentDevId, currentDevName);
      if (res.conflict) {
        // Do not set user, return conflict payload to show prompt to user
        return res;
      }
      if (res.user && res.token) {
        setUser(res.user);
        const userHomes = res.homes || [];
        setHomes(userHomes);
        if (userHomes.length > 0) {
          setActiveHomeId(userHomes[0].id);
        }
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const setupNewHome = async (payload: {
    homeName: string;
    currencySymbol?: string;
    currencyCode?: string;
    members?: SetupMemberInput[];
  }) => {
    setLoading(true);
    try {
      const res = await api.setupNewHome(payload);
      if (res.home) {
        setHomes((prev) => [res.home, ...prev]);
        setActiveHomeId(res.home.id);
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const resolvePhoneConflict = async (
    conflictToken: string,
    action: 'continue' | 'cancel'
  ): Promise<{ success?: boolean; cancelled?: boolean; message?: string }> => {
    setLoading(true);
    try {
      const currentDevId = getDeviceId();
      const currentDevName = getDeviceName();
      const res = await api.resolvePhoneConflict(conflictToken, action, currentDevId, currentDevName);
      if (action === 'continue' && res.user && res.token) {
        setUser(res.user);
        const userHomes = res.homes || [];
        setHomes(userHomes);
        if (userHomes.length > 0) {
          setActiveHomeId(userHomes[0].id);
        }
      }
      return res;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (name: string, avatar_color?: string) => {
    const res = await api.updateProfile(name, avatar_color);
    if (res.user) {
      setUser((prev) => (prev ? { ...prev, name: res.user.name, avatar_color: res.user.avatar_color } : prev));
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setStoredToken(null);
      setUser(null);
      setHomes([]);
      setActiveHomeIdState(null);
      localStorage.removeItem('home_manager_active_home_id');
    }
  };

  const activeHome = homes.find((h) => h.id === activeHomeId) || homes[0] || null;
  const currencySymbol = activeHome?.currency_symbol || '₹';

  const formatAmount = (amount: number): string => {
    if (isNaN(amount) || amount === null || amount === undefined) return `${currencySymbol}0`;
    const parts = Math.round(amount).toLocaleString('en-IN');
    return `${currencySymbol}${parts}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        homes,
        activeHome,
        loading,
        currencySymbol,
        deviceId,
        deviceName,
        sessionRevokedMessage,
        clearSessionRevokedMessage,
        setActiveHomeId,
        sendPhoneOtp,
        verifyPhoneOtp,
        resolvePhoneConflict,
        setupNewHome,
        updateProfile,
        logout,
        refreshMe,
        formatAmount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
