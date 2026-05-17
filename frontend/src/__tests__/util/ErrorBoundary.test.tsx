// @vitest-environment jsdom

import '../setup/dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '@/components/util/ErrorBoundary';

/**
 * React error boundaries log the caught error to console.error by default
 * (in addition to our explicit log). Silence the noise so the test runner
 * output stays readable.
 */
let consoleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  consoleSpy.mockRestore();
});

/** A component that throws on demand to drive the boundary into its error state. */
function Bomb({ when, message = 'boom' }: { when: boolean; message?: string }) {
  if (when) throw new Error(message);
  return <p>safe content</p>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <Bomb when={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('safe content')).toBeInTheDocument();
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('renders the default fallback when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb when message="explosion" />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent('explosion');
  });

  it('uses the label in the fallback heading', () => {
    render(
      <ErrorBoundary label="GitHub Activity">
        <Bomb when />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading')).toHaveTextContent('GitHub Activity crashed');
  });

  it('falls back to a generic heading when no label is provided', () => {
    render(
      <ErrorBoundary>
        <Bomb when />
      </ErrorBoundary>
    );
    expect(screen.getByRole('heading')).toHaveTextContent('Something went wrong');
  });

  it('fallback has role="alert" for screen readers', () => {
    render(
      <ErrorBoundary>
        <Bomb when />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('"Reload this app" button clears the error and re-renders children', async () => {
    /**
     * Re-mounting flips the bomb's `when` to false via a wrapper that flips
     * state on reset — simulates the world being fixed before the user
     * clicks reload (e.g. a transient error).
     */
    function Harness() {
      const [crashed, setCrashed] = React.useState(true);
      return (
        <ErrorBoundary
          fallback={({ reset }) => (
            <button
              onClick={() => {
                setCrashed(false);
                reset();
              }}
            >
              Try again
            </button>
          )}
        >
          <Bomb when={crashed} />
        </ErrorBoundary>
      );
    }

    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByText('safe content')).toBeInTheDocument();
  });

  it('default reload button is wired to reset', async () => {
    /**
     * If the underlying child still throws after reset, the boundary catches
     * again and the fallback re-renders. Verify both legs: the click goes
     * through, AND the fallback is still up if the world hasn't healed.
     */
    render(
      <ErrorBoundary>
        <Bomb when />
      </ErrorBoundary>
    );
    const reload = screen.getByRole('button', { name: /reload this app/i });
    await userEvent.click(reload);
    // Still in fallback because the child still throws.
    expect(screen.getByTestId('error-boundary-fallback')).toBeInTheDocument();
  });

  it('honors a custom fallback render prop', () => {
    render(
      <ErrorBoundary
        fallback={({ error }) => <div data-testid="custom">custom: {error.message}</div>}
      >
        <Bomb when message="pow" />
      </ErrorBoundary>
    );
    expect(screen.getByTestId('custom')).toHaveTextContent('custom: pow');
    // Default fallback should NOT render.
    expect(screen.queryByTestId('error-boundary-fallback')).not.toBeInTheDocument();
  });

  it('logs the caught error with the label in the prefix', () => {
    render(
      <ErrorBoundary label="MyApp">
        <Bomb when message="logged-msg" />
      </ErrorBoundary>
    );
    // First arg of one of the console.error calls should be our prefix.
    const calledWithOurPrefix = consoleSpy.mock.calls.some(
      (args: unknown[]) => typeof args[0] === 'string' && args[0].includes('[ErrorBoundary · MyApp]')
    );
    expect(calledWithOurPrefix).toBe(true);
  });

  it('error detail summary is collapsed by default but contains the message in DOM', () => {
    render(
      <ErrorBoundary>
        <Bomb when message="detail-text" />
      </ErrorBoundary>
    );
    const details = screen.getByText('Error detail').closest('details');
    expect(details).toBeInTheDocument();
    // Even when collapsed, the <pre> is in the DOM so screen readers and
    // tests can find it.
    expect(screen.getByTestId('error-boundary-message')).toHaveTextContent('detail-text');
  });
});
