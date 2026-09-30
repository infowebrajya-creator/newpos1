import { useEffect } from 'react';

export interface HotkeyHandlers {
  onSearchFocus?: () => void;
  onDispatchKOT?: () => void;
  onSaveAndBill?: () => void;
  onReprint?: () => void;
  onQuickPay?: () => void;
  onEscape?: () => void;
  onQuantityIncrease?: () => void;
  onQuantityDecrease?: () => void;
  onRemoveItem?: () => void;
}

export function usePOSHotkeys(handlers: HotkeyHandlers, active: boolean = true) {
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

      // Global ESC key (works even when input is focused to clear focus/close modal)
      if (e.key === 'Escape') {
        if (isInputFocused) {
          target?.blur();
        }
        if (handlers.onEscape) {
          handlers.onEscape();
        }
        return;
      }

      // If typing inside an input field, do not trigger single letter hotkeys (S, K, B, P, X)
      if (isInputFocused) {
        // Allow Cmd+K or Ctrl+K even inside input
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
          e.preventDefault();
          handlers.onSearchFocus?.();
        }
        return;
      }

      const key = e.key;
      const lowerKey = key.toLowerCase();

      // 1. Search Bar Focus: 'S', '/', F1, Cmd+K, Ctrl+K
      if (
        lowerKey === 's' ||
        key === '/' ||
        key === 'F1' ||
        ((e.metaKey || e.ctrlKey) && lowerKey === 'k')
      ) {
        e.preventDefault();
        handlers.onSearchFocus?.();
        return;
      }

      // 2. Dispatch KOT: 'K', F4, Cmd+Enter, Ctrl+Enter
      if (
        lowerKey === 'k' ||
        key === 'F4' ||
        ((e.metaKey || e.ctrlKey) && key === 'Enter')
      ) {
        e.preventDefault();
        handlers.onDispatchKOT?.();
        return;
      }

      // 3. Save & Bill (Checkout): 'B', F2, Cmd+B, Ctrl+B
      if (
        lowerKey === 'b' ||
        key === 'F2' ||
        ((e.metaKey || e.ctrlKey) && lowerKey === 'b')
      ) {
        e.preventDefault();
        handlers.onSaveAndBill?.();
        return;
      }

      // 4. Reprint Receipt: 'P', F7, Cmd+P, Ctrl+P
      if (
        lowerKey === 'p' ||
        key === 'F7' ||
        ((e.metaKey || e.ctrlKey) && lowerKey === 'p')
      ) {
        e.preventDefault();
        handlers.onReprint?.();
        return;
      }

      // 5. Quick Cash Pay: 'Space'
      if (key === ' ' || key === 'Spacebar') {
        e.preventDefault();
        handlers.onQuickPay?.();
        return;
      }

      // 6. Adjust Quantities: '+' / '-'
      if (key === '+' || key === '=') {
        e.preventDefault();
        handlers.onQuantityIncrease?.();
        return;
      }
      if (key === '-') {
        e.preventDefault();
        handlers.onQuantityDecrease?.();
        return;
      }

      // 7. Remove Item: 'X'
      if (lowerKey === 'x') {
        e.preventDefault();
        handlers.onRemoveItem?.();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers, active]);
}
