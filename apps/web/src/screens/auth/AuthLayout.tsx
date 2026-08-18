import type { ReactNode } from 'react';

// Shared frame for sign in and sign up. Same visual language as the rest of
// the app: parchment background, ink text, iris primary action. No splash
// imagery, no gradients.
export default function AuthLayout({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-full items-center justify-center px-5 pt-safe pb-safe">
      <div className="w-full max-w-sm py-12">
        <h1 className="font-serif text-3xl text-ink-strong">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{sub}</p>
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}

export function FieldLabel({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink-body">
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-card bg-parchment-surface px-3.5 py-2.5 text-sm text-ink-strong ring-1 ring-inset ring-parchment-edge transition-shadow placeholder:text-ink-faint focus:ring-2 focus:ring-accent-base"
    />
  );
}

export function PrimaryButton({
  children,
  disabled,
  type = 'submit',
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: 'submit' | 'button';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="w-full rounded-full bg-accent-base py-3 text-sm font-medium text-on-accent transition-opacity disabled:opacity-40"
    >
      {children}
    </button>
  );
}
