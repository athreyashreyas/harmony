import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { spring } from '../../lib/motion';
import { useFocusTrap } from '../../lib/useFocusTrap';

// Portaled bottom sheet (section 3, section 5.4). Pinned to the bottom,
// capped at 90% height. The grip handle is the only draggable element so the
// panel body can scroll its own content freely. Lifts above the keyboard by
// reading window.visualViewport into --keyboard-height.
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const dragControls = useDragControls();
  const panelRef = useFocusTrap<HTMLDivElement>(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !window.visualViewport) return;
    const viewport = window.visualViewport;
    function update() {
      const overlap = window.innerHeight - viewport.height - viewport.offsetTop;
      document.documentElement.style.setProperty('--keyboard-height', `${Math.max(0, overlap)}px`);
    }
    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.documentElement.style.setProperty('--keyboard-height', '0px');
    };
  }, [open]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-900/20" onClick={onClose} aria-hidden="true" />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            className="scroll-ios relative flex flex-col rounded-t-sheet bg-parchment-50 shadow-sheet"
            // Lift above the keyboard, and cap the height to the room left
            // between the status bar (safe-top) and the keyboard, so a tall
            // sheet can never be pushed up under the status bar.
            style={{
              marginBottom: 'var(--keyboard-height, 0px)',
              maxHeight: 'calc(100% - var(--keyboard-height, 0px) - var(--safe-top, 0px) - 0.5rem)',
              transition: 'margin-bottom 0.2s ease, max-height 0.2s ease',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
          >
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex shrink-0 cursor-grab touch-none justify-center py-2.5 active:cursor-grabbing"
            >
              <div className="h-1 w-9 rounded-full bg-parchment-300" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-safe">
              {title && <h2 className="mb-4 font-serif text-xl text-ink-900">{title}</h2>}
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
