// Phase 1 placeholder. Each top-level screen renders one of these so the shell
// reads as the design system at rest. Real content arrives in later phases.
export default function ScreenPlaceholder({ title, line }: { title: string; line: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-5 pt-8 pb-28 md:pb-12">
      <h1 className="font-serif text-3xl text-ink-900">{title}</h1>
      <p className="mt-3 text-sm text-ink-300">{line}</p>
    </div>
  );
}
