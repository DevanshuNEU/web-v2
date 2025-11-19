'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-red-600 to-orange-600">
      <div className="text-white text-center max-w-md px-6">
        <h2 className="text-3xl font-bold mb-4">Oops! Something went wrong</h2>
        <p className="text-white/80 mb-6">
          The Portfolio OS encountered an unexpected error.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
