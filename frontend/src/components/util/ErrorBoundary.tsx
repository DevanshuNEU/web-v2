'use client';

/**
 * ErrorBoundary — wraps a single app so a render-time crash inside it is
 * contained to that view. The rest of the OS (other windows, dock, status
 * bar, lock screen) keeps running.
 *
 * Used in two places:
 *   - components/os/WindowManager.tsx   (desktop apps inside a Window)
 *   - components/mobile/AppView.tsx     (the mobile fullscreen app host)
 *
 * Both mount points already use <Suspense> for lazy-load fallbacks; the
 * boundary sits *inside* the Suspense so a Suspense throw still passes
 * through to the Suspense handler, but synchronous render exceptions stop
 * here.
 *
 * The default fallback renders a friendly recovery card with a "Reload this
 * app" button that clears the boundary's state — React then re-mounts the
 * children. If the child crashes again on the same path, the boundary
 * catches again. No infinite loop because the user has to initiate each
 * reload click.
 *
 * Use a per-app key (e.g. `key={appType}`) on the boundary so switching
 * apps gives each one a fresh boundary instance. Without that, an error
 * recorded for App A would still display when App B mounts in the same
 * slot. WindowManager and AppView both pass `key`.
 */

import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  /** Human-readable label of the thing being protected, e.g. "GitHub Activity". */
  label?: string;
  /** Override the default fallback render. */
  fallback?: (state: { error: Error; reset: () => void }) => React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error(
        `[ErrorBoundary${this.props.label ? ` · ${this.props.label}` : ''}]`,
        error,
        info
      );
    }
  }

  reset = (): void => this.setState({ error: null });

  render(): React.ReactNode {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback) {
        return this.props.fallback({ error, reset: this.reset });
      }
      return (
        <DefaultFallback error={error} reset={this.reset} label={this.props.label} />
      );
    }
    return this.props.children;
  }
}

function DefaultFallback({
  error,
  reset,
  label,
}: {
  error: Error;
  reset: () => void;
  label?: string;
}) {
  return (
    <div
      role="alert"
      data-testid="error-boundary-fallback"
      className="h-full w-full flex flex-col items-center justify-center px-8 text-center gap-3 bg-bg text-text"
    >
      <AlertOctagon size={36} className="text-amber-500" aria-hidden />
      <h2 className="text-[17px] font-semibold">
        {label ? `${label} crashed` : 'Something went wrong'}
      </h2>
      <p className="text-[13px] text-text-secondary max-w-[300px]">
        An unexpected error broke this view. The rest of devOS is still
        running — you can reload just this app.
      </p>
      <details className="text-[11px] text-text-secondary/80 max-w-[320px] mt-1">
        <summary className="cursor-pointer select-none">Error detail</summary>
        <pre
          className="mt-1 text-left whitespace-pre-wrap break-words font-mono"
          data-testid="error-boundary-message"
        >
          {error.message || String(error)}
        </pre>
      </details>
      <button
        type="button"
        onClick={reset}
        className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface dark:bg-white/[0.04] text-[14px] font-medium text-text active:opacity-70 transition-opacity"
      >
        <RotateCcw size={14} aria-hidden />
        Reload this app
      </button>
    </div>
  );
}
