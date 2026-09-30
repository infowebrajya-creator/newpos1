'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUser, UserProfile } from '@/types';
import { getCurrentUser, getCurrentUserProfile, signOut as serviceSignOut } from '@/services/auth/authService';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({
  children,
  initialUser = null,
  initialProfile = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
  initialProfile?: UserProfile | null;
}) {
  const [user, setUser] = useState<AuthUser | null>(initialUser);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState<boolean>(!initialUser || !initialProfile);
  const router = useRouter();

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        return;
      }
      setUser(currentUser);
      const userProfile = await getCurrentUserProfile();
      setProfile(userProfile);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUser || !initialProfile) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, [initialUser, initialProfile, loadUserData]);

  const signOut = async () => {
    try {
      await serviceSignOut();
    } finally {
      setUser(null);
      setProfile(null);
      router.push('/login');
      router.refresh();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        refreshProfile: loadUserData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within an AuthProvider');
  }
  return context;
}
