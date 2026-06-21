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
                 hover:bg-black/[0.035] dark:hover:bg-white/[0.05] transition-colors
                 focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
    >
      <MetaLabel className="shrink-0 w-24 justify-start">{label}</MetaLabel>
      <span className="flex-1 min-w-0 font-mono text-sm text-text truncate group-hover:text-text">
        {value}
      </span>
      <MetaLabel className="shrink-0 justify-end" aria-hidden>{glyph}</MetaLabel>
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
