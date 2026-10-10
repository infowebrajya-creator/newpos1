'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AuthUser, UserProfile } from '@/types';
import { getCurrentUser, getCurrentUserProfile, signOut as serviceSignOut } from '@/services/auth/authService';
import { TEST_AUTH_USER, TEST_USER_PROFILE } from '@/services/auth/testAuthHelper';
import { useRouter } from '@/lib/navigation';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: TEST_AUTH_USER,
  profile: TEST_USER_PROFILE,
  loading: false,
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
  const [user, setUser] = useState<AuthUser | null>(initialUser || TEST_AUTH_USER);
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || TEST_USER_PROFILE);
  const [loading, setLoading] = useState<boolean>(false);
  const router = useRouter();

  const loadUserData = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await getCurrentUserProfile();
        setProfile(userProfile || TEST_USER_PROFILE);
      }
    } catch {
      // Keep fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialUser || !initialProfile) {
      loadUserData();
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
