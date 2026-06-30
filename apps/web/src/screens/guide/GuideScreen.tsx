import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_VERSION, CHANGELOG } from '../../lib/changelog';
import { GUIDE, type GuideSection } from '../../lib/guide';
import GuideArt from '../../components/GuideArt/GuideArt';
import ReleaseRow from '../../components/ReleaseRow/ReleaseRow';
import { BackButton } from '../onboarding/ui';

type Pane = 'new' | 'guide';

function Section({ section }: { section: GuideSection }) {
  return (
    <section className="border-t border-parchment-200 pt-7">
      <h2 className="font-serif text-2xl text-ink-900">{section.title}</h2>
      {section.art && (
        <div className="mt-4 flex justify-center rounded-card bg-parchment-50 px-4 py-6 shadow-card">
          <GuideArt kind={section.art} />
        </div>
      )}
      <div className="mt-4 space-y-3">
        {section.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-ink-700">
            {p}
          </p>
        ))}
      </div>
      {section.steps && (
        <ul className="mt-4 space-y-2">
          {section.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink-500">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-iris-400" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function GuideScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Onboarding sends people to the full walk-through; Settings opens What's new.
  // Anything else lands on What's new, the more common "what changed" check.
  const initial: Pane = params.get('pane') === 'guide' ? 'guide' : 'new';
  const [pane, setPane] = useState<Pane>(initial);

  const latest = CHANGELOG[0];
  const earlier = CHANGELOG.slice(1);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-parchment-100">
      <header className="flex items-center justify-between px-4 pt-safe">
        <div className="flex h-14 items-center">
          <BackButton onClick={() => navigate(-1)} />
        </div>
        <div className="flex h-14 items-center">
          <span className="text-xs text-ink-300">Harmony {APP_VERSION}</span>
        </div>
      </header>

      <div className="scroll-ios min-h-0 flex-1 overflow-y-auto pb-safe pl-safe pr-safe">
        <main className="mx-auto w-full max-w-md px-5 pb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300">How Harmony works</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight text-ink-900">
            A gentle place to return to yourself.
          </h1>

          {/* Two sides: what's new, and the lasting walk-through. */}
          <div role="tablist" aria-label="Guide" className="mt-6 flex gap-1 rounded-full bg-parchment-200 p-1">
            {([
              ['new', "What's new"],
              ['guide', 'Guide'],
            ] as const).map(([value, label]) => {
              const active = pane === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPane(value)}
                  className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
                    active ? 'bg-parchment-50 text-ink-900 shadow-card' : 'text-ink-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {pane === 'new' ? (
            <div className="mt-7">
              {latest && <ReleaseRow release={latest} defaultOpen />}

              {earlier.length > 0 && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setHistoryOpen((o) => !o)}
                    aria-expanded={historyOpen}
                    className="flex w-full items-center justify-between py-2 text-left"
                  >
                    <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300">
                      Earlier versions
                    </span>
                    <span className={`text-ink-300 transition-transform ${historyOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                  </button>
                  {historyOpen && (
                    <div className="mt-2 space-y-2">
                      {earlier.map((release) => (
                        <ReleaseRow key={release.version} release={release} defaultOpen={false} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-8">
              {GUIDE.map((section) => (
                <Section key={section.id} section={section} />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-10 w-full rounded-full bg-iris-500 py-3 text-sm font-medium text-parchment-50"
          >
            Back to Harmony
          </button>
        </main>
      </div>
    </div>
  );
}
