import React from "react";
import { Hairline, MetaLabel } from "@/components/editorial";
import { contactLinks } from "@/data/aboutMe";

/**
 * ContactSection - three hairline-divided link rows.
 *
 * Label left, mono glyph right. Email is a plain mailto text link (no filled
 * button, no scale-on-hover). Strictly monochrome chrome.
 */

interface LinkRowProps {
  label: string;
  value: string;
  href: string;
  external?: boolean;
  glyph: string;
}

function LinkRow({ label, value, href, external, glyph }: LinkRowProps) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex items-center gap-4 py-4 px-1 text-left
                 transition-[background-color,transform] duration-150 ease-out
                 hover:bg-black/[0.035] dark:hover:bg-white/[0.05]
                 motion-safe:active:scale-[0.99]
                 focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
    >
      <MetaLabel className="shrink-0 w-24 justify-start">{label}</MetaLabel>
      <span className="flex-1 min-w-0 font-mono text-sm text-text truncate">
        {value}
        {/* Hairline underline grows on hover (transform-only, monochrome).
            Collapses to no motion under the global reduced-motion safety net. */}
        <span
          aria-hidden
          className="block h-px origin-left scale-x-0 bg-text/40 transition-transform
                     duration-200 group-hover:scale-x-100 motion-reduce:transition-none"
        />
      </span>
      <MetaLabel
        className="shrink-0 justify-end transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
        aria-hidden
      >
        {glyph}
      </MetaLabel>
    </a>
  );
}

export function ContactSection() {
  return (
    <div className="flex flex-col gap-8 max-w-[68ch]">
      <p className="text-lg text-text-secondary leading-relaxed">
        Always open to discussing opportunities, collaborations, or just chatting
        about tech.
      </p>

      <div className="flex flex-col">
        <Hairline />
        <LinkRow label="Email" value={contactLinks.email} href={`mailto:${contactLinks.email}`} glyph="↗" />
        <Hairline />
        <LinkRow label="LinkedIn" value={contactLinks.linkedin} href={contactLinks.linkedin} external glyph="↗" />
        <Hairline />
        <LinkRow label="GitHub" value={contactLinks.github} href={contactLinks.github} external glyph="↗" />
        <Hairline />
      </div>
    </div>
  );
}
