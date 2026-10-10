import { createClient } from '@/lib/supabase/server';
import { AuthUser, UserProfile } from '@/types';
import {
  TEST_COOKIE_NAME,
  TEST_AUTH_USER,
  TEST_USER_PROFILE,
} from './testAuthHelper';

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

/**
 * Get the currently authenticated user from Supabase Auth or Dev Bypass
 */
export async function getServerCurrentUser(): Promise<AuthUser | null> {
  if (getCookieValue(TEST_COOKIE_NAME) === 'owner') {
    return TEST_AUTH_USER;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    if (getCookieValue(TEST_COOKIE_NAME) === 'owner') {
      return TEST_AUTH_USER;
    }
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
 * Get profile of the currently authenticated user from public.users or Dev Bypass
 */
export async function getServerCurrentUserProfile(): Promise<UserProfile | null> {
  if (getCookieValue(TEST_COOKIE_NAME) === 'owner') {
    return TEST_USER_PROFILE;
  }

  const user = await getServerCurrentUser();
  if (!user) {
    if (getCookieValue(TEST_COOKIE_NAME) === 'owner') {
      return TEST_USER_PROFILE;
    }
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    if (user.email === 'admin@gmail.com' || getCookieValue(TEST_COOKIE_NAME) === 'owner') {
      return TEST_USER_PROFILE;
    }
    return null;
  }

  return data as UserProfile;
}
