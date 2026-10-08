import { useEffect, useRef } from 'react';

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
  const handlersRef = useRef(handlers);
  const activeRef = useRef(active);

  // Keep refs synchronized with latest handlers without triggering listener re-binding
  useEffect(() => {
    handlersRef.current = handlers;
    activeRef.current = active;
  });

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
      const lowerKey = key.toLowerCase();
      const currentHandlers = handlersRef.current;

      // Global ESC key (works even when input is focused to clear focus / close modal)
      if (code === 'Escape' || key === 'Escape') {
        if (isInputFocused) {
          currentTarget?.blur();
        }
        if (currentHandlers.onEscape) {
          e.preventDefault();
          currentHandlers.onEscape();
        }
        return;
      }

      // If typing inside an input field, do not trigger single letter hotkeys (S, K, B, P, X)
      if (isInputFocused) {
        // Allow Cmd+K or Ctrl+K even inside input for instant search focus
        if ((e.metaKey || e.ctrlKey) && (code === 'KeyK' || lowerKey === 'k')) {
          e.preventDefault();
          currentHandlers.onSearchFocus?.();
        }
        return;
      }

      const focusSearchInput = () => {
        if (currentHandlers.onSearchFocus) {
          currentHandlers.onSearchFocus();
        } else {
          const searchEl = document.getElementById('pos-menu-search-input') as HTMLInputElement | null;
          if (searchEl) {
            searchEl.focus();
            searchEl.select();
          }
        }
      };

      // 1. Search Bar Focus: 'S', '/', F1, Cmd+K, Ctrl+K, Cmd+S, Ctrl+S
      if (
        code === 'KeyS' ||
        lowerKey === 's' ||
        code === 'Slash' ||
        key === '/' ||
        code === 'F1' ||
        key === 'F1' ||
        ((e.metaKey || e.ctrlKey) && (code === 'KeyK' || lowerKey === 'k' || code === 'KeyS' || lowerKey === 's'))
      ) {
        if (e.repeat) return;
        e.preventDefault();
        focusSearchInput();
        return;
      }

      // 2. Dispatch KOT: 'K', F4, Cmd+Enter, Ctrl+Enter, NumpadEnter
      if (
        code === 'KeyK' ||
        lowerKey === 'k' ||
        code === 'F4' ||
        key === 'F4' ||
        ((e.metaKey || e.ctrlKey) && (code === 'Enter' || code === 'NumpadEnter' || key === 'Enter'))
      ) {
        if (e.repeat) return;
        e.preventDefault();
        currentHandlers.onDispatchKOT?.();
        return;
      }

      // 3. Save & Bill (Checkout): 'B', F2, Cmd+B, Ctrl+B
      if (
        code === 'KeyB' ||
        lowerKey === 'b' ||
        code === 'F2' ||
        key === 'F2' ||
        ((e.metaKey || e.ctrlKey) && (code === 'KeyB' || lowerKey === 'b'))
      ) {
        if (e.repeat) return;
        e.preventDefault();
        currentHandlers.onSaveAndBill?.();
        return;
      }

      // 4. Reprint Receipt: 'P', F7, Cmd+P, Ctrl+P
      if (
        code === 'KeyP' ||
        lowerKey === 'p' ||
        code === 'F7' ||
        key === 'F7' ||
        ((e.metaKey || e.ctrlKey) && (code === 'KeyP' || lowerKey === 'p'))
      ) {
        if (e.repeat) return;
        e.preventDefault();
        currentHandlers.onReprint?.();
        return;
      }

      // 5. Quick Cash Pay: 'Space'
      if (code === 'Space' || key === ' ' || key === 'Spacebar') {
        if (e.repeat) return;
        e.preventDefault();
        currentHandlers.onQuickPay?.();
        return;
      }

      // 6. Adjust Quantities: '+' / '-' (allows holding or repeated keypresses)
      if (code === 'NumpadAdd' || key === '+' || key === '=') {
        e.preventDefault();
        currentHandlers.onQuantityIncrease?.();
        return;
      }
      if (code === 'NumpadSubtract' || key === '-') {
        e.preventDefault();
        currentHandlers.onQuantityDecrease?.();
        return;
      }

      // 7. Remove Item: 'X'
      if (code === 'KeyX' || lowerKey === 'x') {
        if (e.repeat) return;
        e.preventDefault();
        currentHandlers.onRemoveItem?.();
        return;
      }
    };

    // Use capture phase for immediate root-level key intercept without DOM propagation latency
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);
}

