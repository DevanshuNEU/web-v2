'use client';

/**
 * ResumeApp - the resume as a readable document, plus the PDF.
 *
 * Two modes:
 *   (a) "Text" - the document: serif section heads, one scrolled column, a
 *       scroll-spy index rail when the window is wide enough for it.
 *   (b) "PDF" - the file itself in an iframe.
 *
 * The toolbar carries the only copy of the name (the one h1), the role line,
 * the contacts and a filled "Download PDF" button, so the document opens on
 * content, not on a second masthead.
 *
 * Window-dynamic: layout keys off the WINDOW through container queries in the
 * scoped <style> below, never the viewport (the root is the `rsroot` query
 * container, as wide as the window). The rail shows from a 720px window; the document scroller is its own query container (`rsdoc`), so date
 * columns sit beside their rows only when the column has room.
 *
 * Phone: no PDF mode (iOS cannot embed PDFs). One "Open PDF" button in a
 * slim sticky row; everything else scrolls away.
 *
 * Animation contract (shared with AboutMeApp): sections reveal ONCE on mount
 * via a staggered container, never on scroll. The rail uses scroll position
 * only for highlighting, never to reveal content.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Download, ExternalLink } from 'lucide-react';
import { EditorialSection } from '@/components/editorial';
import { reveal, withReduced, spring } from '@/lib/motion';
import { RESUME } from '@/data/resume';

// ---------------------------------------------------------------------------
// Section registry - single source for the rail and the document. Order
// follows the PDF (Projects, Skills, Experience, Education), summary first.
// ---------------------------------------------------------------------------

const SECTIONS = [
  { id: 'summary',    label: 'Summary'    },
  { id: 'projects',   label: 'Projects'   },
  { id: 'skills',     label: 'Skills'     },
  { id: 'experience', label: 'Experience' },
  { id: 'education',  label: 'Education'  },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];
type ViewMode = 'read' | 'pdf';

const SECTION_DOM_ID = (id: SectionId) => `resume-section-${id}`;

const PDF_HREF = '/resume.pdf';
const PDF_DOWNLOAD = 'Devanshu_Chicholikar_Resume.pdf';

const SCOPED_CSS = `
/* Narrow window: the toolbar keeps only the name and the controls; the role
   line and contacts open the document instead, so they scroll away. */
[data-resume-root] { container: rsroot / inline-size; }
[data-resume-rail], [data-resume-intro="toolbar"] { display: none; }
[data-resume-intro="doc"] { display: flex; }
@container rsroot (min-width: 640px) {
  [data-resume-intro="toolbar"] { display: flex; }
  [data-resume-intro="doc"] { display: none; }
}
@container rsroot (min-width: 720px) {
  [data-resume-rail] { display: flex; }
}

[data-resume-doc] { container: rsdoc / inline-size; }
[data-resume-page] { padding: 1.75rem 1.25rem 3rem; }
[data-resume-compact] [data-resume-page] { padding-top: 1.25rem; }
[data-resume-root] h2.editorial-head {
  font-size: clamp(1.5rem, 4cqi, 2rem);
  overflow-wrap: normal;
  text-wrap: balance;
}
[data-resume-row] { display: flex; flex-direction: column; gap: 0.25rem; }
[data-resume-skill] { display: flex; flex-direction: column; gap: 0.25rem; }

@container rsdoc (min-width: 520px) {
  [data-resume-page] { padding: 2.5rem 2.5rem 4rem; }
  [data-resume-row] {
    flex-direction: row;
    align-items: baseline;
    justify-content: space-between;
    gap: 1.5rem;
  }
  [data-resume-row] > :last-child { text-align: right; flex-shrink: 0; }
  [data-resume-skill] {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr);
    gap: 1.5rem;
  }
}
`;

// ---------------------------------------------------------------------------
// Contacts - plain words in one run, no separators to dangle when they wrap.
// ---------------------------------------------------------------------------

function ContactRow({ compact = false }: { compact?: boolean }) {
  const { email, github, linkedin } = RESUME.contact;
  const contacts = [
    { label: email, href: `mailto:${email}` },
    { label: 'GitHub', href: `https://${github}` },
    { label: 'LinkedIn', href: `https://${linkedin}` },
  ];
  return (
    <p className={`flex flex-wrap items-center gap-x-4 gap-y-1 ${compact ? 'text-[13px]' : 'text-[14px]'}`}>
      {contacts.map(c => (
        <a
          key={c.label}
          href={c.href}
          target={c.href.startsWith('http') ? '_blank' : undefined}
          rel="noopener noreferrer"
          className="text-text-secondary underline decoration-text/25 underline-offset-4 transition-colors hover:text-text"
        >
          {c.label}
        </a>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Section bodies.
// ---------------------------------------------------------------------------

function SummaryBody() {
  return (
    <p className="max-w-[68ch] text-[17px] leading-relaxed text-text-secondary">
      {RESUME.summary}
    </p>
  );
}

function Dates({ period, location }: { period: string; location?: string }) {
  return (
    <span className="flex flex-col gap-0.5">
      <span className="font-mono text-[13px] text-text tabular-nums">{period}</span>
      {location && <span className="text-[13px] text-text-secondary">{location}</span>}
    </span>
  );
}

function ProjectsBody() {
  return (
    <div className="flex flex-col">
      {RESUME.projects.map((proj, i) => {
        const inner = (
          <>
            <div data-resume-row>
              <h3 className="font-display text-[1.25rem] leading-tight text-text">{proj.name}</h3>
              <Dates period={proj.period} />
            </div>
            {proj.role && <p className="text-[14px] font-medium text-text">{proj.role}</p>}
            <p className="font-mono text-[12px] leading-relaxed text-text-secondary">{proj.tech.split(' · ').join(', ')}</p>
            <p className="max-w-[66ch] text-[15px] leading-relaxed text-text-secondary">{proj.desc}</p>
            {proj.link && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-text underline decoration-text/30 underline-offset-4">
                {proj.link} <ExternalLink size={12} aria-hidden />
              </span>
            )}
          </>
        );
        const cls = `flex flex-col gap-2 py-5 ${i > 0 ? 'border-t border-border' : ''}`;
        return proj.link ? (
          <a
            key={proj.name}
            href={`https://${proj.link}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${cls} -mx-3 px-3 transition-colors focus-visible:-outline-offset-2 [@media(hover:hover)and(pointer:fine)]:hover:bg-black/[0.025] dark:[@media(hover:hover)and(pointer:fine)]:hover:bg-white/[0.04]`}
          >
            {inner}
          </a>
        ) : (
          <div key={proj.name} className={cls}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

function ExperienceBody() {
  return (
    <ol className="flex flex-col">
      {RESUME.experience.map((job, i) => (
        <li
          key={`${job.company}-${job.role}`}
          className={`flex flex-col gap-3 py-5 ${i > 0 ? 'border-t border-border' : ''}`}
        >
          <div data-resume-row>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-[1.25rem] leading-tight text-text">{job.company}</h3>
              <p className="text-[14px] leading-snug text-text">{job.role}</p>
            </div>
            <Dates period={job.period} location={job.location} />
          </div>
          <ul className="flex flex-col gap-2">
            {job.bullets.map((b, j) => (
              <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-text-secondary">
                <span aria-hidden className="mt-[0.75em] h-px w-3 shrink-0 bg-text/40" />
                <span className="min-w-0">{b}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function SkillsBody() {
  return (
    <dl className="flex flex-col">
      {RESUME.skills.map((group, i) => (
        <div
          key={group.category}
          data-resume-skill
          className={`py-3.5 ${i > 0 ? 'border-t border-border' : ''}`}
        >
          <dt className="text-[14px] font-medium leading-snug text-text">{group.category}</dt>
          <dd className="text-[15px] leading-relaxed text-text-secondary">{group.items.join(', ')}</dd>
        </div>
      ))}
    </dl>
  );
}

function EducationBody() {
  return (
    <ol className="flex flex-col">
      {RESUME.education.map((edu, i) => (
        <li
          key={edu.institution}
          className={`flex flex-col gap-2 py-5 ${i > 0 ? 'border-t border-border' : ''}`}
        >
          <div data-resume-row>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-[1.25rem] leading-tight text-text">{edu.institution}</h3>
              <p className="text-[14px] leading-snug text-text">{edu.degree}</p>
            </div>
            <Dates period={edu.period} location={edu.location} />
          </div>
          <p className="max-w-[66ch] text-[15px] leading-relaxed text-text-secondary">{edu.detail}</p>
        </li>
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
// Controls - view toggle and the filled Download button.
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
    { id: 'read', label: 'Text' },
    { id: 'pdf', label: 'PDF' },
  ];
  return (
    <div role="group" aria-label="View" className="flex items-center gap-1">
      {items.map(({ id, label }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onMode(id)}
            aria-pressed={active}
            className={`relative inline-flex h-8 items-center px-2 text-[14px] font-medium transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] motion-reduce:transition-none motion-reduce:active:scale-100 ${
              active ? 'text-text' : 'text-text-secondary hover:text-text'
            }`}
          >
            {label}
            {active && (
              <motion.span
                layoutId="resume-mode-active"
                aria-hidden
                className="absolute bottom-1 left-2 right-2 h-px bg-text"
                transition={withReduced(spring.window, reduced)}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

function DownloadButton({ label = 'Download PDF', open = false }: { label?: string; open?: boolean }) {
  return (
    <a
      href={PDF_HREF}
      {...(open ? { target: '_blank', rel: 'noopener noreferrer' } : { download: PDF_DOWNLOAD })}
      className={`inline-flex shrink-0 items-center gap-2 bg-text px-3 text-[14px] font-medium text-bg transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 ${
        open ? 'h-11' : 'h-8'
      }`}
    >
      {open ? <ExternalLink size={15} aria-hidden /> : <Download size={15} aria-hidden />}
      {label}
    </a>
  );
}

// ---------------------------------------------------------------------------
// PDF surface - iframe embed with an iOS fallback (iPad in desktop mode).
// ---------------------------------------------------------------------------

function usePdfEmbedSupported(): boolean {
  const [supported, setSupported] = useState(true);
  useEffect(() => {
    // All browsers on iOS (iPhone/iPad) use WebKit and cannot embed PDFs.
    // iPad Pro in desktop mode reports MacIntel but has maxTouchPoints > 1.
    const ua = navigator.userAgent;
    const isIOS =
      /iPhone|iPad|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS) setSupported(false);
  }, []);
  return supported;
}

const FADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const } },
  exit: { opacity: 0, transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] as const } },
};

function PdfSurface() {
  const canEmbed = usePdfEmbedSupported();

  if (!canEmbed) {
    return (
      <motion.div
        key="pdf-fallback"
        {...FADE}
        className="flex flex-1 flex-col items-center justify-center gap-4 bg-bg px-8"
      >
        <p className="max-w-[36ch] text-center text-[15px] leading-relaxed text-text-secondary">
          This browser cannot show the PDF inline.
        </p>
        <DownloadButton label="Open PDF" open />
      </motion.div>
    );
  }

  return (
    <motion.div key="pdf" {...FADE} className="flex-1 overflow-hidden bg-bg">
      <iframe src={PDF_HREF} className="h-full w-full border-0" title="Resume PDF" />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Index rail - scroll-spy navigation.
// ---------------------------------------------------------------------------

const RAIL_MARKER_ID = 'resume-rail-active';

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
      data-testid="rail-row"
      aria-current={active ? 'true' : undefined}
      className="group relative flex w-full origin-left items-center px-4 py-2 text-left transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:-outline-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      {active && (
        <motion.span
          layoutId={RAIL_MARKER_ID}
          aria-hidden
          className="absolute left-0 top-1/2 h-[1.1em] w-[2px] -translate-y-1/2 bg-text"
          transition={withReduced({ type: 'spring', stiffness: 520, damping: 40, mass: 0.6 }, reduced)}
        />
      )}
      <span
        className={`font-display min-w-0 flex-1 truncate text-[16px] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          active
            ? 'text-text'
            : 'text-text-secondary [@media(hover:hover)and(pointer:fine)]:group-hover:text-text'
        } ${reduced ? '' : '[@media(hover:hover)and(pointer:fine)]:group-hover:translate-x-0.5'}`}
      >
        {label}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Scroll-spy - highlights the rail row in view (never reveals content).
// `mode` is a dependency because the document remounts when the view flips
// between Text and PDF; the listener must move to the new scroller.
// ---------------------------------------------------------------------------

function useScrollSpy(scrollRef: React.RefObject<HTMLDivElement | null>, mode: ViewMode) {
  const [active, setActive] = useState<SectionId>('summary');

  useEffect(() => {
    if (mode !== 'read') return;
    let raf = 0;
    let root: HTMLDivElement | null = null;

    const compute = () => {
      raf = 0;
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-section-id]'));
      if (nodes.length === 0) return;

      // Bottom of scroll: a short last section can never cross the trigger
      // line, so force it active once we reach the end.
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) {
        const last = nodes[nodes.length - 1].getAttribute('data-section-id');
        if (last) setActive(last as SectionId);
        return;
      }

      // Otherwise: the last section whose top passed a line ~32% down.
      const line = root.getBoundingClientRect().top + root.clientHeight * 0.32;
      let current = nodes[0].getAttribute('data-section-id');
      for (const node of nodes) {
        if (node.getBoundingClientRect().top <= line) current = node.getAttribute('data-section-id');
        else break;
      }
      if (current) setActive(current as SectionId);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };

    // The Text view fades in under AnimatePresence (mode="wait"), so the new
    // scroller may mount a frame after this effect runs. Wait for it.
    let tries = 0;
    let attach = 0;
    const tryAttach = () => {
      root = scrollRef.current;
      if (!root) {
        if (tries++ < 60) attach = requestAnimationFrame(tryAttach);
        return;
      }
      compute();
      root.addEventListener('scroll', onScroll, { passive: true });
    };
    tryAttach();

    return () => {
      if (attach) cancelAnimationFrame(attach);
      if (raf) cancelAnimationFrame(raf);
      root?.removeEventListener('scroll', onScroll);
    };
  }, [scrollRef, mode]);

  return active;
}

// ---------------------------------------------------------------------------
// Document - the sections, shared by desktop (own scroller) and phone.
// ---------------------------------------------------------------------------

function Intro({ where, compact = false }: { where?: 'toolbar' | 'doc'; compact?: boolean }) {
  return (
    <div data-resume-intro={where} className={`flex flex-col ${compact ? 'gap-1' : 'gap-1.5'}`}>
      <p className={`${compact ? 'text-[13px]' : 'text-[14px]'} leading-snug text-text-secondary`}>{RESUME.tagline}</p>
      <ContactRow compact={compact} />
    </div>
  );
}

function DocumentSections({ reduced, intro = false }: { reduced: boolean | null; intro?: boolean }) {
  return (
    <motion.div
      data-resume-page
      className="mx-auto flex max-w-3xl flex-col gap-12"
      variants={reveal.container(reduced)}
      initial="hidden"
      animate="show"
    >
      {intro && <Intro where="doc" />}
      {SECTIONS.map(({ id, label }) => (
        <motion.div key={id} id={SECTION_DOM_ID(id)} data-section-id={id} variants={reveal.item(reduced)}>
          <EditorialSection title={label}>
            <SectionBody id={id} />
          </EditorialSection>
        </motion.div>
      ))}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Phone - one scroll, a slim sticky row with Open PDF.
// ---------------------------------------------------------------------------

function ResumeMobile() {
  const reduced = useReducedMotion();
  return (
    <div data-resume-root data-resume-compact className="flex h-full flex-col overflow-hidden bg-bg">
      <style>{SCOPED_CSS}</style>
      <div data-resume-doc className="flex-1 overflow-y-auto">
        {/* Compact header: the nav bar already says Resume, so one slim
            sticky row (name + Open PDF) and a two-line intro, then content. */}
        <div className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b border-border bg-bg/95 px-[var(--sp-hero-pad)] backdrop-blur">
          <h1 className="min-w-0 truncate text-[15px] font-medium text-text">{RESUME.name}</h1>
          <DownloadButton label="Open PDF" open />
        </div>
        <div className="px-[var(--sp-hero-pad)] pt-3">
          <Intro compact />
        </div>
        <DocumentSections reduced={reduced} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main app - desktop default, phone branch.
// ---------------------------------------------------------------------------

export default function ResumeApp({
  variant,
}: { variant?: 'desktop' | 'mobile' } = {}) {
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<ViewMode>('read');
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = useScrollSpy(scrollRef, mode);

  const scrollTo = useCallback(
    (id: SectionId) => {
      const root = scrollRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>(`#${SECTION_DOM_ID(id)}`);
      if (!target) return;
      root.scrollTo({ top: target.offsetTop - 16, behavior: reduced ? 'auto' : 'smooth' });
    },
    [reduced],
  );

  if (variant === 'mobile') {
    return <ResumeMobile />;
  }

  return (
    <div data-resume-root className="flex h-full flex-col overflow-hidden">
      <style>{SCOPED_CSS}</style>

      {/* Toolbar: the one copy of the name, role line, contacts, controls. */}
      <div className="app-toolbar flex shrink-0 flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b px-6 py-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[1.625rem] leading-tight text-text">{RESUME.name}</h1>
          <Intro where="toolbar" />
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <ModeToggle mode={mode} onMode={setMode} reduced={reduced} />
          <DownloadButton />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === 'pdf' ? (
          <PdfSurface key="pdf" />
        ) : (
          <motion.div key="read" {...FADE} className="flex min-h-0 flex-1 overflow-hidden">
            <nav
              data-resume-rail
              aria-label="Resume sections"
              className="w-44 shrink-0 flex-col overflow-y-auto border-r border-border py-4"
            >
              {SECTIONS.map(({ id, label }) => (
                <RailRow
                  key={id}
                  label={label}
                  active={active === id}
                  reduced={reduced}
                  onClick={() => scrollTo(id)}
                />
              ))}
            </nav>

            <div ref={scrollRef} data-resume-doc className="min-w-0 flex-1 overflow-y-auto">
              <DocumentSections reduced={reduced} intro />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
