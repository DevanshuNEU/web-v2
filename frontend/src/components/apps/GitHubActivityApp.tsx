'use client';

/**
 * GitHubActivityApp - the live activity surface in the monochrome editorial
 * register, backed by /api/github/activity.
 *
 * Why this app exists: a portfolio that *says* "I ship a lot" is unconvincing.
 * The same portfolio rendering today's contribution graph + last week's commits
 * + currently-active repos is unfakeable, and is the single highest-credibility
 * surface a recruiter or founder sees on first visit. Everything here is live;
 * nothing is hardcoded.
 *
 * Redesign contract:
 *   - SIGNATURE (the heatmap): the year of contributions reads as a MONOCHROME
 *     DENSITY field. Each day is one dot in a real weeks x days DOM grid; commit
 *     intensity inks the dot through TWO reinforcing hue-free channels - dot SIZE
 *     and ink OPACITY both climb with the day's level. A busy day is a large,
 *     near-foreground dot; an empty day is a faint speck. This is the Halftone
 *     density principle (dark/dense = more), but kept as DOM so the precise grid,
 *     the per-day count tooltip, and the a11y label all survive. In the color
 *     ("Fun") palette the dots fall back to GitHub's official green ramp - the
 *     dual-palette contract, preserved.
 *   - HERO STATS: an editorial spec strip. Large serif numerals (contributions,
 *     streak, active repos, stars - all live) over tiny mono labels, hairline
 *     divided, scaling with the window via cqi (.editorial-hero inside
 *     .app-content is fluid on the container width).
 *   - ACTIVITY FEED: an AsciiField "log tape" CONSISTENT with AnalyticsApp - one
 *     selectable <pre>, fixed-width rows (clock stamp + glyph + summary + dot
 *     leaders + relative time), zero per-row motion (Emil's frequency rule: the
 *     feed updates, so it must not animate). The color palette gets a plain
 *     hairline editorial list fallback. Links preserved via an sr-only +
 *     paired anchor list.
 *   - ACTIVE REPOS: IndexRow-style hairline rows - serif repo name, mono meta
 *     (grayscale language dot, stars, pushed date), links preserved.
 *   - REGISTER: serif heads via EditorialSection, hairline dividers, generous
 *     space, no glass cards, no accent colors, no colored icons (mono).
 *
 * Motion (Emil): the page reveals ONCE on mount via the shared staggered
 * container (never whileInView - a windowed inner scroll makes in-view triggers
 * unreliable). The high-frequency feed does NOT animate. Live numbers do NOT
 * re-animate per tick - they only fade in once with their section. Pressable
 * rows/links get a restrained :active scale, reduced-motion gated. transform +
 * opacity only.
 *
 * House rules: strictly three-tone, color branched only via useIsMono(); no em
 * dashes; no scroll listeners; no global listeners. Live /api/github/activity
 * fetch + loading + error/empty states preserved; the event parsing/filtering,
 * the calendar streak/count data, and the active-repos aggregation + links are
 * untouched. No hardcoded numbers anywhere.
 */

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink, AlertCircle } from 'lucide-react';
import { useTheme } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import {
  EditorialSection,
  MetaLabel,
  Hairline,
} from '@/components/editorial';
import AsciiField from '@/components/signature/AsciiField';
import { reveal } from '@/lib/motion';
import type {
  ActivityEvent,
  ContributionCalendar,
  ContributionDay,
} from '@/lib/github';

/* Strong ease-out (Emil): "starts fast, feels responsive". */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* ────────────────────────────────────────────────────────────────────
 * API client types - kept in sync with /api/github/activity payload
 * ────────────────────────────────────────────────────────────────── */

interface ActivePayload {
  events: ActivityEvent[];
  calendar: ContributionCalendar | null;
  activeRepos: Array<{
    name: string;
    fullName: string;
    description: string | null;
    htmlUrl: string;
    language: string | null;
    stars: number;
    pushedAt: string;
  }>;
  username: string;
}

type ActiveRepo = ActivePayload['activeRepos'][number];

/* ────────────────────────────────────────────────────────────────────
 * Public entry - fetch + loading + error gate (preserved verbatim in shape)
 * ────────────────────────────────────────────────────────────────── */

interface GitHubActivityAppProps {
  variant?: 'desktop' | 'mobile';
}

export default function GitHubActivityApp({ variant = 'desktop' }: GitHubActivityAppProps = {}) {
  const [data, setData] = useState<ActivePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/github/activity')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((payload: ActivePayload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : String(err) || 'Failed to load activity'
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <LoadingState />;

  // One responsive editorial column re-proportions to the window via @container,
  // so both variants share a tree. The variant only tags the root testid that
  // the harness keys on (mobile shell present / absent).
  return <ActivityLayout data={data} variant={variant} />;
}

/* ────────────────────────────────────────────────────────────────────
 * Layout - the single editorial column
 * ────────────────────────────────────────────────────────────────── */

/* ────────────────────────────────────────────────────────────────────
 * Scoped, window-dynamic layout CSS.
 *
 * Only this file is editable and the project is on Tailwind 3.4 with no
 * container-query plugin, so the @container rules that re-proportion the LAYOUT
 * off the WINDOW (not the viewport) live here, scoped under a root data
 * attribute so they never leak. The parent `.app-content` is the query
 * container (container-type: inline-size), the same mechanism About Me and
 * Projects use. Type scaling rides the cqi-aware .editorial-hero /
 * .editorial-head / .text-* / .font-mono-meta utilities; this block handles the
 * stat-strip column count (2-up narrow, 4-up wide) and opens up the column
 * padding/gap as the window grows.
 * ────────────────────────────────────────────────────────────────── */

const SCOPED_CSS = `
[data-gh-root] {
  --gh-col-gap: 2.5rem;        /* gap between sections (narrow) */
}
/* Hero stat strip: two columns on a narrow window. */
[data-gh-stats] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 1.5rem;
  row-gap: 2.5rem;
}
@container (min-width: 544px) {
  /* WIDE window: the four live stats sit on one hairline-divided row. */
  [data-gh-stats] {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Heatmap dot: a restrained press-toward-foreground on hover. GPU-only
   (transform + opacity), centered cell so it scales from its own position, and
   gated on a fine pointer so a tap on touch never fires a stuck hover state.
   The dot is sized in CSS already; this only adds the interaction layer. */
[data-gh-cell] > span {
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1),
              opacity 140ms cubic-bezier(0.23, 1, 0.32, 1);
  will-change: transform;
}
@media (hover: hover) and (pointer: fine) {
  [data-gh-cell]:hover > span {
    transform: scale(1.6);
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  /* Freeze the live/interaction motion; the dots stay legible, just static. */
  [data-gh-cell] > span { transition: none; }
  [data-gh-cell]:hover > span { transform: none; }
}
`;

function ActivityLayout({ data, variant }: { data: ActivePayload; variant: 'desktop' | 'mobile' }) {
  const reduced = useReducedMotion();

  const events = data.events.slice(0, 10);
  const hasCalendar = data.calendar !== null && data.calendar.days.length > 0;

  return (
    <div
      className="h-full overflow-auto bg-transparent"
      data-gh-root
      data-testid={variant === 'mobile' ? 'github-activity-mobile' : 'github-activity'}
    >
      <style>{SCOPED_CSS}</style>
      <motion.div
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-14"
      >
        {/* ── Masthead ── */}
        <motion.header variants={reveal.item(reduced)} className="flex flex-col gap-4">
          <MetaLabel as="p" className="text-text-secondary">
            github.com/{data.username}
          </MetaLabel>
          <h1 className="editorial-hero font-display text-text leading-none">
            Activity
          </h1>
          <p className="max-w-[60ch] text-text-secondary leading-relaxed">
            Pulled live from the GitHub API on load. The graph, the log, and the
            repository list below are real and current, not a snapshot.
          </p>
        </motion.header>

        {/* ── 01 Hero stats ── live serif numerals, hairline divided ── */}
        <motion.div variants={reveal.item(reduced)}>
          <StatStrip data={data} />
        </motion.div>

        {/* ── 02 Contributions ── the density-field signature ── */}
        {hasCalendar && (
          <motion.div variants={reveal.item(reduced)}>
            <EditorialSection
              number="02"
              eyebrow="Last 12 months"
              title="Contributions"
            >
              <ContributionField calendar={data.calendar!} />
            </EditorialSection>
          </motion.div>
        )}

        {/* ── 03 Activity ── the AsciiField log tape (mono) / list (color) ── */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="03" eyebrow="Public events" title="Recent activity">
            <ActivityFeed events={events} />
          </EditorialSection>
        </motion.div>

        {/* ── 04 Active repositories ── IndexRow-style hairline rows ── */}
        <motion.div variants={reveal.item(reduced)}>
          <EditorialSection number="04" eyebrow="Pushed in the last 60 days" title="Active repositories">
            {data.activeRepos.length === 0 ? (
              <EmptyNote
                line="No recently-pushed repositories."
                hint="Public pushes from the last 60 days show up here."
              />
            ) : (
              <div className="flex flex-col">
                <Hairline />
                {data.activeRepos.map((repo, i) => (
                  <RepoRow
                    key={repo.fullName}
                    repo={repo}
                    index={i + 1}
                    reduced={reduced}
                  />
                ))}
              </div>
            )}
          </EditorialSection>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Hero stat strip - large serif numerals + tiny mono labels, hairline grid.
 *
 * Every value is derived live: contributions + streak come from the calendar
 * (rendered "--" when the calendar fetch failed so a visitor never misreads
 * "0 day streak" as "stopped shipping"); active-repo count and total stars are
 * aggregated from the live activeRepos list. No hardcoded numbers.
 * ────────────────────────────────────────────────────────────────── */

function StatStrip({ data }: { data: ActivePayload }) {
  const hasCalendar = data.calendar !== null;
  const contributions = hasCalendar
    ? data.calendar!.totalLastYear.toLocaleString()
    : '--';
  const streak = data.calendar?.currentStreak ?? 0;
  const longestStreak = data.calendar?.longestStreak ?? 0;
  const streakLabel = hasCalendar ? String(streak) : '--';
  const streakSub = !hasCalendar
    ? 'data unavailable'
    : longestStreak > streak
      ? `longest ${longestStreak}`
      : 'current run';
  const activeCount = data.activeRepos.length;
  const totalStars = data.activeRepos.reduce((s, r) => s + r.stars, 0);

  return (
    <div data-gh-stats data-testid="activity-stats">
      <Stat value={contributions} label="Contributions" sub="last 12 months" />
      <Stat value={streakLabel} label="Day streak" sub={streakSub} />
      <Stat value={String(activeCount)} label="Active repos" sub="pushed recently" />
      <Stat value={totalStars.toLocaleString()} label="Stars" sub="across active repos" />
    </div>
  );
}

function Stat({ value, label, sub }: { value: string; label: string; sub: string }) {
  return (
    <div className="flex flex-col gap-2">
      <Hairline />
      {/* Serif numeral scales with the window via .editorial-head + cqi. */}
      <span className="editorial-head font-display text-text leading-none pt-3 tabular-nums">
        {value}
      </span>
      <MetaLabel as="p" className="text-text">
        {label}
      </MetaLabel>
      <span className="text-sm text-text-secondary leading-snug">{sub}</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Contribution density field - the signature.
 *
 * A real weeks x days DOM grid (7 rows, Sun..Sat top to bottom, columns are
 * weeks). Each day's commit level (0..4) maps to a dot whose SIZE and ink
 * OPACITY both grow with intensity - two reinforcing hue-free channels, so
 * "more commits" reads as a bigger, denser dot without any color. The grid is
 * horizontally scrollable when the year does not fit; the dot scale tracks the
 * window via @container so the field re-proportions with the app size. Every
 * day keeps its `date / count contributions` tooltip and the whole field keeps
 * an aria-label of the yearly total. In the color palette the dots fall back to
 * GitHub's official green ramp (dual-palette contract).
 * ────────────────────────────────────────────────────────────────── */

function ContributionField({ calendar }: { calendar: ContributionCalendar }) {
  const { mode } = useTheme();
  const mono = useIsMono();

  const days = calendar.days;
  // Pad the head so the first real day sits on its true weekday row (GitHub
  // shows Sunday as the top row: weekday 0..6 = Sun..Sat).
  const firstWeekday = new Date(days[0].date).getUTCDay();
  const padded: Array<ContributionDay | null> = useMemo(
    () => [...Array(firstWeekday).fill(null), ...days],
    [firstWeekday, days],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        className="overflow-x-auto pb-1"
        data-testid="contribution-heatmap"
        role="img"
        aria-label={`${calendar.totalLastYear} contributions in the last year`}
      >
        {/* Cell box scales with the window; the inked dot is centered inside it
            and sized as a fraction of the box that climbs with the level. */}
        <div
          className="grid grid-rows-7 grid-flow-col w-fit
                     gap-[clamp(1.5px,0.5cqi,3px)]
                     [--cell:clamp(8px,2.1cqi,14px)]"
        >
          {padded.map((d, i) => (
            <div
              key={i}
              className="grid place-items-center"
              style={{ width: 'var(--cell)', height: 'var(--cell)' }}
              title={d ? `${d.date} / ${d.count} contributions` : undefined}
              data-level={d?.level}
              data-gh-cell={d ? '' : undefined}
            >
              {d && (
                <span
                  className="block rounded-full"
                  style={dotStyle(d.level, mode, mono)}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <FieldLegend mode={mode} mono={mono} />
    </div>
  );
}

/**
 * Dot geometry + ink for a given level.
 *   - size:    fraction of the cell box, 0.28 (faint) up to 1.0 (full), so a
 *              busy day reads as a large dot and an empty day as a speck.
 *   - opacity: climbs with the level so density reinforces size (mono only).
 * In color, the dot fills with GitHub's green ramp at full size for legibility.
 */
function dotStyle(
  level: number,
  mode: 'light' | 'dark',
  mono: boolean,
): React.CSSProperties {
  const idx = Math.max(0, Math.min(4, level));
  // Size fraction of the cell box per level. Level 0 is a small flat speck so
  // the grid still reads as a field; 1..4 grow toward filling the cell.
  const sizeFrac = [0.3, 0.5, 0.66, 0.82, 1][idx];
  const size = `calc(var(--cell) * ${sizeFrac})`;

  if (mono) {
    // Graphite density ramp: a light->dark gray scale where empty days sit just
    // above the background and the busiest day reads near the foreground.
    // Direction follows the surface (light ink on dark, dark ink on light) so the
    // hottest day is always the most "present". The opacity steps are spaced an
    // even ~0.20 apart with a floor lifted off zero so each level stays a
    // distinct graphite tone even on the small mobile cell (~8px), where the dot
    // bottoms out at the clamp floor; the size channel reinforces the same ramp.
    const ink = mode === 'dark' ? '255,255,255' : '17,17,17';
    const op = [0.1, 0.3, 0.5, 0.7, 0.92][idx];
    return { width: size, height: size, background: `rgba(${ink},${op})` };
  }
  // Color (Fun) palette: GitHub's official greens, full-size dots.
  const dark = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
  const light = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  const color = (mode === 'dark' ? dark : light)[idx];
  return { width: size, height: size, background: color };
}

function FieldLegend({ mode, mono }: { mode: 'light' | 'dark'; mono: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <MetaLabel className="text-text-secondary">Less</MetaLabel>
      <span className="flex items-center gap-[clamp(2px,0.6cqi,4px)] [--cell:14px]">
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span
            key={lvl}
            className="grid place-items-center"
            style={{ width: 'var(--cell)', height: 'var(--cell)' }}
          >
            <span className="block rounded-full" style={dotStyle(lvl, mode, mono)} />
          </span>
        ))}
      </span>
      <MetaLabel className="text-text-secondary">More</MetaLabel>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Activity feed - AsciiField log tape (mono), hairline list (color).
 *
 * Consistent with AnalyticsApp: every event is one fixed-width row
 *   14:02:51  +  Pushed: refactor heatmap field ............... 3h ago
 * built into a single string handed to AsciiField as one selectable, no-redraw
 * <pre>. The tape is aria-hidden; a paired anchor list carries the same events
 * for assistive tech AND preserves the per-event links (the tape itself is a
 * read surface, the links live in the sr-list + the color fallback rows).
 * ────────────────────────────────────────────────────────────────── */

const TAPE_WIDTH = 72; // monospace columns the tape is padded to

/** Distinct ASCII glyph per event type - the shape disambiguates, not hue. */
function eventGlyph(ev: ActivityEvent): string {
  switch (ev.type) {
    case 'PushEvent': return '+'; // commits pushed
    case 'PullRequestEvent': return '>'; // a pull request
    case 'CreateEvent': return '*'; // a branch / tag / repo created
    case 'ReleaseEvent': return '^'; // a release shipped
    case 'IssuesEvent': return '?'; // an issue
    case 'WatchEvent': return '@'; // starred
    case 'ForkEvent': return 'Y'; // forked
    default: return '.';
  }
}

interface FeedItem {
  id: string;
  glyph: string;
  summary: string;
  repo: string;
  when: string;
  link: string;
}

function describeEvent(ev: ActivityEvent): { summary: string; link: string } {
  switch (ev.type) {
    case 'PushEvent': {
      const commits = ev.commits ?? [];
      const last = commits[commits.length - 1];
      const summary =
        commits.length > 1
          ? `Pushed ${commits.length} commits: ${truncate(last?.message ?? '', 48)}`
          : `Pushed: ${truncate(last?.message ?? '', 60)}`;
      return { summary, link: last?.url ?? ev.repoUrl };
    }
    case 'PullRequestEvent':
      return {
        summary: `${capitalize(ev.prAction ?? 'updated')} PR: ${truncate(ev.prTitle ?? '', 56)}`,
        link: ev.prUrl ?? ev.repoUrl,
      };
    case 'CreateEvent':
      return { summary: `Created ${ev.refType ?? 'item'}`, link: ev.repoUrl };
    case 'ReleaseEvent':
      return { summary: `Released ${ev.releaseTag ?? ''}`.trim(), link: ev.repoUrl };
    case 'IssuesEvent':
      return { summary: 'Worked on an issue', link: ev.repoUrl };
    case 'WatchEvent':
      return { summary: 'Starred a repository', link: ev.repoUrl };
    case 'ForkEvent':
      return { summary: 'Forked a repository', link: ev.repoUrl };
    default:
      return { summary: 'Activity', link: ev.repoUrl };
  }
}

function toFeedItems(events: ActivityEvent[]): FeedItem[] {
  return events.map((ev) => {
    const { summary, link } = describeEvent(ev);
    return {
      id: ev.id,
      glyph: eventGlyph(ev),
      summary,
      repo: ev.repo.split('/').pop() ?? ev.repo,
      when: relativeTime(ev.createdAt),
      link,
    };
  });
}

/**
 * Build the fixed-width log tape string (one row per event).
 *
 * Each row opens with a left index rail (01, 02, ...) rather than a wall clock:
 * the events feed carries only a relative `when`, so a fabricated HH:MM:SS would
 * be dishonest. The index keeps the rows aligned like a printed log while the
 * real recency lives in the right-aligned relative time.
 */
function buildLogTape(items: FeedItem[]): string {
  return items
    .map((it, i) => {
      const rail = String(i + 1).padStart(2, '0');
      const head = `${rail}  ${it.glyph}  `;
      const tail = ` ${it.when}`;
      const room = Math.max(1, TAPE_WIDTH - head.length - tail.length);
      let label = `${it.summary}  [${it.repo}]`;
      if (label.length > room - 2) {
        label = label.slice(0, Math.max(1, room - 3)) + '…';
      }
      const leaderCount = Math.max(1, room - label.length - 1);
      const leader = ' ' + '.'.repeat(leaderCount);
      return `${head}${label}${leader}${tail}`;
    })
    .join('\n');
}

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  const mono = useIsMono();
  const reduced = useReducedMotion();

  const items: FeedItem[] = useMemo(() => toFeedItems(events), [events]);

  const tape = useMemo(() => buildLogTape(items), [items]);

  if (items.length === 0) {
    return (
      <EmptyNote
        line="No recent public events."
        hint="Pushes, pull requests, and releases appear here as they happen."
      />
    );
  }

  if (mono) {
    // Signature: one selectable <pre>, zero per-row motion. The visible tape is
    // the read surface; a paired sr-only anchor list carries the same events for
    // assistive tech and preserves the per-event links. Each anchor exposes its
    // summary via aria-label (its accessible name) rather than visible text, so
    // the human-readable string lives in exactly one place (the tape) while the
    // links stay reachable by keyboard and screen reader.
    return (
      <div>
        <div className="max-h-80 overflow-auto">
          <AsciiField
            source={tape}
            paletteKey={`tape-${items.length}`}
            className="text-text-secondary leading-[1.6]
                       text-[clamp(10px,1.55cqi,12px)]"
          />
        </div>
        <ul className="sr-only">
          {items.map((it) => (
            <li key={it.id}>
              <a
                href={it.link}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${it.summary} in ${it.repo}, ${it.when}`}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Color fallback: a plain hairline editorial list (glyph + summary + mono
  // meta), links preserved on each row.
  return (
    <ul className="flex flex-col">
      <Hairline />
      {items.map((it) => (
        <li key={it.id}>
          <FeedRow item={it} reduced={reduced} />
          <Hairline />
        </li>
      ))}
    </ul>
  );
}

function FeedRow({ item, reduced }: { item: FeedItem; reduced: boolean | null }) {
  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={reduced ? undefined : { transform: 'scale(0.97)', transition: { duration: 0.13, ease: EASE_OUT } }}
      className="group flex items-baseline gap-3 py-3 transition-colors duration-150
                 [@media(hover:hover)and(pointer:fine)]:hover:bg-black/[0.02]
                 dark:[@media(hover:hover)and(pointer:fine)]:hover:bg-white/[0.04]
                 focus-visible:outline-none focus-visible:bg-black/[0.04] dark:focus-visible:bg-white/[0.06]"
    >
      <span
        aria-hidden
        className="w-4 shrink-0 text-center font-[family-name:var(--font-geist-mono)] text-text-secondary"
      >
        {item.glyph}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-text">{item.summary}</span>
        <span className="mt-0.5 flex items-center gap-2 font-[family-name:var(--font-geist-mono)] text-xs text-text-secondary">
          <span className="truncate">{item.repo}</span>
          <span aria-hidden className="opacity-40">/</span>
          <span className="shrink-0">{item.when}</span>
        </span>
      </span>
      <ExternalLink size={13} className="shrink-0 self-center text-text-secondary opacity-40" />
    </motion.a>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Repo row - IndexRow-style hairline row, serif name + mono meta, link kept.
 * ────────────────────────────────────────────────────────────────── */

function RepoRow({
  repo,
  index,
  reduced,
}: {
  repo: ActiveRepo;
  index: number;
  reduced: boolean | null;
}) {
  const mono = useIsMono();
  return (
    <div className="flex flex-col">
      <motion.a
        href={repo.htmlUrl}
        target="_blank"
        rel="noopener noreferrer"
        whileTap={reduced ? undefined : { transform: 'scale(0.97)', transition: { duration: 0.13, ease: EASE_OUT } }}
        className="group flex items-baseline gap-4 py-4 transition-colors duration-150
                   [@media(hover:hover)and(pointer:fine)]:hover:bg-black/[0.025]
                   dark:[@media(hover:hover)and(pointer:fine)]:hover:bg-white/[0.05]
                   focus-visible:outline-none focus-visible:bg-black/[0.05] dark:focus-visible:bg-white/[0.07]"
      >
        <MetaLabel className="shrink-0 w-8 justify-start text-text-secondary">
          {String(index).padStart(2, '0')}
        </MetaLabel>
        <span className="min-w-0 flex-1">
          <span className="block editorial-head font-display text-text text-[clamp(1.15rem,4.5cqi,1.6rem)] leading-tight truncate">
            {repo.name}
          </span>
          {repo.description && (
            <span className="mt-1 block max-w-[60ch] text-sm text-text-secondary leading-snug line-clamp-2">
              {repo.description}
            </span>
          )}
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-[family-name:var(--font-geist-mono)] text-xs text-text-secondary">
            {repo.language && (
              <span className="inline-flex items-center gap-1.5">
                {/* In mono the dot drops its language hue; the name to its right
                    carries the distinction. */}
                <span
                  className={`inline-block h-2 w-2 rounded-full ${mono ? 'bg-text-secondary' : ''}`}
                  style={mono ? undefined : { background: languageColor(repo.language) }}
                />
                {repo.language}
              </span>
            )}
            {repo.stars > 0 && (
              <span>
                {repo.stars} {repo.stars === 1 ? 'star' : 'stars'}
              </span>
            )}
            <span>pushed {relativeTime(repo.pushedAt)}</span>
          </span>
        </span>
        <ExternalLink size={13} className="shrink-0 self-center text-text-secondary opacity-40" />
      </motion.a>
      <Hairline />
    </div>
  );
}

function languageColor(lang: string): string {
  const palette: Record<string, string> = {
    TypeScript: '#3178c6',
    JavaScript: '#f1e05a',
    Python: '#3572A5',
    Rust: '#dea584',
    Go: '#00ADD8',
    Java: '#b07219',
    Kotlin: '#A97BFF',
    Swift: '#F05138',
    C: '#555555',
    'C++': '#f34b7d',
    Ruby: '#701516',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Vue: '#41b883',
    Svelte: '#ff3e00',
  };
  return palette[lang] ?? '#94a3b8';
}

/* ────────────────────────────────────────────────────────────────────
 * Small presentational pieces + states
 * ────────────────────────────────────────────────────────────────── */

/** Empty state: hairline-bounded, editorial, no spinner, no icon theatrics. */
function EmptyNote({ line, hint }: { line: string; hint: string }) {
  return (
    <div className="flex flex-col gap-2 py-2">
      <Hairline />
      <p className="pt-4 text-sm text-text">{line}</p>
      <p className="text-sm text-text-secondary">{hint}</p>
    </div>
  );
}

/** Loading: skeleton matching the editorial column shape (no circular spinner). */
function LoadingState() {
  return (
    <div className="h-full overflow-auto bg-transparent" data-gh-root data-testid="activity-loading">
      <style>{SCOPED_CSS}</style>
      <div className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-10 sm:py-12 flex flex-col gap-14">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-16 w-48" />
          <Skeleton className="h-4 w-full max-w-[40ch]" />
        </div>
        <div data-gh-stats>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col gap-3">
              <Hairline />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`rounded bg-text-secondary/10 animate-pulse ${className ?? ''}`} />;
}

/** Error: editorial, centered, honest about the likely cause. */
function ErrorState({ message }: { message: string }) {
  return (
    <div
      className="h-full flex flex-col items-center justify-center gap-3 text-center px-8"
      data-testid="activity-error"
    >
      <AlertCircle size={26} className="text-text-secondary" />
      <p className="font-display text-text text-xl">Couldn&apos;t load activity</p>
      <p className="max-w-[40ch] text-sm text-text-secondary leading-relaxed">
        {message}. GitHub or the contributions API may be rate limiting.
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Time + string helpers (preserved from the prior build)
 * ────────────────────────────────────────────────────────────────── */

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const wk = Math.floor(day / 7);
  if (wk < 5) return `${wk}w ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(day / 365)}y ago`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
