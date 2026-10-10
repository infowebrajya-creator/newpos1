'use client';

import React, { useState } from 'react';
import { AuthProvider } from '@/hooks/useCurrentUser';
import { Topbar } from '@/components/layout/Topbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AuthUser, UserProfile, RestaurantSettings } from '@/types';
import { signOut } from '@/services/auth/authService';
import { useRouter } from '@/lib/navigation';
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

        {/* Cashier High-Speed Hotkey HUD Banner */}
        <div className="hidden lg:flex items-center justify-between px-4 py-1.5 bg-slate-900 text-white text-[11px] font-bold border-t border-slate-800 shrink-0 sticky bottom-0 z-30 shadow-lg">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1 text-amber-400 font-extrabold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>⚡ 0-MOUSE CASHIER HOTKEYS:</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 border border-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono">[K]</kbd>
              <span className="text-slate-300">Send KOT</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 border border-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono">[B]</kbd>
              <span className="text-slate-300">1-Tap Pay</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 border border-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono">[P]</kbd>
              <span className="text-slate-300">Print All</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 border border-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono">[T]</kbd>
              <span className="text-slate-300">Table Jump</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="bg-slate-800 border border-slate-700 text-amber-300 px-1.5 py-0.5 rounded text-[10px] font-mono">[Alt+1..4]</kbd>
              <span className="text-slate-300">Switch Modules</span>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[10px] text-slate-400">
            <span>WebRajya POS v2.0</span>
          </div>
        </div>

        {/* Global Quick Table Jump Modal (T key) */}
        <QuickTableJumpModal
          isOpen={isTableJumpOpen}
          onClose={() => setIsTableJumpOpen(false)}
        />
      </div>
    </AuthProvider>
  );
}

