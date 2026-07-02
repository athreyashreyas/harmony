import { useEffect, type RefObject } from 'react';

// Close a popover on a tap outside it or an Escape press, the way a native menu
// would. Shared by the app's dropdown-style pickers.
export function useDismiss(active: boolean, ref: RefObject<HTMLElement>, onDismiss: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [active, ref, onDismiss]);
}
