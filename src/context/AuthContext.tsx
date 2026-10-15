import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserProfile, AcademySettings } from '../types';
import { api, getStoredToken, setStoredToken, removeStoredToken } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  settings: AcademySettings | null;
  hasOwner: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  isOwner: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  isPending: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [settings, setSettings] = useState<AcademySettings | null>(null);
  const [hasOwner, setHasOwner] = useState<boolean>(true);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  }, []);

  const checkOwner = useCallback(async () => {
    try {
      const res = await api.checkOwnerExists();
      setHasOwner(res.hasOwner);
    } catch {
      setHasOwner(true);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      console.warn('Session invalid or expired:', err);
      removeStoredToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
    checkOwner();
    refreshUser();
  }, [refreshSettings, checkOwner, refreshUser]);

  const login = (newToken: string, newUser: UserProfile) => {
    setStoredToken(newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  };

  const isOwner = user?.role === 'owner';
  const isAdmin = user?.role === 'admin' || user?.role === 'owner';
  const isTeacher = user?.role === 'teacher' || user?.role === 'owner' || user?.role === 'admin';
  const isStudent = user?.role === 'student';
  const isPending = user?.status === 'pending';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        settings,
        hasOwner,
        login,
        logout,
        refreshUser,
        refreshSettings,
        isOwner,
        isAdmin,
        isTeacher,
        isStudent,
        isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
