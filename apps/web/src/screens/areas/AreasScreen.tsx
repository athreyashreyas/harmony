import { useEffect, useState } from 'react';
import { Reorder } from 'framer-motion';
import type { Area } from '@harmony/shared';
import AreaRow from '../../components/AreaRow/AreaRow';
import FAB from '../../components/FAB/FAB';
import Skeleton from '../../components/Skeleton/Skeleton';
import { archiveArea, reorderAreas, saveArea } from '../../lib/db/queries';
import { useAreas } from '../../store/useAreas';
import { useHabits } from '../../store/useHabits';
import { useLogs } from '../../store/useLogs';
import { useUser } from '../../store/useUser';
import AreaSheet, { type AreaFields } from './AreaSheet';

export default function AreasScreen() {
  const profile = useUser((s) => s.profile);
  const areas = useAreas((s) => s.areas);
  const loadAreas = useAreas((s) => s.load);
  const areasLoaded = useAreas((s) => s.loadedFor);
  const habits = useHabits((s) => s.habits);
  const loadHabits = useHabits((s) => s.load);
  const logs = useLogs((s) => s.logs);
  const loadLogs = useLogs((s) => s.load);

  const [orderedAreas, setOrderedAreas] = useState<Area[]>(areas);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  useEffect(() => {
    if (!profile) return;
    void loadAreas(profile.id);
    void loadHabits(profile.id);
    void loadLogs(profile.id);
  }, [profile, loadAreas, loadHabits, loadLogs]);

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
      : {
          id: crypto.randomUUID(),
          userId: profile.id,
          order: orderedAreas.length,
          createdAt: Date.now(),
          archivedAt: null,
          ...fields,
        };
    await saveArea(area);
    await loadAreas(profile.id);
    setSheetOpen(false);
  }

  async function handleArchive() {
    if (!editingArea || !profile) return;
    await archiveArea(editingArea.id);
    await loadAreas(profile.id);
    await loadHabits(profile.id);
    setSheetOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">Areas</h1>
      <p className="mt-2 text-sm text-ink-300">Your areas of life, in priority order.</p>

      <div className="mt-6">
        {areasLoaded !== profile?.id ? (
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
