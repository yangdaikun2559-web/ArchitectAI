import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { api } from './api';

export interface LocalUserSession extends UserProfile {
  uid: string;
}

interface AuthContextType {
  user: LocalUserSession | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  registerLocal: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  loginLocal: (username: string, password: string) => Promise<void>;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<LocalUserSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('aiot_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as UserProfile;
        const session: LocalUserSession = {
          ...parsed,
          uid: parsed.userId,
        };
        setUser(session);
        setProfile(parsed);
      } catch (err) {
        console.error("Failed to restore session from localStorage:", err);
      }
    }
    setLoading(false);
  }, []);

  const loginLocal = async (username: string, password: string) => {
    const res = await api.auth.login(username, password);
    if (res && res.user) {
      const uProfile = res.user as UserProfile;
      const session: LocalUserSession = {
        ...uProfile,
        uid: uProfile.userId,
      };
      setUser(session);
      setProfile(uProfile);
      localStorage.setItem('aiot_profile', JSON.stringify(uProfile));
    } else {
      throw new Error("登录请求未返回有效用户数据。");
    }
  };

  const registerLocal = async (username: string, email: string, password: string, displayName: string) => {
    const res = await api.auth.register(username, email, password, displayName);
    if (res && res.user) {
      const uProfile = res.user as UserProfile;
      const session: LocalUserSession = {
        ...uProfile,
        uid: uProfile.userId,
      };
      setUser(session);
      setProfile(uProfile);
      localStorage.setItem('aiot_profile', JSON.stringify(uProfile));
    } else {
      throw new Error("注册请求未返回有效用户数据。");
    }
  };

  const signIn = async () => {
    setShowLoginModal(true);
  };

  const signOut = async () => {
    setUser(null);
    setProfile(null);
    localStorage.removeItem('aiot_profile');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      signIn, 
      signOut, 
      registerLocal, 
      loginLocal,
      showLoginModal,
      setShowLoginModal
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
