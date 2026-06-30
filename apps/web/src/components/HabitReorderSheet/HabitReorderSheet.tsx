import { useEffect, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { Area, Habit } from '@harmony/shared';
import BottomSheet from '../BottomSheet/BottomSheet';

function GripIcon() {
  return (
    <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor" aria-hidden="true">
      {[3, 9, 15].map((y) => [3, 11].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.4" />))}
    </svg>
  );
}

function Row({ habit, color }: { habit: Habit; color: string }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={habit}
      dragListener={false}
      dragControls={controls}
      dragElastic={0}
      dragMomentum={false}
      whileDrag={{ scale: 1.03, boxShadow: '0 10px 26px rgba(35, 25, 15, 0.18)', zIndex: 1 }}
      transition={{ duration: 0.16, ease: 'easeOut' }}
      className="flex select-none items-center gap-3 rounded-card bg-parchment-100 px-3 py-3"
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.preventDefault();
          controls.start(e);
        }}
        aria-label={`Reorder ${habit.name}`}
        style={{ touchAction: 'none' }}
        className="-m-1.5 shrink-0 cursor-grab touch-none p-1.5 text-ink-300 active:cursor-grabbing"
      >
        <GripIcon />
      </button>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: habit.color ?? color }} />
      <span className="min-w-0 flex-1 truncate text-sm text-ink-900">{habit.name}</span>
    </Reorder.Item>
  );
}

// Reordering habits within an area, in its own sheet so the drag never touches
// the areas list behind it (nesting two reorder lists made the outer one jump).
export default function HabitReorderSheet({
  open,
  area,
  habits,
  onClose,
  onReorder,
}: {
  open: boolean;
  area: Area | null;
  habits: Habit[];
  onClose: () => void;
  onReorder: (next: Habit[]) => void;
}) {
  const [ordered, setOrdered] = useState<Habit[]>(habits);
  useEffect(() => {
    if (open) setOrdered(habits);
  }, [open, habits]);

  return (
    <BottomSheet open={open} onClose={onClose} title={area ? `Order in ${area.name}` : 'Reorder habits'}>
      <p className="-mt-1 pb-3 text-xs text-ink-300">Drag to set the priority of habits in this area.</p>
      <Reorder.Group
        axis="y"
        values={ordered}
        onReorder={(next) => {
          setOrdered(next);
          onReorder(next);
        }}
        className="space-y-2 pb-4"
      >
        {ordered.map((habit) => (
          <Row key={habit.id} habit={habit} color={area?.color ?? 'var(--iris-500)'} />
        ))}
      </Reorder.Group>
    </BottomSheet>
  );
}
