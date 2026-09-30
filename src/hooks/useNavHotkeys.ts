import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export interface NavModuleShortcut {
  category: string;
  key: string;
  href: string;
}

export const MODULE_NAV_SHORTCUTS: NavModuleShortcut[] = [
  { category: 'Front Desk', key: '1', href: '/pos/tables' },
  { category: 'Sales & Billing', key: '2', href: '/pos/payments' },
  { category: 'Kitchen & Stock', key: '3', href: '/pos/menu' },
  { category: 'Insights & Admin', key: '4', href: '/pos/settings' },
];

export function useNavHotkeys(active: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const code = e.code;
      const key = e.key;

      // Detect digits 1..4 across macOS Option/Alt, Cmd, Ctrl & physical keys
      const isDigit1 = code === 'Digit1' || key === '1' || key === '¡';
      const isDigit2 = code === 'Digit2' || key === '2' || key === '™';
      const isDigit3 = code === 'Digit3' || key === '3' || key === '£';
      const isDigit4 = code === 'Digit4' || key === '4' || key === '¢';

      // 1. Modifier Combinations: Alt+1..4 (⌥1..4 on Mac), Cmd+1..4 (⌘1..4 on Mac), or Ctrl+1..4
      if (e.altKey || e.metaKey || e.ctrlKey) {
        if (isDigit1) {
          e.preventDefault();
          router.push('/pos/tables');
          return;
        }
        if (isDigit2) {
          e.preventDefault();
          router.push('/pos/payments');
          return;
        }
        if (isDigit3) {
          e.preventDefault();
          router.push('/pos/menu');
          return;
        }
        if (isDigit4) {
          e.preventDefault();
          router.push('/pos/settings');
          return;
        }
      }

      // 2. Direct Single Keys: 1, 2, 3, 4, [, ] when not typing in text fields
      if (!isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isDigit1) {
          e.preventDefault();
          router.push('/pos/tables');
          return;
        }
        if (isDigit2) {
          e.preventDefault();
          router.push('/pos/payments');
          return;
        }
        if (isDigit3) {
          e.preventDefault();
          router.push('/pos/menu');
          return;
        }
        if (isDigit4) {
          e.preventDefault();
          router.push('/pos/settings');
          return;
        }

        // Bracket cycling: ']' to go forward, '[' to go backward
        if (key === ']' || code === 'BracketRight') {
          e.preventDefault();
          if (pathname.includes('/tables') || pathname.includes('/order')) {
            router.push('/pos/payments');
          } else if (pathname.includes('/payments') || pathname.includes('/orders')) {
            router.push('/pos/menu');
          } else if (pathname.includes('/menu') || pathname.includes('/inventory') || pathname.includes('/recipes')) {
            router.push('/pos/settings');
          } else {
            router.push('/pos/tables');
          }
        } else if (key === '[' || code === 'BracketLeft') {
          e.preventDefault();
          if (pathname.includes('/settings') || pathname.includes('/reports') || pathname.includes('/analytics')) {
            router.push('/pos/menu');
          } else if (pathname.includes('/menu') || pathname.includes('/inventory') || pathname.includes('/recipes')) {
            router.push('/pos/payments');
          } else if (pathname.includes('/payments') || pathname.includes('/orders')) {
            router.push('/pos/tables');
          } else {
            router.push('/pos/settings');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname, active]);
}
