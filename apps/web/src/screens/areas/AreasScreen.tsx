import { useEffect, useRef, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Area, Habit } from '@harmony/shared';
import { MAX_AREAS } from '@harmony/shared';
import AreaRow from '../../components/AreaRow/AreaRow';
import FAB from '../../components/FAB/FAB';
import HabitReorderSheet from '../../components/HabitReorderSheet/HabitReorderSheet';
import Skeleton from '../../components/Skeleton/Skeleton';
import SyncDot from '../../components/SyncDot/SyncDot';
import { archiveArea, reorderAreas, reorderHabits, saveArea, saveHabit } from '../../lib/db/queries';
import { createArea } from '../../lib/domain';
import { useUserData } from '../../lib/useUserData';
import { useOpenHabit } from '../../app/openHabit';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import AreaSheet, { type AreaFields, type HabitWeight } from './AreaSheet';

export default function AreasScreen() {
  const openHabit = useOpenHabit();
  const { profile, areas, habits, logs, loaded, reloadAreas, reloadHabits } = useUserData();

  const [orderedAreas, setOrderedAreas] = useState<Area[]>(areas);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [reorderingArea, setReorderingArea] = useState<Area | null>(null);

  // Persist the area order only when the drag ends, and never re-sync from the
  // store mid-drag, or the live list fights framer's in-progress reorder (the
  // shuffle/cascade). The ref holds the latest order from the drag.
  const dragging = useRef(false);
  const latestOrder = useRef<Area[]>(areas);

  useEffect(() => {
    if (dragging.current) return;
    setOrderedAreas(areas);
    latestOrder.current = areas;
  }, [areas]);

  function handleReorder(next: Area[]) {
    latestOrder.current = next;
    setOrderedAreas(next);
  }

  async function persistAreaOrder() {
    dragging.current = false;
    const persisted = await reorderAreas(latestOrder.current);
    useAreas.setState({ areas: persisted });
  }

  function handleReorderHabits(next: Habit[]) {
    void reorderHabits(next).then((persisted) => {
      const byId = new Map(persisted.map((h) => [h.id, h]));
      useHabits.setState((s) => ({ habits: s.habits.map((h) => byId.get(h.id) ?? h) }));
    });
  }

  async function handleSaveWeights(weights: HabitWeight[]) {
    const byId = new Map(weights.map((w) => [w.id, w.weight]));
    const updated = habits
      .filter((h) => byId.has(h.id))
      .map((h) => ({ ...h, weight: byId.get(h.id)! }));
    for (const h of updated) await saveHabit(h);
    useHabits.setState((s) => ({
      habits: s.habits.map((h) => (byId.has(h.id) ? { ...h, weight: byId.get(h.id)! } : h)),
    }));
  }

  function openCreate() {
    setEditingArea(null);
    setSheetOpen(true);
  }

  function openEdit(area: Area) {
    setEditingArea(area);
    setSheetOpen(true);
  }

  async function handleSave(fields: AreaFields) {
    if (!profile) return;
    const area: Area = editingArea
      ? { ...editingArea, ...fields }
      : createArea(fields, { userId: profile.id, order: orderedAreas.length });
    await saveArea(area);
    await reloadAreas(profile.id);
    setSheetOpen(false);
  }

  async function handleArchive() {
    if (!editingArea || !profile) return;
    await archiveArea(editingArea.id);
    await reloadAreas(profile.id);
    await reloadHabits(profile.id);
    setSheetOpen(false);
  }

  const reorderingHabits =
    reorderingArea != null
      ? habits
          .filter((h) => h.areaId === reorderingArea.id && h.archivedAt == null && h.polarity !== 'ease')
          .sort((a, b) => a.order - b.order)
      : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-36 md:pb-16">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-serif text-3xl text-ink-900">Areas</h1>
        <SyncDot />
      </div>
      <p className="mt-2 text-sm text-ink-300">Your areas of life, in priority order.</p>

      <div className="mt-6">
        {!loaded ? (
          <div className="space-y-2.5">
            <Skeleton className="h-[70px] w-full" />
            <Skeleton className="h-[70px] w-full" />
            <Skeleton className="h-[70px] w-full" />
          </div>
        ) : orderedAreas.length === 0 ? (
          <p className="text-sm text-ink-300">Add the parts of life you want to tend to.</p>
        ) : (
          <Reorder.Group axis="y" values={orderedAreas} onReorder={handleReorder} className="space-y-2.5">
            {orderedAreas.map((area) => (
              <AreaRow
                key={area.id}
                area={area}
                habits={habits}
                logs={logs}
                onOpen={() => openEdit(area)}
                expandable
                onOpenHabit={(habitId) => openHabit(habitId)}
                onRequestReorder={() => setReorderingArea(area)}
                onDragStart={() => {
                  dragging.current = true;
                }}
                onDragEnd={() => void persistAreaOrder()}
              />
            ))}
          </Reorder.Group>
        )}
      </div>

      {loaded && orderedAreas.length >= MAX_AREAS && (
        <p className="mt-6 text-center text-xs text-ink-300">
          You're keeping the most areas Harmony holds ({MAX_AREAS}). Delete one to add another.
        </p>
      )}

      {orderedAreas.length < MAX_AREAS && <FAB label="Add area" onClick={openCreate} />}

      <AreaSheet
        open={sheetOpen}
        area={editingArea}
        usedColors={areas.filter((a) => a.id !== editingArea?.id).map((a) => a.color)}
        habits={
          editingArea
            ? habits
                .filter((h) => h.areaId === editingArea.id && h.archivedAt == null && h.polarity !== 'ease')
                .sort((a, b) => a.order - b.order)
            : []
        }
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onSaveWeights={handleSaveWeights}
        onArchive={handleArchive}
      />

      <HabitReorderSheet
        open={reorderingArea != null}
        area={reorderingArea}
        habits={reorderingHabits}
        onClose={() => setReorderingArea(null)}
        onReorder={handleReorderHabits}
      />
    </div>
  );
}
