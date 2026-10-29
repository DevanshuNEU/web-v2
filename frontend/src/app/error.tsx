'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-screen w-full bg-bg text-text flex items-center px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <p className="font-mono text-[12px] text-text-secondary">Error</p>
        <h1 className="mt-3 font-serif text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05] tracking-[-0.01em]">
          Something broke.
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">
          devOS hit an error. Try again, or go back to the desktop.
        </p>

        <div className="mt-8 h-px bg-border" />

        <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-text px-4 py-2 font-medium text-bg transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-text underline decoration-border underline-offset-4 transition-colors hover:decoration-text"
          >
            Go to the desktop
          </Link>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-[12px] text-text-secondary">Reference: {error.digest}</p>
        )}
      </div>
    </main>
  );
}
