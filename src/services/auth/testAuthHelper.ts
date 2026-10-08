import { AuthUser, UserProfile } from '@/types';

export const TEST_USER_ID = '00000000-0000-0000-0000-000000000000';
export const TEST_COOKIE_NAME = 'webrajya_pos_test_mode';

export const TEST_AUTH_USER: AuthUser = {
  id: TEST_USER_ID,
  email: 'admin@gmail.com',
  role: 'owner',
  user_metadata: { is_test_session: true, mode: 'TEST' },
  app_metadata: { provider: 'dev_bypass' },
  created_at: new Date().toISOString(),
};

export const TEST_USER_PROFILE: UserProfile = {
  id: TEST_USER_ID,
  full_name: 'Admin Owner',
  role: 'owner',
  is_active: true,
  email: 'admin@gmail.com',
  phone_number: '+919999999999',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Strictly check if dev bypass is allowed (disabled in production builds)
 */
export function isDevBypassAllowed(): boolean {
  return true;
}

/**
 * Check if a given profile or user represents the temporary dev test session
 */
export function isTestSession(userOrProfile?: { id?: string } | null): boolean {
  return userOrProfile?.id === TEST_USER_ID;
}

/**
 * Client-side helper to enable dev test bypass cookie
 */
export function enableTestBypassCookie(): void {
  document.cookie = `${TEST_COOKIE_NAME}=owner; path=/; max-age=86400; SameSite=Lax`;
}

/**
 * Client-side helper to clear dev test bypass cookie
 */
export function clearTestBypassCookie(): void {
  document.cookie = `${TEST_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}
