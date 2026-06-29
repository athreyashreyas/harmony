import { Component, type ErrorInfo, type ReactNode } from 'react';

// Catches render errors anywhere below it so an uncaught exception shows a calm
// recovery screen instead of a blank white page. Error boundaries have to be
// class components; there is no hook equivalent.
interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Harmony hit a render error.', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-full flex-col items-center justify-center gap-4 px-6 pt-safe pb-safe text-center">
          <h1 className="font-serif text-2xl text-ink-900">Something quietly broke.</h1>
          <p className="max-w-sm text-sm text-ink-500">
            That is on us, not you. Reloading usually sorts it out.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-iris-500 px-5 py-2.5 text-sm font-medium text-parchment-50"
          >
            Reload Harmony
          </button>
          <p className="mt-2 max-w-sm break-words text-xs text-ink-300">{this.state.error.message}</p>
        </main>
      );
    }
    return this.props.children;
  }
}
