import { redirect } from 'next/navigation';
import { getServerCurrentUser, getServerCurrentUserProfile } from '@/services/auth/serverAuthService';
import { getServerRestaurantSettings } from '@/services/settings/serverSettingsService';
import { PosShellLayout } from '@/components/layout/PosShellLayout';

export const metadata = {
  title: 'WebRajya POS - Restaurant Management',
  description: 'Single-restaurant point of sale application',
};

export default async function PosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side authentication & profile check
  const user = await getServerCurrentUser();
  const profile = await getServerCurrentUserProfile();

  // Protect POS route server-side
  if (!user || !profile || !profile.is_active) {
    redirect('/login');
  }

  // Load single-restaurant settings from public.restaurant_settings
  const settings = await getServerRestaurantSettings();

  return (
    <PosShellLayout
      initialUser={user}
      initialProfile={profile}
      settings={settings}
    >
      {children}
    </PosShellLayout>
  );
}
