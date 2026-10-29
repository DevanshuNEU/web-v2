import React from "react";
import { Hairline, MetaLabel } from "@/components/editorial";
import { contactLinks, displayUrl, identity, lookingFor } from "@/data/aboutMe";

/**
 * ContactSection - the roles line, three hairline-divided link rows, then
 * what I'm looking for in a team.
 *
 * Label left, readable link text (no https://) middle, mono glyph right.
 * Focus is a full outline ring (.about-focus), not a faint tint. Strictly
 * monochrome chrome.
 */

interface LinkRowProps {
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

function LinkRow({ label, value, href, external }: LinkRowProps) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="about-focus about-contact-row group text-left
                 transition-[background-color,transform] duration-150 ease-out
                 hover:bg-black/[0.035] dark:hover:bg-white/[0.05]
                 motion-safe:active:scale-[0.99]"
    >
      <MetaLabel className="justify-start">{label}</MetaLabel>
      <span className="min-w-0 about-contact-value font-mono text-sm text-text">
        {value}
        {/* Hairline underline grows on hover (transform-only, monochrome).
            Collapses to no motion under the global reduced-motion safety net. */}
        <span
          aria-hidden
          className="block h-px origin-left scale-x-0 bg-text/40 transition-transform
                     duration-200 group-hover:scale-x-100 motion-reduce:transition-none"
        />
      </span>
      <span
        aria-hidden
        className="font-mono text-sm text-text-secondary transition-transform
                   group-hover:translate-x-0.5 motion-reduce:transform-none"
      >
        ↗
      </span>
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}

export function ContactSection() {
  return (
    <div className="flex flex-col gap-8 max-w-[68ch]">
      <p className="text-lg text-text-secondary leading-relaxed">
        {identity.availability}. I want to sit close to the people using the
        thing, write the code, and measure whether it worked.
      </p>

      <div className="flex flex-col">
        <Hairline />
        <LinkRow label="Email" value={contactLinks.email} href={`mailto:${contactLinks.email}`} />
        <Hairline />
        <LinkRow label="LinkedIn" value={displayUrl(contactLinks.linkedin)} href={contactLinks.linkedin} external />
        <Hairline />
        <LinkRow label="GitHub" value={displayUrl(contactLinks.github)} href={contactLinks.github} external />
        <Hairline />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="editorial-head text-text">What I&apos;m looking for</h3>
        <ul className="flex flex-col gap-2 text-lg text-text-secondary leading-relaxed list-disc pl-5 marker:text-text-secondary">
          {lookingFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
