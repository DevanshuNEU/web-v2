'use client';

/**
 * /mobile-preview — internal dev page showing every mobile UI primitive
 * inside a phone-shaped frame. Not linked from anywhere in the product;
 * exists purely to review primitives in isolation as they're built.
 *
 * Open at http://localhost:3000/mobile-preview
 */

import { useState } from 'react';
import { Plus, MoreHorizontal, Share } from 'lucide-react';
import MobileNavBar from '@/components/mobile/ui/MobileNavBar';

export default function MobilePreviewPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  return (
    <div className="min-h-screen bg-neutral-200 dark:bg-neutral-900 flex flex-col items-center gap-8 py-10 px-4">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
          Mobile UI Primitives
        </h1>
        <p className="text-sm text-neutral-500 mt-1">
          Dev preview · iOS-native primitives in isolation
        </p>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="mt-4 px-4 py-2 rounded-lg bg-neutral-800 dark:bg-neutral-700 text-white text-sm"
        >
          Toggle theme: {theme}
        </button>
      </div>

      {/* Primitives gallery */}
      <Section title="MobileNavBar">
        <PhoneFrame theme={theme}>
          <MobileNavBar title="Settings" />
          <Divider />
          <MobileNavBar title="Detail" onBack={() => alert('back')} />
          <Divider />
          <MobileNavBar
            title="Detail"
            onBack={() => alert('back')}
            backLabel="Projects"
          />
          <Divider />
          <MobileNavBar
            title="Projects"
            rightAction={<IconButton icon={<Plus size={22} />} label="Add" />}
          />
          <Divider />
          <MobileNavBar
            title="A really long title that has to truncate gracefully"
            onBack={() => {}}
            backLabel="Settings"
            rightAction={<IconButton icon={<MoreHorizontal size={22} />} label="More" />}
          />
          <Divider />
          <MobileNavBar
            title={<span className="font-mono text-[15px] tracking-wide">/Users/devanshu</span>}
            onBack={() => {}}
            rightAction={
              <button className="text-accent text-[16px] font-medium px-2 py-1 active:opacity-50">
                Share
              </button>
            }
          />
        </PhoneFrame>
      </Section>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-md flex flex-col gap-3">
      <h2 className="text-xs font-mono uppercase tracking-widest text-neutral-500">
        {title}
      </h2>
      {children}
    </div>
  );
}

function PhoneFrame({
  theme,
  children,
}: {
  theme: 'light' | 'dark';
  children: React.ReactNode;
}) {
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="rounded-[36px] border-[10px] border-neutral-900 dark:border-neutral-700 overflow-hidden shadow-xl bg-bg text-text">
        {children}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-black/8 dark:bg-white/8" />;
}

function IconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="touch-target flex items-center justify-center text-accent active:opacity-50 transition-opacity"
    >
      {icon}
    </button>
  );
}
