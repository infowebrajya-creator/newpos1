import { useEffect } from 'react';

interface UseTableHotkeysOptions {
  onOpenTableJump: () => void;
  active?: boolean;
}

export function useTableHotkeys({ onOpenTableJump, active = true }: UseTableHotkeysOptions) {
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

      const isKeyT = e.code === 'KeyT' || e.key.toLowerCase() === 't' || e.key === '†';

      // Cmd+T, Ctrl+T, or Option+T always triggers table jump modal
      if ((e.metaKey || e.ctrlKey || e.altKey) && isKeyT) {
        e.preventDefault();
        onOpenTableJump();
        return;
      }

      // If user is typing inside text input, ignore single 'T' key
      if (isInputFocused) return;

      // Single 'T' or 't' key triggers table jump modal
      if (isKeyT && !e.shiftKey) {
        e.preventDefault();
        onOpenTableJump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenTableJump, active]);
}
