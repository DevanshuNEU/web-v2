import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

// Internal primitives gallery for development. Never indexed, and a 404 in
// production so a visitor cannot land on a "Dev preview" page.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function MobilePreviewLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === 'production') notFound();
  return children;
}
