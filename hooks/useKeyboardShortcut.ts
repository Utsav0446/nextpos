import { useEffect } from 'react';

interface KeyCombination {
  key: string; // e.g. 'k', 'n', 'p', 'Escape'
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

/**
 * Registers a global keyboard listener that triggers a callback on match.
 */
export function useKeyboardShortcut(combo: KeyCombination, callback: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const keyMatch = event.key.toLowerCase() === combo.key.toLowerCase();
      
      const ctrlMatch = combo.ctrl === undefined || combo.ctrl === event.ctrlKey;
      const altMatch = combo.alt === undefined || combo.alt === event.altKey;
      const shiftMatch = combo.shift === undefined || combo.shift === event.shiftKey;

      if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
        event.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [combo, callback]);
}
