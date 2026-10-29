'use client';

/**
 * Plain-page nav. A client component only so it can mark the current section
 * (aria-current plus full-contrast ink). Every link is a 44px-tall target.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/resume', label: 'Resume' },
  { href: '/writing', label: 'Writing' },
];

export default function SiteNav({ className = '' }: { className?: string }) {
  const pathname = usePathname() ?? '';

  return (
    <nav aria-label="Site" className={className}>
      <ul className="flex items-center gap-x-5 sm:gap-x-6">
        {NAV.map(item => {
          const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? 'page' : undefined}
                className={`inline-flex min-h-[44px] items-center whitespace-nowrap text-[15px] transition-colors ${
                  current
                    ? 'text-text underline decoration-1 underline-offset-[6px]'
                    : 'text-text-secondary hover:text-text'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
