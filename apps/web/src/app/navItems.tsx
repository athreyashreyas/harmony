import type { ReactNode } from 'react';

// Shared icon wrapper: 24x24, stroke driven by currentColor, calm 1.6 weight.
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

// The five top-level destinations (section 9.1 bottom nav).
export const NAV_ITEMS: NavItem[] = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <Icon>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M6 10.5V20h12v-9.5" />
      </Icon>
    ),
  },
  {
    to: '/areas',
    label: 'Areas',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="2.4" />
        <circle cx="12" cy="5" r="2" />
        <circle cx="18" cy="14.5" r="2" />
        <circle cx="6" cy="14.5" r="2" />
      </Icon>
    ),
  },
  {
    to: '/log',
    label: 'Log',
    icon: (
      <Icon>
        <rect x="4" y="5" width="16" height="15" rx="2.5" />
        <path d="M4 9.5h16M8 3.5v3M16 3.5v3" />
      </Icon>
    ),
  },
  {
    to: '/insights',
    label: 'Insights',
    icon: (
      <Icon>
        <path d="M5 19V11M12 19V6M19 19v-5" />
      </Icon>
    ),
  },
  {
    to: '/me',
    label: 'Me',
    icon: (
      <Icon>
        <circle cx="12" cy="9" r="3.2" />
        <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </Icon>
    ),
  },
];
