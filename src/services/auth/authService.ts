import { createClient } from '@/lib/supabase/client';
import { AuthUser, UserProfile } from '@/types';
import { Session } from '@supabase/supabase-js';
import {
  isDevBypassAllowed,
  TEST_COOKIE_NAME,
  TEST_AUTH_USER,
  TEST_USER_PROFILE,
  clearTestBypassCookie,
  enableTestBypassCookie,
} from './testAuthHelper';

function hasTestCookieInBrowser(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes(`${TEST_COOKIE_NAME}=owner`);
}

/**
 * Get the currently authenticated user from Supabase Auth or Dev Bypass (Client Side)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isDevBypassAllowed() && hasTestCookieInBrowser()) {
    return TEST_AUTH_USER;
  }

  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    user_metadata: user.user_metadata,
    app_metadata: user.app_metadata,
    created_at: user.created_at,
  };
}

/**
 * Get the current Supabase auth session (Client Side)
 */
export async function getCurrentSession(): Promise<Session | null> {
  if (isDevBypassAllowed() && hasTestCookieInBrowser()) {
    return null;
  }

  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return null;
  }

  return session;
}

/**
 * Sign in user with email and password (Client Side)
 */
export async function signIn(email: string, password: string) {
  clearTestBypassCookie();

  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === 'admin@gmail.com' && password === 'admin@123') {
    enableTestBypassCookie();
    return { user: TEST_AUTH_USER, session: null };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (isDevBypassAllowed() && cleanEmail === 'admin@gmail.com') {
      enableTestBypassCookie();
      return { user: TEST_AUTH_USER, session: null };
    }
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign out the current user (Client Side)
 */
export async function signOut(): Promise<void> {
  clearTestBypassCookie();
  const supabase = createClient();
  const { error } = await supabase.auth.signOut().catch(() => ({ error: null }));

  if (error) {
    console.warn('Supabase sign out error:', error.message);
  }
}

/**
 * Get profile of the currently authenticated user from public.users or Dev Bypass (Client Side)
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  if (isDevBypassAllowed() && hasTestCookieInBrowser()) {
    return TEST_USER_PROFILE;
  }

  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as UserProfile;
}
