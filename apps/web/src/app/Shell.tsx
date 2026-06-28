import { NavLink, Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NAV_ITEMS } from './navItems';

// The app shell. A flex row at md+ (sidebar then content), a flex column on
// phone (content then bottom tab bar). The shell fills the real visible
// viewport set in native-feel.css. Only the inner region scrolls; the top
// safe-area inset lives on the content wrapper, outside the scroller, so
// content never slides under the status bar. The bottom nav is a normal flex
// child (not position: fixed) so it stays flush to the true bottom.
export default function Shell() {
  return (
    <div className="flex h-full w-full flex-col md:flex-row">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="scroll-ios min-h-0 flex-1 overflow-y-auto pt-safe pl-safe pr-safe">
          <Outlet />
        </main>
        <BottomNav />
      </div>
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
        <span className="font-serif text-2xl text-iris-500">harmony</span>
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
      className="shrink-0 border-t border-parchment-300 bg-parchment-50 pb-safe pl-safe pr-safe md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 py-2.5 transition-colors',
                  isActive ? 'text-iris-500' : 'text-ink-300',
                ].join(' ')
              }
            >
              <motion.span whileTap={{ scale: 0.9 }} className="flex flex-col items-center gap-1">
                {item.icon}
                <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              </motion.span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
