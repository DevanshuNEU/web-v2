/**
 * Section block for the plain-HTML pages: a mono label over a hairline, then
 * the content. Server component, no motion.
 */

import MetaLabel from '@/components/editorial/MetaLabel';

export default function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 flex flex-col gap-5">
      <h2 className="pb-3 border-b border-border">
        <MetaLabel className="text-text-secondary">{label}</MetaLabel>
      </h2>
      {children}
    </section>
  );
}
