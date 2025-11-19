import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-blue-600">
      <div className="text-white text-center max-w-md px-6">
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-white/80 mb-6">
          The page you're looking for doesn't exist in Portfolio OS.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          Back to Desktop
        </Link>
      </div>
    </div>
  );
}
