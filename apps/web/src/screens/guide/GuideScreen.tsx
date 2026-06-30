import { useNavigate } from 'react-router-dom';
import { APP_VERSION, CHANGELOG } from '../../lib/changelog';
import { GUIDE, type GuideArtKind, type GuideSection } from '../../lib/guide';
import ReleaseRow from '../../components/ReleaseRow/ReleaseRow';
import { BackButton } from '../onboarding/ui';

const ASH = '#5a636f';

// Small, calm illustrations so the guide instructs by showing, not only telling.
function GuideArt({ kind }: { kind: GuideArtKind }) {
  switch (kind) {
    case 'bloom':
      return (
        <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden="true">
          <circle cx="60" cy="60" r="44" fill="none" stroke="var(--parchment-300)" strokeDasharray="2 4" />
          <g style={{ mixBlendMode: 'multiply' }}>
            <path d="M60 60 L60 18 A42 42 0 0 1 96 39 Z" fill="#b5532f" opacity="0.85" />
            <path d="M60 60 L96 39 A42 42 0 0 1 96 81 Z" fill="#b7902a" opacity="0.5" />
            <path d="M60 60 L96 81 A42 42 0 0 1 60 102 Z" fill="#5b7a35" opacity="0.7" />
            <path d="M60 60 L60 102 A42 42 0 0 1 24 81 Z" fill="#7a3b6e" opacity="0.35" />
            <path d="M60 60 L24 81 A42 42 0 0 1 24 39 Z" fill="#3a7ca8" opacity="0.6" />
            <path d="M60 60 L24 39 A42 42 0 0 1 60 18 Z" fill="#944021" opacity="0.5" />
          </g>
          <circle cx="60" cy="60" r="16" fill="var(--parchment-50)" />
          <text x="60" y="61" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-serif)" fontSize="20" fill="var(--iris-500)">h</text>
        </svg>
      );
    case 'habit':
      return (
        <div className="w-full max-w-[240px] space-y-2">
          <div className="flex items-center gap-3 rounded-card bg-parchment-50 py-3 pl-3 pr-4 shadow-card" style={{ borderLeft: '3px solid #5b7a35' }}>
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full" style={{ backgroundColor: '#5b7a35' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <span className="flex-1 text-sm text-ink-300 line-through">Morning walk</span>
          </div>
          <div className="flex items-center gap-3 rounded-card bg-parchment-50 py-3 pl-3 pr-4 shadow-card" style={{ borderLeft: '3px solid #944021' }}>
            <span className="h-[22px] w-[22px] rounded-full" style={{ boxShadow: 'inset 0 0 0 1.5px var(--parchment-300)' }} />
            <span className="flex-1 text-sm text-ink-900">Read a few pages</span>
          </div>
        </div>
      );
    case 'areas':
      return (
        <div className="flex flex-wrap justify-center gap-2">
          {[
            ['Body', '#9E343C'],
            ['Mind', '#404780'],
            ['Connection', '#94405E'],
          ].map(([name, c]) => (
            <span key={name} className="flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium" style={{ backgroundColor: `${c}1f`, color: c }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c }} />
              {name}
            </span>
          ))}
        </div>
      );
    case 'weights':
      return (
        <div className="w-full max-w-[240px]">
          <div className="flex h-2.5 overflow-hidden rounded-full bg-parchment-200">
            <span style={{ width: '55%', backgroundColor: '#b5532f' }} />
            <span style={{ width: '30%', backgroundColor: '#b7902a' }} />
            <span style={{ width: '15%', backgroundColor: '#5b7a35' }} />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-ink-300">
            <span>55%</span>
            <span>30%</span>
            <span>15%</span>
          </div>
        </div>
      );
    case 'tug':
      return (
        <div className="flex w-full max-w-[240px] items-center gap-3 rounded-card border border-dashed px-3 py-3" style={{ borderColor: `${ASH}73` }}>
          <span className="h-[22px] w-[22px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${ASH}88` }} />
          <span className="flex-1 text-sm text-ink-900">Late-night scrolling</span>
          <span className="text-[10px] uppercase tracking-wide text-ink-300">tug</span>
        </div>
      );
    case 'log':
      return (
        <div className="grid grid-cols-7 gap-1.5" style={{ width: 'fit-content' }}>
          {Array.from({ length: 21 }).map((_, i) => {
            const on = [1, 2, 4, 8, 9, 11, 15, 16, 18].includes(i);
            return <span key={i} className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: on ? '#b5532f' : 'var(--parchment-300)' }} />;
          })}
        </div>
      );
    case 'sync':
      return (
        <div className="flex items-center gap-5">
          {[
            ['#c0392b', 'Offline'],
            ['#b7902a', 'Syncing'],
            ['var(--sage-500)', 'Synced'],
          ].map(([c, label]) => (
            <span key={label} className="flex flex-col items-center gap-1.5">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c }} />
              <span className="text-[10px] text-ink-300">{label}</span>
            </span>
          ))}
        </div>
      );
  }
}

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
  const latest = CHANGELOG[0];

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-parchment-100">
      <header className="flex items-center justify-between px-4 pt-safe pl-safe pr-safe">
        <div className="flex h-14 items-center">
          <BackButton onClick={() => navigate(-1)} />
        </div>
        <span className="pr-2 text-xs text-ink-300">Harmony {APP_VERSION}</span>
      </header>

      <div className="scroll-ios min-h-0 flex-1 overflow-y-auto pb-safe pl-safe pr-safe">
        <main className="mx-auto w-full max-w-md px-5 pb-12">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300">How Harmony works</p>
          <h1 className="mt-1 font-serif text-3xl leading-tight text-ink-900">
            A gentle place to return to yourself.
          </h1>

          {latest && (
            <section className="mt-7">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300">What's new</p>
              <ReleaseRow release={latest} defaultOpen />
            </section>
          )}

          <div className="mt-9 space-y-8">
            {GUIDE.map((section) => (
              <Section key={section.id} section={section} />
            ))}
          </div>

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
