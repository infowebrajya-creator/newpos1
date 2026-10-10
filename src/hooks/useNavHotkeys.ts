import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from '@/lib/navigation';

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

  const routerRef = useRef(router);
  const pathnameRef = useRef(pathname);
  const activeRef = useRef(active);

  useEffect(() => {
    routerRef.current = router;
    pathnameRef.current = pathname;
    activeRef.current = active;
  });

  // Prefetch navigation target routes on mount for instant zero-latency page transitions
  useEffect(() => {
    if (active) {
      MODULE_NAV_SHORTCUTS.forEach((item) => {
        router.prefetch?.(item.href);
      });
    }
  }, [router, active]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current) return;

      const target = e.target as HTMLElement | null;
      const activeEl = document.activeElement as HTMLElement | null;
      const currentTarget = target || activeEl;

      const isInputFocused =
        currentTarget &&
        (currentTarget.tagName === 'INPUT' ||
          currentTarget.tagName === 'TEXTAREA' ||
          currentTarget.tagName === 'SELECT' ||
          currentTarget.isContentEditable);

      const code = e.code;
      const key = e.key;

      // Detect digits 1..4 across macOS Option/Alt, Cmd, Ctrl & physical keys
      const isDigit1 = code === 'Digit1' || code === 'Numpad1' || key === '1' || key === '¡';
      const isDigit2 = code === 'Digit2' || code === 'Numpad2' || key === '2' || key === '™';
      const isDigit3 = code === 'Digit3' || code === 'Numpad3' || key === '3' || key === '£';
      const isDigit4 = code === 'Digit4' || code === 'Numpad4' || key === '4' || key === '¢';

      const currentRouter = routerRef.current;
      const currentPathname = pathnameRef.current;

      // 1. Modifier Combinations: Alt+1..4 (⌥1..4 on Mac), Cmd+1..4 (⌘1..4 on Mac), or Ctrl+1..4
      if (e.altKey || e.metaKey || e.ctrlKey) {
        if (isDigit1) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/tables');
          return;
        }
        if (isDigit2) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/payments');
          return;
        }
        if (isDigit3) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/menu');
          return;
        }
        if (isDigit4) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/settings');
          return;
        }
      }

      // 2. Direct Single Keys: 1, 2, 3, 4, [, ] when not typing in text fields
      if (!isInputFocused && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (isDigit1) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/tables');
          return;
        }
        if (isDigit2) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/payments');
          return;
        }
        if (isDigit3) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/menu');
          return;
        }
        if (isDigit4) {
          if (e.repeat) return;
          e.preventDefault();
          currentRouter.push('/pos/settings');
          return;
        }

        // Bracket cycling: ']' to go forward, '[' to go backward
        if (key === ']' || code === 'BracketRight') {
          if (e.repeat) return;
          e.preventDefault();
          if (currentPathname.includes('/tables') || currentPathname.includes('/order')) {
            currentRouter.push('/pos/payments');
          } else if (currentPathname.includes('/payments') || currentPathname.includes('/orders')) {
            currentRouter.push('/pos/menu');
          } else if (currentPathname.includes('/menu') || currentPathname.includes('/inventory') || currentPathname.includes('/recipes')) {
            currentRouter.push('/pos/settings');
          } else {
            currentRouter.push('/pos/tables');
          }
        } else if (key === '[' || code === 'BracketLeft') {
          if (e.repeat) return;
          e.preventDefault();
          if (currentPathname.includes('/settings') || currentPathname.includes('/reports') || currentPathname.includes('/analytics')) {
            currentRouter.push('/pos/menu');
          } else if (currentPathname.includes('/menu') || currentPathname.includes('/inventory') || currentPathname.includes('/recipes')) {
            currentRouter.push('/pos/payments');
          } else if (currentPathname.includes('/payments') || currentPathname.includes('/orders')) {
            currentRouter.push('/pos/tables');
          } else {
            currentRouter.push('/pos/settings');
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);
}

