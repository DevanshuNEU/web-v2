'use client';

/**
 * ResumeApp - Editorial resume in the Instrument house language.
 *
 * Two modes, both reskinned into the monochrome editorial register:
 *   (a) "Read" - the interactive document: serif section heads, mono metadata,
 *       a hairline-divided experience timeline, an inline mono skills run, and
 *       IndexRow-style project rows. Every section is always rendered as one
 *       scrolled document with a numbered index rail (desktop) / numbered
 *       eyebrows (mobile). Random-access without hiding content.
 *   (b) "PDF" - the raw file in an iframe, with quiet editorial chrome.
 *
 * The mode toggle and the Download control are quiet editorial controls
 * (mono labels + hairlines), never filled accent buttons.
 *
 * Animation contract (shared with AboutMeApp): sections reveal ONCE on mount
 * via a staggered container; never on scroll. A windowed inner scroll container
 * makes in-view triggers unreliable, so content must never depend on one. The
 * desktop index rail uses an IntersectionObserver purely for scroll-spy
 * highlighting (guarded for SSR / test env), never to reveal content.
 *
 * Persona: the resume's own education facts (school / degree / period) render
 * as normal resume content. The constructed `tagline` field carries graduation
 * + seeking framing, so it is intentionally NOT rendered; the clean `title`
 * stands in as the role line.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  EditorialSection,
  Hairline,
  MetaLabel,
} from '@/components/editorial';
import { reveal, withReduced, spring } from '@/lib/motion';
import { RESUME } from '@/data/resume';

// ---------------------------------------------------------------------------
// Section registry - single source for the rail and the document.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'summary',    number: '01', label: 'Summary'    },
  { id: 'experience', number: '02', label: 'Experience' },
  { id: 'projects',   number: '03', label: 'Projects'   },
  { id: 'skills',     number: '04', label: 'Skills'     },
  { id: 'education',  number: '05', label: 'Education'   },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
type ViewMode = 'read' | 'pdf';

const SECTION_DOM_ID = (id: SectionId) => `resume-section-${id}`;

const PDF_HREF = '/resume.pdf';
const PDF_DOWNLOAD = 'Devanshu_Chicholikar_Resume.pdf';

// ---------------------------------------------------------------------------
// Masthead - serif name + mono role line + hairline-divided contact run.
// ---------------------------------------------------------------------------

function Masthead() {
  const reduced = useReducedMotion();
  const { email, github, linkedin, location } = RESUME.contact;

  // Contact cells as a mono run; first cell carries the role line above it.
  const contacts: { label: string; href?: string }[] = [
    { label: email, href: `mailto:${email}` },
    { label: github, href: `https://${github}` },
    { label: 'LinkedIn', href: `https://${linkedin}` },
    { label: location },
  ];

  return (
    <div className="flex flex-col gap-4">
      <motion.h1
        variants={reveal.item(reduced)}
        className="editorial-hero font-display text-text leading-[0.95]"
      >
        {RESUME.name}
      </motion.h1>

      {/* Role line - the clean `title`, not the persona-laden tagline. */}
      <motion.p variants={reveal.item(reduced)}>
        <MetaLabel>{RESUME.title}</MetaLabel>
      </motion.p>

      {/* Contact run - mono cells separated by middots, hairline above. */}
      <motion.div variants={reveal.item(reduced)} className="flex flex-col gap-3">
        <Hairline />
        <p className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {contacts.map((c, i) => (
            <React.Fragment key={c.label}>
              {i > 0 && (
                <span aria-hidden className="font-mono-meta opacity-40">
                  &middot;
                </span>
              )}
              {c.href ? (
                <a
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className="group inline-flex"
                >
                  <MetaLabel className="text-text-secondary transition-colors group-hover:text-text">
                    {c.label}
                  </MetaLabel>
                </a>
              ) : (
                <MetaLabel className="text-text-secondary">{c.label}</MetaLabel>
              )}
            </React.Fragment>
          ))}
        </p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section bodies - pure editorial typesetting, monochrome only.
// ---------------------------------------------------------------------------

function SummaryBody() {
  return (
    <p className="max-w-[68ch] text-lg leading-relaxed text-text-secondary">
      {RESUME.summary}
    </p>
  );
}

function ExperienceBody() {
  return (
    <ol className="flex flex-col">
      <Hairline />
      {RESUME.experience.map((job) => (
        <React.Fragment key={`${job.company}-${job.role}`}>
          <li className="flex flex-col gap-3 py-6">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-xl leading-tight text-text">
                  {job.role}
                </h3>
                <MetaLabel className="text-text-secondary">{job.company}</MetaLabel>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 sm:items-end">
                <MetaLabel as="p">{job.period}</MetaLabel>
                <MetaLabel as="p" className="text-text-secondary">
                  {job.location}
                </MetaLabel>
              </div>
            </div>

            <ul className="mt-1 flex flex-col gap-2">
              {job.bullets.map((b, i) => (
                <li
                  key={i}
                  className="flex gap-3 text-sm leading-relaxed text-text-secondary"
                >
                  <span aria-hidden className="mt-[0.5em] h-px w-3 shrink-0 bg-text/40" />
                  <span className="min-w-0">{b}</span>
                </li>
              ))}
            </ul>
          </li>
          <Hairline />
        </React.Fragment>
      ))}
    </ol>
  );
}

function ProjectsBody() {
  return (
    <div className="flex flex-col">
      <Hairline />
      {RESUME.projects.map((proj, idx) => (
        <a
          key={proj.name}
          href={`https://${proj.link}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-2 py-5 transition-colors hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"
        >
          <div className="flex items-baseline gap-4">
            <MetaLabel className="w-8 shrink-0 justify-start text-text-secondary">
              {String(idx + 1).padStart(2, '0')}
            </MetaLabel>
            <div className="flex flex-1 items-baseline justify-between gap-4 min-w-0">
              <h3 className="font-display text-xl leading-tight text-text truncate">
                {proj.name}
              </h3>
              <MetaLabel className="shrink-0 justify-end text-text-secondary">
                {proj.period}
              </MetaLabel>
            </div>
          </div>
          <div className="pl-12 flex flex-col gap-1.5">
            <MetaLabel className="text-text-secondary">{proj.tech}</MetaLabel>
            <p className="max-w-[64ch] text-sm leading-relaxed text-text-secondary">
              {proj.desc}
            </p>
          </div>
        </a>
      ))}
      <Hairline />
    </div>
  );
}

function SkillsBody() {
  return (
    <dl className="flex flex-col">
      <Hairline />
      {RESUME.skills.map((group) => (
        <React.Fragment key={group.category}>
          <div className="flex flex-col gap-2 py-4 sm:flex-row sm:gap-6">
            <dt className="shrink-0 sm:w-40">
              <MetaLabel>{group.category}</MetaLabel>
            </dt>
            <dd className="flex flex-1 flex-wrap items-baseline gap-x-1 gap-y-1">
              {group.items.map((skill, i) => (
                <React.Fragment key={skill}>
                  {i > 0 && (
                    <span aria-hidden className="font-mono-meta opacity-40">
                      &middot;
                    </span>
                  )}
                  <span className="font-mono text-[13px] leading-snug text-text">
                    {skill}
                  </span>
                </React.Fragment>
              ))}
            </dd>
          </div>
          <Hairline />
        </React.Fragment>
      ))}
    </dl>
  );
}

function EducationBody() {
  return (
    <ol className="flex flex-col">
      <Hairline />
      {RESUME.education.map((edu) => (
        <React.Fragment key={edu.institution}>
          <li className="flex flex-col gap-2 py-6">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
              <div className="flex flex-col gap-1">
                <h3 className="font-display text-xl leading-tight text-text">
                  {edu.institution}
                </h3>
                <MetaLabel className="text-text-secondary">{edu.degree}</MetaLabel>
              </div>
              <div className="flex shrink-0 flex-col gap-0.5 sm:items-end">
                <MetaLabel as="p">{edu.period}</MetaLabel>
                <MetaLabel as="p" className="text-text-secondary">
                  {edu.location}
                </MetaLabel>
              </div>
            </div>
            <p className="max-w-[64ch] text-sm leading-relaxed text-text-secondary">
              {edu.detail}
            </p>
          </li>
          <Hairline />
        </React.Fragment>
      ))}
    </ol>
  );
}

function SectionBody({ id }: { id: SectionId }) {
  switch (id) {
    case 'summary':    return <SummaryBody />;
    case 'experience': return <ExperienceBody />;
    case 'projects':   return <ProjectsBody />;
    case 'skills':     return <SkillsBody />;
    case 'education':  return <EducationBody />;
  }
}

// ---------------------------------------------------------------------------
// Quiet editorial controls - mode toggle + download, mono + hairline only.
// ---------------------------------------------------------------------------

function ModeToggle({
  mode,
  onMode,
  reduced,
}: {
  mode: ViewMode;
  onMode: (m: ViewMode) => void;
  reduced: boolean | null;
}) {
  const items: { id: ViewMode; label: string }[] = [
    { id: 'read', label: 'Read' },
    { id: 'pdf', label: 'PDF' },
  ];
  return (
    <div className="flex items-center gap-5">
      {items.map(({ id, label }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onMode(id)}
            aria-current={active ? 'true' : undefined}
            className="group relative focus-visible:outline-none"
          >
            <MetaLabel
              className={
                active
                  ? 'text-text'
                  : 'text-text-secondary transition-colors group-hover:text-text'
              }
            >
              {label}
            </MetaLabel>
            {active && (
              <motion.span
                layoutId="resume-mode-active"
                aria-hidden
                className="absolute -bottom-1 left-0 right-0 h-px bg-text"
                transition={withReduced(spring.window, reduced)}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DownloadControl() {
  return (
    <a
      href={PDF_HREF}
      download={PDF_DOWNLOAD}
      className="group inline-flex items-center focus-visible:outline-none"
    >
      <MetaLabel className="text-text-secondary transition-colors group-hover:text-text">
        Download PDF
      </MetaLabel>
      <span
        aria-hidden
        className="ml-2 block h-px w-4 origin-left scale-x-100 bg-text/40 transition-transform duration-200 group-hover:scale-x-150"
      />
    </a>
  );
}

// ---------------------------------------------------------------------------
// PDF surface - reskinned chrome around the unchanged iframe embed.
// ---------------------------------------------------------------------------

function PdfSurface() {
  return (
    <motion.div
      key="pdf"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-hidden bg-bg"
    >
      <iframe
        src={PDF_HREF}
        className="h-full w-full border-0"
        title="Resume PDF"
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Index rail (desktop) - numbered scroll-spy navigation, monochrome.
// ---------------------------------------------------------------------------

const RAIL_MARKER_ID = 'resume-rail-active';

function RailRow({
  number,
  label,
  active,
  reduced,
  onClick,
}: {
  number: string;
  label: string;
  active: boolean;
  reduced: boolean | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="rail-row"
      aria-current={active ? 'true' : undefined}
      className="group relative flex w-full items-center gap-3 px-4 py-2 text-left focus-visible:outline-none"
    >
      {active && (
        <motion.span
          layoutId={RAIL_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.1em] w-[2px] -translate-y-1/2 bg-text"
          transition={withReduced(
            { type: 'spring', stiffness: 520, damping: 40, mass: 0.6 },
            reduced,
          )}
        />
      )}
      <span
        className={`font-mono-meta shrink-0 transition-opacity ${
          active ? 'opacity-100' : 'opacity-50 group-hover:opacity-80'
        }`}
      >
        {number}
      </span>
      <span
        className={`font-display min-w-0 flex-1 truncate transition-transform ${
          active ? 'text-text' : 'text-text-secondary group-hover:text-text'
        } ${reduced ? '' : 'group-hover:translate-x-0.5'}`}
      >
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scroll-spy - highlights the rail row in view (never reveals content).
// ---------------------------------------------------------------------------

function useScrollSpy(scrollRef: React.RefObject<HTMLDivElement | null>) {
  const [active, setActive] = useState<SectionId>('summary');

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    let raf = 0;
    const compute = () => {
      raf = 0;
      const nodes = Array.from(
        root.querySelectorAll<HTMLElement>('[data-section-id]'),
      );
      if (nodes.length === 0) return;

      // Bottom of scroll: the last section can never cross a top trigger line
      // when it is short, so force it active once we reach the end. This is the
      // fix for the last section (Education) never highlighting.
      const atBottom =
        root.scrollTop + root.clientHeight >= root.scrollHeight - 4;
      if (atBottom) {
        const last = nodes[nodes.length - 1].getAttribute('data-section-id');
        if (last) setActive(last as SectionId);
        return;
      }

      // Otherwise the active section is the last one whose top has passed a
      // trigger line ~32% down the scroll container.
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.32;
      let current = nodes[0].getAttribute('data-section-id');
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) {
          current = node.getAttribute('data-section-id');
        } else {
          break;
        }
      }
      if (current) setActive(current as SectionId);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    compute();
    root.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      root.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef]);

  return active;
}

// ---------------------------------------------------------------------------
// Read document - the scrolled editorial body (shared by desktop + mobile).
// ---------------------------------------------------------------------------

function ReadDocument({
  scrollRef,
  reduced,
  withMasthead,
  padClass,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  reduced: boolean | null;
  withMasthead: boolean;
  padClass: string;
}) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <motion.div
        className={`mx-auto flex max-w-3xl flex-col gap-16 ${padClass}`}
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
      >
        {withMasthead && <Masthead />}

        {SECTIONS.map(({ id, number, label }) => (
          <motion.div
            key={id}
            id={SECTION_DOM_ID(id)}
            data-section-id={id}
            variants={reveal.item(reduced)}
          >
            <EditorialSection number={number} eyebrow={label} title={label}>
              <SectionBody id={id} />
            </EditorialSection>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile layout - single scroll, numbered eyebrows, sticky quiet controls.
// ---------------------------------------------------------------------------

function ResumeMobile() {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<ViewMode>('read');
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Header - name, role, quiet controls. */}
      <div
        className="app-toolbar flex shrink-0 flex-col gap-3 border-b pb-3 pt-5"
        style={{
          paddingLeft: 'var(--sp-hero-pad)',
          paddingRight: 'var(--sp-hero-pad)',
        }}
      >
        <h1 className="font-display text-2xl leading-tight text-text">
          {RESUME.name}
        </h1>
        <MetaLabel className="text-text-secondary">{RESUME.title}</MetaLabel>
        <div className="flex items-center justify-between">
          <ModeToggle mode={mode} onMode={setMode} reduced={reduced} />
          <DownloadControl />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'pdf' ? (
          <PdfSurface key="pdf" />
        ) : (
          <motion.div
            key="read"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 flex-col overflow-hidden"
          >
            <ReadDocument
              scrollRef={scrollRef}
              reduced={reduced}
              withMasthead={false}
              padClass="px-[var(--sp-hero-pad)] py-8"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app - desktop default, mobile branch.
// ---------------------------------------------------------------------------

export default function ResumeApp({
  variant,
}: { variant?: 'desktop' | 'mobile' } = {}) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<ViewMode>('read');
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useScrollSpy(scrollRef);

  const scrollTo = useCallback(
    (id: SectionId) => {
      const root = scrollRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(`#${SECTION_DOM_ID(id)}`);
      if (!target) return;
      root.scrollTo({
        top: target.offsetTop - 24,
        behavior: reduced ? 'auto' : 'smooth',
      });
    },
    [reduced],
  );

  if (variant === 'mobile') {
    return <ResumeMobile />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top bar - name + role left, quiet controls right. */}
      <div className="app-toolbar flex shrink-0 items-end justify-between gap-6 border-b px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-2xl leading-tight text-text">
            {RESUME.name}
          </h1>
          <MetaLabel className="text-text-secondary">{RESUME.title}</MetaLabel>
        </div>
        <div className="flex shrink-0 items-center gap-6">
          <ModeToggle mode={mode} onMode={setMode} reduced={reduced} />
          <span aria-hidden className="self-stretch">
            <Hairline orientation="vertical" />
          </span>
          <DownloadControl />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'pdf' ? (
          <PdfSurface key="pdf" />
        ) : (
          <motion.div
            key="read"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-1 overflow-hidden"
          >
            {/* Index rail. */}
            <nav
              aria-label="Resume sections"
              className="hidden w-44 shrink-0 flex-col overflow-y-auto border-r border-border md:flex"
            >
              <div className="px-4 py-5">
                <MetaLabel as="p">Resume</MetaLabel>
              </div>
              <Hairline />
              <div className="flex flex-col py-2">
                {SECTIONS.map(({ id, number, label }) => (
                  <RailRow
                    key={id}
                    number={number}
                    label={label}
                    active={active === id}
                    reduced={reduced}
                    onClick={() => scrollTo(id)}
                  />
                ))}
              </div>
            </nav>

            <ReadDocument
              scrollRef={scrollRef}
              reduced={reduced}
              withMasthead
              padClass="px-8 py-10 sm:px-10 sm:py-12"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
