import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SyncDot from '../components/SyncDot/SyncDot';
import { manualRefresh } from '../lib/sync/refresh';
import { useUser } from '../store/useUser';
import { NAV_ITEMS } from './navItems';

// How far (in px of finger travel) a pull must reach to trigger a refresh, and
// how far the content is allowed to ease down. Pull travel is damped for feel.
const PULL_THRESHOLD = 70;
const PULL_MAX = 96;
const PULL_DAMP = 0.5;

// The app shell. A flex row at md+ (sidebar then content), a flex column on
// phone (content then bottom tab bar). The shell fills the real visible
// viewport set in native-feel.css. Only the inner region scrolls; the top
// safe-area inset lives on the content wrapper, outside the scroller, so
// content never slides under the status bar. The bottom nav is a normal flex
// child (not position: fixed) so it stays flush to the true bottom.
export default function Shell() {
  const { pathname } = useLocation();
  const profile = useUser((s) => s.profile);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  // The shell keeps a single scroller for every tab, so without this a tab
  // switch would land on the new screen still scrolled to the previous one's
  // offset. Reset to the top on each navigation.
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  function onTouchStart(e: React.TouchEvent) {
    if (refreshing) return;
    // Don't hijack a vertical drag that belongs to something else, like the
    // area reorder grip.
    if ((e.target as Element).closest?.('[data-no-pull]')) {
      startY.current = null;
      return;
    }
    const el = scrollerRef.current;
    startY.current = el && el.scrollTop <= 0 ? e.touches[0].clientY : null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null || refreshing) return;
    const el = scrollerRef.current;
    if (el && el.scrollTop > 0) {
      startY.current = null;
      setPull(0);
      return;
    }
    const dy = e.touches[0].clientY - startY.current;
    if (dy <= 0) {
      setPull(0);
      return;
    }
    if (!dragging) setDragging(true);
    setPull(Math.min(PULL_MAX, dy * PULL_DAMP));
  }

  async function onTouchEnd() {
    if (startY.current == null) return;
    startY.current = null;
    setDragging(false);
    if (pull >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPull(PULL_THRESHOLD);
      try {
        await manualRefresh(profile?.id ?? null);
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }

  const ready = pull >= PULL_THRESHOLD;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <SyncDot />
      <Sidebar />

      {/* pt-safe lives on main, outside the scroller, so content never slides
          under the status bar; a clean nested div does the actual scrolling. */}
      <main className="relative flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden pt-safe pl-safe pr-safe">
        {/* Pull to refresh indicator, revealed behind the content as it eases down. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-0 flex items-end justify-center pt-safe"
          style={{ height: pull }}
          aria-hidden={!pull && !refreshing}
        >
          <RefreshSpinner spinning={refreshing} progress={ready ? 1 : pull / PULL_THRESHOLD} />
        </div>

        <div
          ref={scrollerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
          className="scroll-ios relative z-10 min-h-0 flex-1 overflow-y-auto bg-parchment-100"
          style={{
            transform: pull ? `translateY(${pull}px)` : undefined,
            transition: dragging ? 'none' : 'transform 0.25s ease',
          }}
        >
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function RefreshSpinner({ spinning, progress }: { spinning: boolean; progress: number }) {
  return (
    <span className="mb-3 text-iris-500" style={{ opacity: spinning ? 1 : Math.min(1, progress) }}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={spinning ? 'animate-spin' : undefined}
        style={spinning ? undefined : { transform: `rotate(${progress * 270}deg)` }}
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      </svg>
    </span>
  );
}

// Sidebar: hidden on phone, visible from md up (section 3, section 9.1).
function Sidebar() {
  return (
    <nav
      aria-label="Primary"
      className="hidden shrink-0 flex-col border-r border-parchment-300 bg-parchment-50 pt-safe pb-safe pl-safe md:flex md:w-60"
    >
      <div className="px-6 py-7">
        <span className="font-serif text-2xl text-iris-500">Harmony</span>
      </div>
      <ul className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-card px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-iris-50 text-iris-500'
                    : 'text-ink-500 hover:bg-parchment-200 hover:text-ink-700',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-iris-500' : 'text-ink-300'}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Bottom tab bar: visible on phone, hidden from md up.
function BottomNav() {
  return (
    <nav
      aria-label="Primary"
      className="shrink-0 border-t border-parchment-200 bg-parchment-50 pb-safe pl-safe pr-safe shadow-[0_-2px_10px_rgba(35,25,15,0.06)] md:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pt-1.5">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              [
                'flex flex-1 flex-col items-center gap-0.5 py-1 transition-colors',
                isActive ? 'text-iris-500' : 'text-ink-300',
              ].join(' ')
            }
          >
            <motion.span whileTap={{ scale: 0.9 }} className="flex h-8 items-center justify-center">
              {item.icon}
            </motion.span>
            <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
