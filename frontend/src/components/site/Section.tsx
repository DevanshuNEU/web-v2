/**
 * Section block for the plain-HTML pages: a serif heading (the site's display
 * face, the same size as the item titles on /projects) over a hairline, then
 * the content. Server component, no motion.
 */

export default function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-14 flex flex-col gap-5">
      <h2 className="pb-3 border-b border-border font-display font-normal text-[1.75rem] leading-tight tracking-[-0.01em] text-text text-balance [overflow-wrap:normal]">
        {label}
      </h2>
      {children}
    </section>
  );
}
