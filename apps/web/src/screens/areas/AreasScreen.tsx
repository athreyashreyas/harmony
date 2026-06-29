import { useEffect, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Area } from '@harmony/shared';
import AreaRow from '../../components/AreaRow/AreaRow';
import FAB from '../../components/FAB/FAB';
import Skeleton from '../../components/Skeleton/Skeleton';
import { archiveArea, reorderAreas, saveArea } from '../../lib/db/queries';
import { createArea } from '../../lib/domain';
import { useUserData } from '../../lib/useUserData';
import { useAreas } from '../../store/useAreas';
import AreaSheet, { type AreaFields } from './AreaSheet';

export default function AreasScreen() {
  const { profile, areas, habits, logs, loaded, reloadAreas, reloadHabits } = useUserData();

  const [orderedAreas, setOrderedAreas] = useState<Area[]>(areas);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  useEffect(() => {
    setOrderedAreas(areas);
  }, [areas]);

  async function handleReorder(next: Area[]) {
    setOrderedAreas(next);
    const persisted = await reorderAreas(next);
    useAreas.setState({ areas: persisted });
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

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-36 md:pb-16">
      <h1 className="font-serif text-3xl text-ink-900">Areas</h1>
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
              <AreaRow key={area.id} area={area} habits={habits} logs={logs} onOpen={() => openEdit(area)} />
            ))}
          </Reorder.Group>
        )}
      </div>

      <FAB label="Add area" onClick={openCreate} />

      <AreaSheet
        open={sheetOpen}
        area={editingArea}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onArchive={handleArchive}
      />
    </div>
  );
}
