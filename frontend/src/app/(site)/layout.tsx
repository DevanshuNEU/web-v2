/**
 * Plain-HTML pages (/about, /projects, /projects/[slug], /resume, /writing).
 *
 * The desktop at / is a client-rendered OS, which crawlers and AI search see
 * as a near-empty shell. These pages carry the same content as real HTML,
 * built from data/, so every project and role has a URL that can rank and be
 * quoted. The document scrolls normally here; only the OS at / locks the body.
 *
 * Layout: the header and footer span a 768px frame; each page sets its own
 * reading measure inside it. Below 768px the name and "Open the OS" share the
 * first row and the section links take the second, so nothing wraps mid-label.
 * Viewport breakpoints are right here: these are pages, not OS windows.
 */

import Link from 'next/link';
import { Monitor } from 'lucide-react';
import { contactLinks } from '@/data/aboutMe';
import { PERSON_NAME } from '@/lib/site';
import SiteNav from './_components/SiteNav';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-text">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-4 focus:py-3 focus:text-text focus:border focus:border-border"
      >
        Skip to content
      </a>
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <header className="flex flex-wrap items-center gap-x-4 md:gap-x-6 py-3 sm:py-5 border-b border-border">
          <Link
            href="/about"
            className="order-1 mr-auto inline-flex min-h-[44px] items-center font-display text-[20px] sm:text-[22px] leading-none text-text whitespace-nowrap"
          >
            {PERSON_NAME}
          </Link>
          <SiteNav className="order-3 w-full md:order-2 md:w-auto" />
          <Link
            href="/"
            className="order-2 md:order-3 inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap border border-border px-3.5 text-[14px] font-medium text-text transition-colors hover:border-text"
          >
            <Monitor size={15} strokeWidth={1.75} aria-hidden className="max-[400px]:hidden" />
            Open the OS
          </Link>
        </header>

        <main id="main" className="py-10 sm:py-14">{children}</main>

        <footer className="flex flex-col gap-3 py-10 border-t border-border text-[15px] text-text-secondary">
          <p className="flex flex-wrap gap-x-6">
            <a href={`mailto:${contactLinks.email}`} className="inline-flex min-h-[44px] items-center hover:text-text">{contactLinks.email}</a>
            <a href={contactLinks.github} className="inline-flex min-h-[44px] items-center hover:text-text">GitHub</a>
            <a href={contactLinks.linkedin} className="inline-flex min-h-[44px] items-center hover:text-text">LinkedIn</a>
          </p>
          <p className="max-w-[34rem]">
            You&apos;re reading the plain version. The{' '}
            <Link href="/" className="text-text underline underline-offset-4">interactive one</Link>{' '}
            runs like a desktop OS.
          </p>
        </footer>
      </div>
    </div>
  );
}
