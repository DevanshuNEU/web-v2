/**
 * Route loading state: a plain black screen with a hairline progress bar, so
 * nothing flashes before the boot intro or the desktop paints.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="fixed inset-0 bg-black">
      <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
        <div className="h-full w-1/3 bg-white/40 animate-[loading_1.5s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}
