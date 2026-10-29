import Link from 'next/link';
import { bsodCopy } from '@/data/copy';

const LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/resume', label: 'Resume' },
  { href: '/about', label: 'About' },
];

export default function NotFound() {
  return (
    <main className="min-h-screen w-full bg-bg text-text flex items-center px-6 py-16">
      <div className="mx-auto w-full max-w-xl">
        <p className="font-mono text-[12px] text-text-secondary">Error {bsodCopy.errorCode}</p>
        <h1 className="mt-3 font-serif text-[clamp(2.25rem,7vw,3.5rem)] leading-[1.05] tracking-[-0.01em] [text-wrap:balance]">
          {bsodCopy.title}
        </h1>
        <p className="mt-4 text-[16px] leading-relaxed text-text-secondary">{bsodCopy.description}</p>

        <div className="mt-8 h-px bg-border" />

        <nav aria-label="Where to go next" className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[15px]">
          <Link
            href="/"
            className="rounded-md bg-text px-4 py-2 font-medium text-bg transition-opacity hover:opacity-90"
          >
            {bsodCopy.buttonText}
          </Link>
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-text underline decoration-border underline-offset-4 transition-colors hover:decoration-text"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
