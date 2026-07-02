import { useEffect, useState } from 'react';
import { MAX_NOTE } from '@harmony/shared';
import BottomSheet from '../BottomSheet/BottomSheet';
import { PrimaryButton } from '../../screens/onboarding/ui';

// The "how did that feel?" note (section 9.5), reached by long-pressing a
// habit card. Saving a note also marks the day tended.
export default function NoteSheet({
  open,
  habitName,
  initialNote,
  onClose,
  onSave,
}: {
  open: boolean;
  habitName: string;
  initialNote: string;
  onClose: () => void;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) setNote(initialNote);
  }, [open, initialNote]);

  return (
    <BottomSheet open={open} onClose={onClose} title={habitName}>
      <div className="space-y-4 pb-4">
        <div>
          <label htmlFor="log-note" className="mb-1.5 block text-sm font-medium text-ink-700">
            How did that feel?
          </label>
          <textarea
            id="log-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write here."
            rows={4}
            maxLength={MAX_NOTE}
            className="w-full resize-none rounded-card bg-parchment-100 px-3.5 py-3 text-base text-ink-900 ring-1 ring-inset ring-parchment-300 placeholder:text-ink-300 focus:ring-2 focus:ring-iris-500"
          />
          {note.length > MAX_NOTE - 80 && (
            <p className="mt-1 text-right text-xs text-ink-300">{MAX_NOTE - note.length} left</p>
          )}
        </div>
        <PrimaryButton onClick={() => onSave(note)}>Save note</PrimaryButton>
      </div>
    </BottomSheet>
  );
}
