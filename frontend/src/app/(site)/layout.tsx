/**
 * Plain-HTML pages (/about, /projects, /projects/[slug], /resume).
 *
 * The desktop at / is a client-rendered OS, which crawlers and AI search see
 * as a near-empty shell. These pages carry the same content as real HTML,
 * built from data/, so every project and role has a URL that can rank and be
 * quoted. The body is overflow-hidden for the OS, so this shell scrolls itself.
 */

import Link from 'next/link';
import { contactLinks } from '@/data/aboutMe';
import { PERSON_NAME } from '@/lib/site';

const NAV = [
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/resume', label: 'Resume' },
];

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-y-auto bg-bg text-text">
      <div className="mx-auto max-w-3xl px-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-8 border-b border-border">
          <Link href="/about" className="font-display text-[22px] text-text">
            {PERSON_NAME}
          </Link>
          <nav aria-label="Site" className="flex items-center gap-5">
            {NAV.map(item => (
              <Link key={item.href} href={item.href} className="font-mono-meta text-text-secondary hover:text-text">
                {item.label}
              </Link>
            ))}
            <Link href="/" className="font-mono-meta text-text underline underline-offset-4">
              Boot devOS
            </Link>
          </nav>
        </header>

        <main className="py-12">{children}</main>

        <footer className="flex flex-col gap-3 py-10 border-t border-border text-[14px] text-text-secondary">
          <p className="flex flex-wrap gap-x-5 gap-y-1">
            <a href={`mailto:${contactLinks.email}`} className="hover:text-text">{contactLinks.email}</a>
            <a href={contactLinks.github} className="hover:text-text">GitHub</a>
            <a href={contactLinks.linkedin} className="hover:text-text">LinkedIn</a>
          </p>
          <p>
            This is the plain version of devanshuchicholikar.com. The real one{' '}
            <Link href="/" className="text-text underline underline-offset-4">boots</Link>.
          </p>
        </footer>
      </div>
    </div>
  );
}
