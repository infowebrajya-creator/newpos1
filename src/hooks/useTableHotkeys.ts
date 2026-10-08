import { useEffect, useRef } from 'react';

interface UseTableHotkeysOptions {
  onOpenTableJump: () => void;
  active?: boolean;
}

export function useTableHotkeys({ onOpenTableJump, active = true }: UseTableHotkeysOptions) {
  const onOpenRef = useRef(onOpenTableJump);
  const activeRef = useRef(active);

  useEffect(() => {
    onOpenRef.current = onOpenTableJump;
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

      const isKeyT = e.code === 'KeyT' || e.key.toLowerCase() === 't' || e.key === '†';

      // Cmd+T, Ctrl+T, or Option+T always triggers table jump modal
      if ((e.metaKey || e.ctrlKey || e.altKey) && isKeyT) {
        if (e.repeat) return;
        e.preventDefault();
        onOpenRef.current();
        return;
      }

      // If user is typing inside text input, ignore single 'T' key
      if (isInputFocused) return;

      // Single 'T' or 't' key triggers table jump modal
      if (isKeyT && !e.shiftKey) {
        if (e.repeat) return;
        e.preventDefault();
        onOpenRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, []);
}

