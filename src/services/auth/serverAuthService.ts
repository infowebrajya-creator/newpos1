import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { AuthUser, UserProfile } from '@/types';
import {
  isDevBypassAllowed,
  TEST_COOKIE_NAME,
  TEST_AUTH_USER,
  TEST_USER_PROFILE,
} from './testAuthHelper';

/**
 * Get the currently authenticated user from Supabase Auth or Dev Bypass (Server Side)
 */
export async function getServerCurrentUser(): Promise<AuthUser | null> {
  if (isDevBypassAllowed()) {
    const cookieStore = await cookies();
    if (cookieStore.get(TEST_COOKIE_NAME)?.value === 'owner') {
      return TEST_AUTH_USER;
    }
  }

  const supabase = await createClient();
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
 * Get profile of the currently authenticated user from public.users or Dev Bypass (Server Side)
 */
export async function getServerCurrentUserProfile(): Promise<UserProfile | null> {
  if (isDevBypassAllowed()) {
    const cookieStore = await cookies();
    if (cookieStore.get(TEST_COOKIE_NAME)?.value === 'owner') {
      return TEST_USER_PROFILE;
    }
  }

  const user = await getServerCurrentUser();
  if (!user) {
    return null;
  }

  const supabase = await createClient();
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
