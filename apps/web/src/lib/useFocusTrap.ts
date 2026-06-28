import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

// Minimal focus trap for portaled dialogs (Modal, BottomSheet). On open, moves
// focus into the panel and cycles Tab/Shift+Tab within it; on close, returns
// focus to whatever triggered the dialog. Section 20's "visible keyboard
// focus" only matters if focus actually goes somewhere sensible.
export function useFocusTrap<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const panel = ref.current;
    const focusFirst = () => {
      const focusable = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
      (focusable?.[0] ?? panel)?.focus();
    };
    // Wait a frame so the panel has mounted and its enter animation has
    // started before stealing focus.
    const id = requestAnimationFrame(focusFirst);

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  return ref;
}
