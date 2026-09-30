'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/hooks/useCurrentUser';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthUser, UserProfile, RestaurantSettings } from '@/types';
import { signOut } from '@/services/auth/authService';
import { useRouter } from 'next/navigation';
import { QuickTableJumpModal } from '@/features/tables/components/QuickTableJumpModal';
import { useTableHotkeys } from '@/hooks/useTableHotkeys';

interface PosShellLayoutProps {
  children: React.ReactNode;
  initialUser: AuthUser | null;
  initialProfile: UserProfile | null;
  settings: RestaurantSettings | null;
}

export function PosShellLayout({
  children,
  initialUser,
  initialProfile,
  settings,
}: PosShellLayoutProps) {
  const router = useRouter();
  const [isTableJumpOpen, setIsTableJumpOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global Table Jump Hotkey ('T' or 'Cmd+T')
  useTableHotkeys({
    onOpenTableJump: () => setIsTableJumpOpen(true),
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  const restaurantName = settings?.name || 'WebRajya Restaurant';

  return (
    <AuthProvider initialUser={initialUser} initialProfile={initialProfile}>
      <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-red-600 selection:text-white">
        {/* Horizontal Top Workstation Header */}
        <Topbar
          title="WebRajya POS"
          restaurantName={restaurantName}
          userProfile={initialProfile}
          onSignOut={handleSignOut}
        />

        {/* Mobile Full Navigation Drawer */}
        <Sidebar
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          userRole={initialProfile?.role}
        />

        {/* Main Workstation Viewport */}
        <main className="flex-1 p-2 sm:p-3 lg:p-4 overflow-y-auto pb-16 lg:pb-4">
          {children}
        </main>

        {/* Smartphone Fixed Bottom Navigation Bar */}
        <MobileBottomNav onOpenMobileMenu={() => setIsMobileSidebarOpen(true)} />

        {/* Global Quick Table Jump Modal (T key) */}
        <QuickTableJumpModal
          isOpen={isTableJumpOpen}
          onClose={() => setIsTableJumpOpen(false)}
        />
      </div>
    </AuthProvider>
  );
}

