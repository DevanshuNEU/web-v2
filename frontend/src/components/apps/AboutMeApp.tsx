"use client";

/**
 * AboutMeApp - "About Devanshu"
 *
 * A single vertically-scrolled editorial document. When the WINDOW is wide
 * enough, an index rail pins to the left (scroll-spy: a scroll listener tracks
 * the section in view with a bottom-of-scroll fallback, so the short last
 * section still highlights; clicking a row scrolls to it). In a narrow window
 * and on mobile the rail is hidden and the document is a plain single scroll.
 *
 * Desktop and mobile render the SAME section list from SECTIONS below. Layout
 * keys off the window, never the viewport: `.about-app` is a query container
 * and every breakpoint is an @container rule in globals.css (about-* rules).
 *
 * Persona: identity leaks from specifics (MCP / OpenCodeIntel / Saar /
 * CallBudget), never from degrees, graduation, or visa framing.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { useOSStore } from "@/store/osStore";
import { useMobileStore } from "@/store/mobileStore";
import { useIsMono } from "@/hooks/usePalette";
import {
  Hairline,
  MetaLabel,
  EditorialSection,
} from "@/components/editorial";
import { reveal } from "@/lib/motion";
import {
  identity,
  mastheadSpecLine,
  oneLiner,
  specs,
  contactLinks,
} from "@/data/aboutMe";
import Portrait from "./about/Portrait";
import { SepList } from "./about/SepList";
import { OpinionsSection } from "./about/OpinionsSection";
import { BuildingSection } from "./about/BuildingSection";
import { JourneySection } from "./about/JourneySection";
import { OutsideSection } from "./about/OutsideSection";
import { ContactSection } from "./about/ContactSection";

// ---------------------------------------------------------------------------
// Section registry - single source for the rail and the document, on desktop
// and mobile alike. `rail` is the short label; `title` is the h2. Overview has
// no h2: the masthead's h1 is its heading.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: "overview", rail: "Overview",     title: null                      },
  { id: "opinions", rail: "Opinions",     title: "Things I'll argue about" },
  { id: "building", rail: "Building",     title: "What I'm building"       },
  { id: "journey",  rail: "Journey",      title: "Journey"                 },
  { id: "outside",  rail: "Outside code", title: "Outside code"            },
  { id: "contact",  rail: "Contact",      title: "Contact"                 },
] as const;

type SectionId = typeof SECTIONS[number]["id"];

const SECTION_DOM_ID = (id: SectionId) => `about-section-${id}`;

// ---------------------------------------------------------------------------
// Masthead - portrait, serif name, role line, one-liner, link row, chip.
//
// Stacked (photo above name) in a narrow window; photo left of the text once
// the window is wide enough (`.about-masthead` @container rule). The name is
// sized off its own column (`.about-masthead-text` is a container), so
// "Chicholikar" always fits on one line whatever the layout. On mount the
// pieces stagger in once; instant under reduced motion via `reveal`.
// ---------------------------------------------------------------------------

function Masthead({
  onOpenResume,
  onJumpToContact,
}: {
  onOpenResume: () => void;
  onJumpToContact: () => void;
}) {
  const mono = useIsMono();
  const reduced = useReducedMotion();

  const linkClass =
    "about-focus about-link inline-flex items-center border border-border px-3 text-text " +
    "transition-colors duration-150 hover:bg-text/[0.06]";

  return (
    <motion.header
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
      className="about-masthead"
    >
      <motion.div variants={reveal.item(reduced)}>
        <Portrait
          src={identity.photo}
          alt={`Portrait of ${identity.name}`}
          size={160}
          priority
          className="about-portrait"
        />
      </motion.div>

      <div className="about-masthead-text flex flex-col gap-4">
        <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-2">
          <h1 className="about-masthead-name font-display text-text">
            {identity.name}
          </h1>
          <SepList items={mastheadSpecLine} className="text-base text-text-secondary" />
        </motion.div>

        <motion.p
          variants={reveal.item(reduced)}
          className="text-lg text-text leading-relaxed max-w-[52ch]"
        >
          {oneLiner}
        </motion.p>

        {/* Contact path at the top: the four things a recruiter clicks. */}
        <motion.nav
          variants={reveal.item(reduced)}
          aria-label="Contact and links"
          className="flex flex-wrap gap-2"
        >
          <a href={`mailto:${contactLinks.email}`} className={linkClass}>
            Email
          </a>
          <button type="button" onClick={onOpenResume} className={linkClass}>
            Resume
          </button>
          <a href={contactLinks.github} target="_blank" rel="noopener noreferrer" className={linkClass}>
            GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={contactLinks.linkedin} target="_blank" rel="noopener noreferrer" className={linkClass}>
            LinkedIn
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </motion.nav>

        {/* Availability chip: hairline border, filled square, no pulse. Jumps
            to Contact, where the full roles line lives. */}
        <motion.div variants={reveal.item(reduced)}>
          <button
            type="button"
            onClick={onJumpToContact}
            className={`about-focus inline-flex w-fit items-center gap-2 border px-2.5 py-1.5
                        transition-colors duration-150 hover:bg-text/[0.06]
                        ${mono ? "border-border" : "border-green-500/30"}`}
          >
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 ${mono ? "bg-text" : "bg-green-500"}`}
            />
            <span
              className={`text-sm ${mono ? "text-text" : "text-green-600 dark:text-green-400"}`}
            >
              {identity.availabilityShort}
            </span>
            <span className="sr-only">: jump to Contact</span>
          </button>
        </motion.div>
      </div>
    </motion.header>
  );
}

// ---------------------------------------------------------------------------
// Overview - spec sheet as a hairline-divided definition list. Values that
// are a run of items render through SepList so a wrap never strands a dot.
// ---------------------------------------------------------------------------

function SpecSheet() {
  return (
    <dl className="flex flex-col max-w-[68ch]">
      <Hairline />
      {specs.map(({ key, value }) => (
        <React.Fragment key={key}>
          <div className="about-spec-row py-3">
            <dt>
              <MetaLabel>{key}</MetaLabel>
            </dt>
            <dd className="font-mono text-sm text-text leading-snug">
              <SepList items={value.split(" · ")} />
            </dd>
          </div>
          <Hairline />
        </React.Fragment>
      ))}
    </dl>
  );
}

function SectionBody({ id }: { id: Exclude<SectionId, "overview"> }) {
  switch (id) {
    case "opinions": return <OpinionsSection />;
    case "building": return <BuildingSection />;
    case "journey":  return <JourneySection />;
    case "outside":  return <OutsideSection />;
    case "contact":  return <ContactSection />;
  }
}

// ---------------------------------------------------------------------------
// Rail row - label row with a sliding active marker.
//
// The active indicator is a single thin monochrome bar shared across rows via
// framer-motion `layoutId`, so it GLIDES between rows on scroll/click instead
// of a heavy box jumping. Under reduced motion the layout animation collapses
// (layout transition duration 0) and the marker simply appears in place. Hover
// is a hairline label-underline grow plus a tiny translate, monochrome only.
// ---------------------------------------------------------------------------

const RAIL_MARKER_ID = "about-rail-active";

function RailRow({
  label,
  active,
  reduced,
  onClick,
}: {
  label: string;
  active: boolean;
  reduced: boolean | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="index-row"
      aria-current={active ? "true" : undefined}
      className="about-rail-row about-focus group relative flex w-full items-center px-4 text-left
                 transition-transform duration-150 ease-out motion-safe:active:scale-[0.98]"
    >
      {/* Sliding active marker: a thin graphite bar pinned to the row's left
          edge. layoutId makes it glide between rows. */}
      {active && (
        <motion.span
          layoutId={RAIL_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.1em] w-[2px] -translate-y-1/2 bg-text"
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 40, mass: 0.6 }
          }
        />
      )}

      <span
        className={`about-rail-label font-display min-w-0 flex-1 truncate transition-transform
                    ${active ? "text-text" : "text-text-secondary group-hover:text-text"}
                    ${reduced ? "" : "group-hover:translate-x-0.5"}`}
      >
        {label}
        {/* Hairline underline that grows on hover (transform-only). */}
        <span
          aria-hidden
          className="block h-px origin-left scale-x-0 bg-text/40 transition-transform
                     duration-200 group-hover:scale-x-100"
        />
      </span>
    </button>
  );
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

    let raf = 0;
    const setIfChanged = (id: SectionId) =>
      setActive((prev) => {
        if (prev !== id) onEnterRef.current(id);
        return id;
      });

    const compute = () => {
      raf = 0;
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("[data-section-id]"),
      );
      if (nodes.length === 0) return;

      // Bottom of scroll: a short last section can never cross a top trigger
      // line, so force it active at the end (fixes the last section, Contact,
      // never highlighting).
      const atBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      if (atBottom) {
        const last = nodes[nodes.length - 1].getAttribute("data-section-id");
        if (last) setIfChanged(last as SectionId);
        return;
      }

      // Active = last section whose top has passed a line ~32% down the area.
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.32;
      let current = nodes[0].getAttribute("data-section-id");
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) {
          current = node.getAttribute("data-section-id");
        } else {
          break;
        }
      }
      if (current) setIfChanged(current as SectionId);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return active;
}

// ---------------------------------------------------------------------------
// Main app - one layout for desktop and mobile. `variant` only decides how the
// Resume link opens (a window on desktop, a pushed app on mobile).
// ---------------------------------------------------------------------------

interface AboutMeAppProps {
  variant?: "desktop" | "mobile";
}

export default function AboutMeApp({ variant = "desktop" }: AboutMeAppProps) {
  const trackEvent = useAnalyticsStore((state) => state.trackEvent);
  const openWindow = useOSStore((state) => state.openWindow);
  const openMobileApp = useMobileStore((state) => state.openApp);
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
      const top =
        target.getBoundingClientRect().top -
        root.getBoundingClientRect().top +
        root.scrollTop -
        24;
      root.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    },
    [reduced],
  );

  const openResume = useCallback(() => {
    if (variant === "mobile") openMobileApp("resume");
    else openWindow("resume");
  }, [variant, openMobileApp, openWindow]);

  return (
    <div className={`about-app h-full flex overflow-hidden ${variant === "mobile" ? "bg-bg" : ""}`}>
      {/* Index rail: shown only when the WINDOW is wide (see .about-rail). */}
      <nav
        aria-label="About sections"
        className="about-rail shrink-0 flex-col border-r border-border overflow-y-auto py-4"
      >
        {SECTIONS.map(({ id, rail }) => (
          <RailRow
            key={id}
            label={rail}
            active={active === id}
            reduced={reduced}
            onClick={() => scrollTo(id)}
          />
        ))}
      </nav>

      <div ref={scrollRef} className="about-scroll flex-1 min-w-0 overflow-y-auto">
        {/* Sections reveal once on mount with a stagger (not on scroll): a
            windowed inner scroll container makes scroll-triggered reveals
            unreliable, so content must never depend on an in-view trigger. */}
        <motion.div
          className="about-doc mx-auto flex max-w-3xl flex-col"
          variants={reveal.container(reduced)}
          initial="hidden"
          animate="show"
        >
          {SECTIONS.map(({ id, title }) => (
            <motion.div
              key={id}
              id={SECTION_DOM_ID(id)}
              data-section-id={id}
              variants={reveal.item(reduced)}
            >
              {id === "overview" ? (
                <section aria-label="Overview" className="flex flex-col gap-10">
                  <Masthead
                    onOpenResume={openResume}
                    onJumpToContact={() => scrollTo("contact")}
                  />
                  <SpecSheet />
                </section>
              ) : (
                <EditorialSection title={title}>
                  <SectionBody id={id} />
                </EditorialSection>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
