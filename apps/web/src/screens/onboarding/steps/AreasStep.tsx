import { useState } from 'react';
import { AREA_PALETTE, SUGGESTED_AREAS } from '@harmony/shared';
import Modal from '../../../components/Modal/Modal';
import { hexToRgba } from '../../../lib/color';
import { useOnboarding } from '../OnboardingContext';
import { MAX_AREAS, MIN_AREAS } from '../onboardingTypes';
import OnboardingScaffold from '../OnboardingScaffold';
import { PrimaryButton } from '../ui';

export default function AreasStep({
  stepIndex,
  totalSteps,
  onBack,
  onNext,
}: {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
}) {
  const { areas, isSelected, toggleSuggested, addCustomArea, removeArea } = useOnboarding();
  const [modalOpen, setModalOpen] = useState(false);

  const count = areas.length;
  const atMax = count >= MAX_AREAS;
  const canContinue = count >= MIN_AREAS;

  const customAreas = areas.filter((a) => a.isCustom);

  return (
    <OnboardingScaffold
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      onBack={onBack}
      footer={
        <div className="space-y-2">
          <PrimaryButton onClick={onNext} disabled={!canContinue}>
            Continue
          </PrimaryButton>
          <p className="text-center text-xs text-ink-300">
            {count} chosen. Pick {MIN_AREAS} to {MAX_AREAS}.
          </p>
        </div>
      }
    >
      <div className="py-6">
        <h1 className="font-serif text-3xl leading-tight text-ink-900">
          What parts of life make you feel most yourself?
        </h1>
        <p className="mt-3 text-sm text-ink-500">Pick three to seven. You can change these any time.</p>

        <div className="mt-7 flex flex-wrap gap-2.5">
          {SUGGESTED_AREAS.map((area) => {
            const selected = isSelected(area.name);
            const disabled = !selected && atMax;
            return (
              <AreaSelectChip
                key={area.name}
                name={area.name}
                color={area.color}
                selected={selected}
                disabled={disabled}
                onClick={() => toggleSuggested(area.name, area.color)}
              />
            );
          })}

          {customAreas.map((area) => (
            <AreaSelectChip
              key={area.id}
              name={area.name}
              color={area.color}
              selected
              disabled={false}
              onClick={() => removeArea(area.id)}
            />
          ))}

          <button
            type="button"
            disabled={atMax}
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-parchment-200 px-4 py-2 text-sm font-medium text-ink-500 hover:text-ink-700 disabled:opacity-40"
          >
            Add your own
          </button>
        </div>
      </div>

      <CustomAreaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdd={(name, color) => {
          addCustomArea(name, color);
          setModalOpen(false);
        }}
      />
    </OnboardingScaffold>
  );
}

function AreaSelectChip({
  name,
  color,
  selected,
  disabled,
  onClick,
}: {
  name: string;
  color: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40"
      style={
        selected
          ? {
              backgroundColor: hexToRgba(color, 0.22),
              color,
              boxShadow: `inset 0 0 0 1.5px ${hexToRgba(color, 0.55)}`,
            }
          : { backgroundColor: 'var(--parchment-200)', color: 'var(--ink-700)' }
      }
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </button>
  );
}

function CustomAreaModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | null>(null);

  function handleAdd() {
    if (!name.trim() || !color) return;
    onAdd(name.trim(), color);
    setName('');
    setColor(null);
  }

  return (
    <Modal open={open} onClose={onClose} title="Add your own">
      <label htmlFor="custom-area-name" className="mb-1.5 block text-sm font-medium text-ink-700">
        Name
      </label>
      <input
        id="custom-area-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Garden, Music, Faith"
        className="w-full rounded-card bg-parchment-50 px-3.5 py-2.5 text-sm text-ink-900 ring-1 ring-inset ring-parchment-300 placeholder:text-ink-300 focus:ring-2 focus:ring-iris-500"
      />

      <p className="mb-2 mt-4 text-sm font-medium text-ink-700">Colour</p>
      <div className="flex flex-wrap gap-2.5">
        {AREA_PALETTE.map((swatch) => (
          <button
            key={swatch.hex}
            type="button"
            aria-label={swatch.name}
            aria-pressed={color === swatch.hex}
            onClick={() => setColor(swatch.hex)}
            className="h-7 w-7 rounded-full"
            style={{
              backgroundColor: swatch.hex,
              boxShadow:
                color === swatch.hex
                  ? `0 0 0 2px #FFFAF1, 0 0 0 4px ${swatch.hex}`
                  : undefined,
            }}
          />
        ))}
      </div>

      <div className="mt-6">
        <PrimaryButton onClick={handleAdd} disabled={!name.trim() || !color}>
          Add area
        </PrimaryButton>
      </div>
    </Modal>
  );
}
