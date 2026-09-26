import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Home } from '../types';
import { api, getStoredToken, setStoredToken } from '../api';
import {
  signInWithGoogleOAuth,
  checkGoogleRedirectResult,
  signOutGoogle,
} from '../utils/firebaseAuth';

interface AuthContextType {
  user: User | null;
  homes: Home[];
  activeHome: Home | null;
  loading: boolean;
  currencySymbol: string;
  setActiveHomeId: (id: string) => void;
  login: (email: string, pass: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  register: (email: string, pass: string, name: string, homeName?: string) => Promise<void>;
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

  const refreshMe = useCallback(async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setHomes(data.homes);

      if (data.homes && data.homes.length > 0) {
        // If current activeHomeId isn't valid, select first
        const exists = data.homes.find((h) => h.id === activeHomeId);
        if (!exists) {
          const firstId = data.homes[0].id;
          setActiveHomeIdState(firstId);
          localStorage.setItem('home_manager_active_home_id', firstId);
        }
      }
    } catch {
      setUser(null);
      setHomes([]);
    } finally {
      setLoading(false);
    }
  }, [activeHomeId]);

  useEffect(() => {
    const handleInitialAuth = async () => {
      // 1. Check if returning from a Google OAuth redirect
      try {
        const redirectCred = await checkGoogleRedirectResult();
        if (redirectCred) {
          const res = await api.loginGoogle(redirectCred);
          setUser(res.user);
          setHomes(res.homes);
          if (res.homes && res.homes.length > 0) {
            setActiveHomeId(res.homes[0].id);
          }
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Redirect auth check completed with error:', err);
      }

      // 2. Check existing token
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

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const res = await api.login(email, pass);
      setUser(res.user);
      setHomes(res.homes);
      if (res.homes && res.homes.length > 0) {
        setActiveHomeId(res.homes[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setLoading(true);
    try {
      // Step 1: Open Google's official account selection / login page
      const googleCred = await signInWithGoogleOAuth();
      // Step 2: Send verified credential to server to authenticate/create household
      const res = await api.loginGoogle(googleCred);
      setUser(res.user);
      setHomes(res.homes);
      if (res.homes && res.homes.length > 0) {
        setActiveHomeId(res.homes[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, pass: string, name: string, homeName?: string) => {
    setLoading(true);
    try {
      const res = await api.register(email, pass, name, homeName);
      setUser(res.user);
      const userHomes = res.homes && res.homes.length > 0 ? res.homes : (res.home ? [res.home] : []);
      setHomes(userHomes);
      if (userHomes.length > 0) {
        setActiveHomeId(userHomes[0].id);
      }
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
      await signOutGoogle();
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
        setActiveHomeId,
        login,
        loginGoogle,
        register,
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
