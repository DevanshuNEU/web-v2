"use client";

/**
 * AboutMeApp - "About Devanshu"
 *
 * A single vertically-scrolled, numbered editorial document. The desktop
 * variant pins a numbered index rail on the left (scroll-spy: an
 * IntersectionObserver highlights the section in view and clicking a row
 * scrolls to it). The mobile variant drops the rail for a single scroll.
 *
 * Random-access without hiding content: every section is always rendered,
 * the rail is navigation, not tabs.
 *
 * Persona: identity leaks from specifics (MCP / OCI / Saar / CallBudget),
 * never from role labels, degrees, graduation, or availability framing.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { useIsMono, usePalette } from "@/hooks/usePalette";
import { useTheme } from "@/store/themeStore";
import { Dither } from "@/components/signature";
import {
  Hairline,
  MetaLabel,
  EditorialSection,
  IndexRow,
} from "@/components/editorial";
import MobileSection from "@/components/mobile/ui/MobileSection";
import {
  identity,
  contactLinks,
  mastheadSpecLine,
  specs,
} from "@/data/aboutMe";
import { JourneySection } from "./about/JourneySection";
import { ExcitesSection } from "./about/ExcitesSection";
import { CurrentlySection } from "./about/CurrentlySection";
import { ContactSection } from "./about/ContactSection";

// ---------------------------------------------------------------------------
// Section registry - single source for both the rail and the document.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "overview",  number: "01", label: "Overview"        },
  { id: "journey",   number: "02", label: "Journey"         },
  { id: "excites",   number: "03", label: "What Excites Me" },
  { id: "currently", number: "04", label: "Currently"       },
  { id: "contact",   number: "05", label: "Contact"         },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const SECTION_DOM_ID = (id: SectionId) => `about-section-${id}`;

// ---------------------------------------------------------------------------
// Masthead - Dither portrait + serif name + mono spec-line + editorial chip.
// ---------------------------------------------------------------------------

function Masthead({ size = 140 }: { size?: number }) {
  const palette = usePalette();
  const mono = useIsMono();
  const { mode } = useTheme();
  // Re-read ink on palette AND light/dark change so the dither tracks theme.
  const paletteKey = `${palette}-${mode}`;

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-7">
      <div
        className="shrink-0 overflow-hidden"
        style={{ width: size, height: size }}
      >
        <Dither
          src={identity.photo}
          alt={identity.name}
          size={size}
          matrix={4}
          levels={2}
          paletteKey={paletteKey}
          priority
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 min-w-0">
        <h1 className="editorial-hero text-text leading-[1.02]">
          {identity.name}
        </h1>

        {/* Mono spec-line: MetaLabel cells separated by middots. */}
        <p className="flex flex-wrap items-center gap-x-1 gap-y-1">
          {mastheadSpecLine.map((cell, i) => (
            <React.Fragment key={cell}>
              {i > 0 && (
                <span aria-hidden className="font-mono-meta opacity-50">&middot;</span>
              )}
              <MetaLabel>{cell}</MetaLabel>
            </React.Fragment>
          ))}
        </p>

        {/* Availability - editorial chip: hairline border, filled square, no pulse. */}
        <span
          className={`inline-flex w-fit items-center gap-2 border px-2.5 py-1
                      ${mono
                        ? "border-border"
                        : "border-green-500/30"}`}
        >
          <span
            aria-hidden
            className={`h-2 w-2 ${mono ? "bg-text" : "bg-green-500"}`}
          />
          <MetaLabel className={mono ? undefined : "text-green-600 dark:text-green-400"}>
            Available
          </MetaLabel>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overview - spec sheet as a hairline-divided definition list.
// ---------------------------------------------------------------------------

function OverviewBody() {
  return (
    <div className="flex flex-col gap-8 max-w-[68ch]">
      <p className="text-lg text-text-secondary leading-relaxed">
        I build AI dev tools at the MCP layer: production MCP servers, retrieval
        that actually works, and tools people ship with.
      </p>

      <dl className="flex flex-col">
        <Hairline />
        {specs.map(({ key, value }) => (
          <React.Fragment key={key}>
            <div className="flex items-baseline gap-4 py-3">
              <dt className="shrink-0 w-32">
                <MetaLabel>{key}</MetaLabel>
              </dt>
              <dd className="flex-1 font-mono text-sm text-text leading-snug">
                {value}
              </dd>
            </div>
            <Hairline />
          </React.Fragment>
        ))}
      </dl>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section body dispatch.
// ---------------------------------------------------------------------------

function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case "overview":  return <OverviewBody />;
    case "journey":   return <JourneySection />;
    case "excites":   return <ExcitesSection />;
    case "currently": return <CurrentlySection />;
    case "contact":   return <ContactSection />;
  }
}

// ---------------------------------------------------------------------------
// Scroll-spy hook - observes section enter, drives active id + analytics.
// ---------------------------------------------------------------------------

function useScrollSpy(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  onEnter: (id: SectionId) => void,
) {
  const [active, setActive] = useState<SectionId>("overview");
  const onEnterRef = useRef(onEnter);
  onEnterRef.current = onEnter;

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    // Degrade gracefully where the API is absent (SSR, test env, old browsers):
    // the document still renders, scroll-spy simply stays inert.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry nearest the top of the viewport that is intersecting.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length === 0) return;
        const id = visible[0].target.getAttribute("data-section-id") as SectionId | null;
        if (!id) return;
        setActive((prev) => {
          if (prev !== id) onEnterRef.current(id);
          return id;
        });
      },
      {
        root,
        // Trip when a section crosses the upper third of the scroll area.
        rootMargin: "0px 0px -65% 0px",
        threshold: 0,
      },
    );

    const nodes = root.querySelectorAll<HTMLElement>("[data-section-id]");
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [scrollRef]);

  return active;
}

// ---------------------------------------------------------------------------
// Main app
// ---------------------------------------------------------------------------

interface AboutMeAppProps {
  variant?: "desktop" | "mobile";
}

export default function AboutMeApp({ variant = "desktop" }: AboutMeAppProps) {
  const trackEvent = useAnalyticsStore((state) => state.trackEvent);
  const reduced = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(
    (id: SectionId) => {
      trackEvent("section_view", `About Me: ${id}`, { section: id });
    },
    [trackEvent],
  );

  const active = useScrollSpy(scrollRef, handleEnter);

  const scrollTo = useCallback(
    (id: SectionId) => {
      const root = scrollRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(
        `#${SECTION_DOM_ID(id)}`,
      );
      if (!target) return;
      const top = target.offsetTop - 24;
      root.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced],
  );

  if (variant === "mobile") {
    return <AboutMeMobile />;
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── Sticky index rail ── */}
      <nav
        aria-label="About sections"
        className="hidden md:flex w-56 shrink-0 flex-col border-r border-border overflow-y-auto"
      >
        <div className="px-4 py-5">
          <MetaLabel as="p">About</MetaLabel>
        </div>
        <Hairline />
        <div className="px-2 py-2">
          {SECTIONS.map(({ id, number, label }) => (
            <IndexRow
              key={id}
              number={number}
              title={
                <span className="text-[clamp(0.95rem,2cqi,1.1rem)]">{label}</span>
              }
              active={active === id}
              hairline={false}
              onClick={() => scrollTo(id)}
            />
          ))}
        </div>
      </nav>

      {/* ── Scrolled editorial document ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-16">
          <Masthead size={140} />

          {SECTIONS.map(({ id, number, label }) => (
            <div
              key={id}
              id={SECTION_DOM_ID(id)}
              data-section-id={id}
              className="scroll-mt-6"
            >
              <EditorialSection
                number={number}
                eyebrow={label}
                title={label}
              >
                <SectionBody id={id} />
              </EditorialSection>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile layout - single scroll, no pill tabs, no push view.
// ---------------------------------------------------------------------------

function AboutMeMobile() {
  const trackEvent = useAnalyticsStore((state) => state.trackEvent);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleEnter = useCallback(
    (id: SectionId) => {
      trackEvent("section_view", `About Me: ${id}`, { section: id });
    },
    [trackEvent],
  );

  useScrollSpy(scrollRef, handleEnter);

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto bg-bg">
      <div
        className="flex flex-col gap-12 pb-12 pt-8"
        style={{ paddingLeft: "var(--sp-hero-pad)", paddingRight: "var(--sp-hero-pad)" }}
      >
        <Masthead size={120} />

        {/* Overview specs - list-shaped, MobileSection. */}
        <section id={SECTION_DOM_ID("overview")} data-section-id="overview" className="flex flex-col gap-4">
          <MetaLabel as="p"><span>01</span><span aria-hidden className="mx-2 opacity-50">/</span>Overview</MetaLabel>
          <p className="text-base text-text-secondary leading-relaxed">
            I build AI dev tools at the MCP layer: production MCP servers, retrieval
            that actually works, and tools people ship with.
          </p>
          <MobileSection>
            {specs.map(({ key, value }) => (
              <div key={key} className="flex items-baseline gap-3 px-4 py-3">
                <span className="shrink-0 w-24 text-label font-medium uppercase tracking-wider text-text-secondary">
                  {key}
                </span>
                <span className="flex-1 font-mono text-[13px] text-text leading-snug">
                  {value}
                </span>
              </div>
            ))}
          </MobileSection>
        </section>

        {/* Journey - narrative typeset block. */}
        <section id={SECTION_DOM_ID("journey")} data-section-id="journey" className="flex flex-col gap-4">
          <MetaLabel as="p"><span>02</span><span aria-hidden className="mx-2 opacity-50">/</span>Journey</MetaLabel>
          <h2 className="editorial-head text-text text-[clamp(1.5rem,8vw,2rem)]">Journey</h2>
          <Hairline />
          <JourneySection />
        </section>

        {/* What Excites Me - narrative typeset block. */}
        <section id={SECTION_DOM_ID("excites")} data-section-id="excites" className="flex flex-col gap-4">
          <MetaLabel as="p"><span>03</span><span aria-hidden className="mx-2 opacity-50">/</span>What Excites Me</MetaLabel>
          <h2 className="editorial-head text-text text-[clamp(1.5rem,8vw,2rem)]">What Excites Me</h2>
          <Hairline />
          <ExcitesSection />
        </section>

        {/* Currently - list-shaped via its own component. */}
        <section id={SECTION_DOM_ID("currently")} data-section-id="currently" className="flex flex-col gap-4">
          <MetaLabel as="p"><span>04</span><span aria-hidden className="mx-2 opacity-50">/</span>Currently</MetaLabel>
          <h2 className="editorial-head text-text text-[clamp(1.5rem,8vw,2rem)]">Currently</h2>
          <Hairline />
          <CurrentlySection />
        </section>

        {/* Contact - link rows. */}
        <section id={SECTION_DOM_ID("contact")} data-section-id="contact" className="flex flex-col gap-4">
          <MetaLabel as="p"><span>05</span><span aria-hidden className="mx-2 opacity-50">/</span>Contact</MetaLabel>
          <h2 className="editorial-head text-text text-[clamp(1.5rem,8vw,2rem)]">Contact</h2>
          <Hairline />
          <ContactSection />
        </section>
      </div>
    </div>
  );
}
