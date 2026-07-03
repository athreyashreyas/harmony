import { useLayoutEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { motion } from 'framer-motion';
import SyncDot from '../components/SyncDot/SyncDot';
import { NAV_ITEMS } from './navItems';
import { getScroll, saveScroll, takeForceTop } from './scrollMemory';

// The app shell. A flex row at md+ (sidebar then content), a flex column on
// phone (content then bottom tab bar). The shell fills the real visible
// viewport set in native-feel.css. Only the inner region scrolls; the top
// safe-area inset lives on the content wrapper, outside the scroller, so
// content never slides under the status bar. The bottom nav is a normal flex
// child (not position: fixed) so it stays flush to the true bottom.
export default function Shell() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  // Remember the scroller's offset for the current route as it scrolls, throttled
  // to a frame. This is what lets a back gesture restore the exact view.
  const handleScroll = () => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (el) saveScroll(pathname, el.scrollTop);
    });
  };

  // On each navigation (and on mount): the top-left back arrow asks for the top
  // (forceTop). A history POP (a back gesture / edge swipe, e.g. returning from a
  // habit page) restores where the user was — the habit screen renders outside
  // this shell, so the shell remounts fresh and we scroll it back. Any forward
  // navigation (a tab tap = PUSH) lands at the top, as before.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (takeForceTop() || navType !== 'POP') {
      el.scrollTo({ top: 0 });
      return;
    }
    const y = getScroll(pathname);
    el.scrollTo({ top: y }); // before paint → no flash at the top
    // Retry next frame in case content height settled after this paint.
    requestAnimationFrame(() => el.scrollTo({ top: y }));
  }, [pathname, navType]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden md:flex-row">
      <SyncDot />
      <Sidebar />

      {/* pt-safe lives on main, outside the scroller, so content never slides
          under the status bar; a clean nested div does the actual scrolling. */}
      <main className="flex min-w-0 min-h-0 flex-1 flex-col pt-safe pl-safe pr-safe">
        <div ref={scrollerRef} onScroll={handleScroll} className="scroll-ios min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>

      <BottomNav />
    </div>
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
