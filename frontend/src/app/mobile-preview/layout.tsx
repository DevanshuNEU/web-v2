import type { Metadata } from 'next';

// Internal primitives gallery. Reachable, but never indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MobilePreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
