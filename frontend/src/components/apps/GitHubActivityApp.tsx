'use client';

/**
 * GitHubActivityApp - live GitHub activity, backed by /api/github/activity.
 *
 * A recruiter sees, in this order: three headline numbers, the year of
 * contributions as a calendar, the latest public work (PRs, pushes, releases)
 * and the repos pushed to in the last 60 days. Everything is live.
 *
 * Honesty rules:
 *   - The route answers 503 when GitHub gave it nothing. That renders as
 *     "Activity is unavailable right now", never as zeros.
 *   - When only some sources failed (`warnings`), the sections that loaded
 *     show, the rest say they could not load, and a stat whose value is
 *     unknown is hidden rather than shown as "--" or "0".
 *
 * Layout keys off the window: the root is a query container (`.dapp`), stat
 * tiles reflow by width, and the heatmap sizes its cells from its own column
 * (`.gh-heat`), showing 26 weeks instead of 53 when the column is narrow.
 *
 * Palettes: mono inks the heatmap by dot size and opacity; Fun uses GitHub's
 * green ramp and language colors. Color branches only through useIsMono().
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { useTheme } from '@/store/themeStore';
import { useIsMono } from '@/hooks/usePalette';
import { Hairline } from '@/components/editorial';
import { reveal } from '@/lib/motion';
import type {
  ActivityEvent,
  ContributionCalendar,
  ContributionDay,
} from '@/lib/github';

/* Strong ease-out: starts fast, feels responsive. */
const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

/* ────────────────────────────────────────────────────────────────────
 * API client types - kept in sync with /api/github/activity
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
  /** Sources that failed, each prefixed "events", "calendar", "personal repos" or "org repos". */
  warnings?: string[];
}

type ActiveRepo = ActivePayload['activeRepos'][number];

const FALLBACK_USER = 'DevanshuNEU';

function failed(data: ActivePayload, source: string): boolean {
  return (data.warnings ?? []).some((w) => w.startsWith(source));
}

/* ────────────────────────────────────────────────────────────────────
 * Public entry - fetch + loading + unavailable gate
 * ────────────────────────────────────────────────────────────────── */

interface GitHubActivityAppProps {
  variant?: 'desktop' | 'mobile';
}

export default function GitHubActivityApp({ variant = 'desktop' }: GitHubActivityAppProps = {}) {
  const [data, setData] = useState<ActivePayload | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

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
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setError(false);
    setData(null);
    setAttempt((n) => n + 1);
  }, []);

  if (error) return <UnavailableState onRetry={retry} />;
  if (!data) return <LoadingState />;

  // One layout for both variants; the variant only tags the root testid.
  return <ActivityLayout data={data} variant={variant} onRetry={retry} />;
}

/* ────────────────────────────────────────────────────────────────────
 * Layout
 * ────────────────────────────────────────────────────────────────── */

function ActivityLayout({
  data,
  variant,
  onRetry,
}: {
  data: ActivePayload;
  variant: 'desktop' | 'mobile';
  onRetry: () => void;
}) {
  const reduced = useReducedMotion();
  const user = data.username || FALLBACK_USER;
  const profileUrl = `https://github.com/${user}`;

  const events = useMemo(
    () => [...data.events].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [data.events],
  );
  const hasCalendar = data.calendar !== null && data.calendar.days.length > 0;
  const eventsFailed = failed(data, 'events');
  const reposFailed = failed(data, 'personal repos') && failed(data, 'org repos');
  const partial = (data.warnings ?? []).length > 0;

  return (
    <div
      className="dapp h-full overflow-auto bg-transparent"
      data-testid={variant === 'mobile' ? 'github-activity-mobile' : 'github-activity'}
    >
      <motion.div
        variants={reveal.container(reduced)}
        initial="hidden"
        animate="show"
        className="dapp-col flex flex-col gap-12"
      >
        <motion.header variants={reveal.item(reduced)} className="flex flex-col gap-3">
          <h1 className="dapp-title">Activity</h1>
          <p className="dapp-lede">
            Live from GitHub: contributions over the last year, my latest public
            work, and the repos I pushed to in the last 60 days.
          </p>
          <a
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="dapp-link inline-flex w-fit items-center gap-1.5 text-sm text-text"
          >
            github.com/{user}
            <ExternalLink size={13} aria-hidden className="text-text-secondary" />
          </a>
          {partial && (
            <p className="dapp-note flex flex-wrap items-center gap-x-3 gap-y-2" role="status">
              <span>Some GitHub data did not load. Showing what did.</span>
              <button type="button" onClick={onRetry} className="dapp-link text-text">
                Try again
              </button>
            </p>
          )}
        </motion.header>

        <motion.div variants={reveal.item(reduced)}>
          <StatStrip data={data} reposFailed={reposFailed} />
        </motion.div>

        {hasCalendar && (
          <motion.div variants={reveal.item(reduced)}>
            <Section title="Contributions" note="Last 12 months">
              <ContributionField calendar={data.calendar!} />
            </Section>
          </motion.div>
        )}

        <motion.div variants={reveal.item(reduced)}>
          <Section title="Recent activity" note="Public events, newest first">
            {eventsFailed ? (
              <EmptyNote
                line="GitHub did not return recent events just now."
                hint={<>Everything is on <a className="dapp-link text-text" href={profileUrl} target="_blank" rel="noopener noreferrer">my GitHub profile</a>.</>}
              />
            ) : (
              <ActivityFeed events={events} reduced={reduced} />
            )}
          </Section>
        </motion.div>

        <motion.div variants={reveal.item(reduced)}>
          <Section title="Active repositories" note="Pushed in the last 60 days">
            {reposFailed ? (
              <EmptyNote
                line="GitHub did not return the repository list just now."
                hint={<>Everything is on <a className="dapp-link text-text" href={profileUrl} target="_blank" rel="noopener noreferrer">my GitHub profile</a>.</>}
              />
            ) : data.activeRepos.length === 0 ? (
              <EmptyNote
                line="No recently-pushed repositories."
                hint="Public pushes from the last 60 days show up here."
              />
            ) : (
              <ul className="flex flex-col">
                {data.activeRepos.map((repo) => (
                  <li key={repo.fullName}>
                    <RepoRow repo={repo} reduced={reduced} />
                    <Hairline />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Section: serif title with an optional qualifier, a hairline, then the body. */
function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-4">
        <h2 className="dapp-h2">{title}</h2>
        {note && <p className="text-sm text-text-secondary">{note}</p>}
      </header>
      <Hairline />
      <div className="pt-5">{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Headline numbers. A tile whose source failed is left out, so a visitor
 * never reads a missing value as "stopped shipping".
 * ────────────────────────────────────────────────────────────────── */

function StatStrip({ data, reposFailed }: { data: ActivePayload; reposFailed: boolean }) {
  const cal = data.calendar;
  const tiles: Array<{ value: string; label: string; sub: string }> = [];
  if (cal) {
    tiles.push({
      value: cal.totalLastYear.toLocaleString(),
      label: 'Contributions',
      sub: 'in the last 12 months',
    });
    tiles.push(
      cal.currentStreak > 0
        ? {
            value: String(cal.currentStreak),
            label: 'Day streak',
            sub: cal.longestStreak > cal.currentStreak ? `days in a row, longest ${cal.longestStreak}` : 'days in a row',
          }
        : { value: String(cal.longestStreak), label: 'Longest streak', sub: 'days in a row this year' },
    );
  }
  if (!reposFailed) {
    tiles.push({
      value: String(data.activeRepos.length),
      label: 'Active repos',
      sub: 'pushed in the last 60 days',
    });
  }
  if (tiles.length === 0) return null;

  return (
    <div className="gh-stats" data-testid="activity-stats">
      {tiles.map((t) => (
        <div key={t.label} className="flex flex-col gap-1.5">
          <Hairline />
          <p className="pt-3 font-display text-text leading-none text-[clamp(2rem,6cqi,3rem)]">{t.value}</p>
          <p className="pt-1 text-sm font-medium text-text">{t.label}</p>
          <p className="text-sm text-text-secondary leading-snug">{t.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Contribution calendar.
 *
 * Week columns (Sunday on top), a month label above the first week of each
 * month, and Mon / Wed / Fri row labels. A day's level (0..4) sets both the
 * dot size and its ink, so it reads without color. Cell size comes from the
 * heatmap's own width (.gh-heat in globals.css); a narrow column hides the
 * older 27 weeks. If it ever overflows, it opens scrolled to the newest week.
 * ────────────────────────────────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
/** Weeks still shown when the column is narrow (see .gh-heat-week[data-old]). */
const NARROW_WEEKS = 26;

function ContributionField({ calendar }: { calendar: ContributionCalendar }) {
  const { mode } = useTheme();
  const mono = useIsMono();
  const scroller = useRef<HTMLDivElement>(null);

  const days = calendar.days;
  const weeks = useMemo(() => {
    // Pad the head so the first real day sits on its weekday row.
    const firstWeekday = new Date(days[0].date).getUTCDay();
    const padded: Array<ContributionDay | null> = [...Array(firstWeekday).fill(null), ...days];
    const out: Array<Array<ContributionDay | null>> = [];
    for (let i = 0; i < padded.length; i += 7) out.push(padded.slice(i, i + 7));
    return out;
  }, [days]);

  // Month label for the first week that contains the 1st of a month (or the
  // first visible week of the narrow view, so it is never unlabeled).
  const monthLabels = useMemo(() => {
    const narrowStart = Math.max(0, weeks.length - NARROW_WEEKS);
    return weeks.map((week, wi) => {
      const firstOfMonth = week.find((d) => d && d.date.endsWith('-01'));
      if (firstOfMonth) return { text: MONTHS[Number(firstOfMonth.date.slice(5, 7)) - 1], narrowOnly: false };
      if (wi === 0 || wi === narrowStart) {
        const d = week.find(Boolean);
        // Skip if a labeled month starts within the next two weeks (no overlap).
        const soon = weeks.slice(wi + 1, wi + 3).some((w) => w.some((x) => x && x.date.endsWith('-01')));
        // The narrow view's first week is mid-year in the full view, where its
        // label would collide with the month before, so it shows only when narrow.
        if (d && !soon) return { text: MONTHS[Number(d.date.slice(5, 7)) - 1], narrowOnly: wi !== 0 };
      }
      return { text: '', narrowOnly: false };
    });
  }, [weeks]);

  const summary = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const d of days) byMonth.set(d.date.slice(0, 7), (byMonth.get(d.date.slice(0, 7)) ?? 0) + d.count);
    let best = '';
    let bestCount = -1;
    for (const [m, c] of byMonth) if (c > bestCount) { best = m; bestCount = c; }
    const name = best ? `${MONTHS[Number(best.slice(5, 7)) - 1]} ${best.slice(0, 4)}` : '';
    return `${calendar.totalLastYear} contributions in the last year${name ? `; busiest month ${name} with ${bestCount}` : ''}.`;
  }, [days, calendar.totalLastYear]);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [weeks]);

  return (
    <div className="flex flex-col gap-4">
      <div className="gh-heat">
        <div
          ref={scroller}
          className="overflow-x-auto pb-1"
          data-testid="contribution-heatmap"
          role="img"
          aria-label={summary}
        >
          <div className="gh-heat-grid" aria-hidden>
            <div className="gh-heat-days">
              <span className="gh-heat-month" />
              {WEEKDAY_LABELS.map((l, i) => (
                <span key={i} className="gh-heat-day">{l}</span>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="gh-heat-week"
                data-old={wi < weeks.length - NARROW_WEEKS ? '' : undefined}
              >
                <span className="gh-heat-month">
                  <span className={monthLabels[wi].narrowOnly ? 'gh-heat-month-narrow' : undefined}>
                    {monthLabels[wi].text}
                  </span>
                </span>
                {Array.from({ length: 7 }, (_, di) => {
                  const d = week[di] ?? null;
                  return (
                    <span
                      key={di}
                      className="grid place-items-center"
                      style={{ width: 'var(--cell)', height: 'var(--cell)' }}
                      title={d ? `${d.date}: ${d.count} contributions` : undefined}
                      data-level={d?.level}
                    >
                      {d && <span className="block rounded-full" style={dotStyle(d.level, mode, mono)} />}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
      <FieldLegend mode={mode} mono={mono} />
    </div>
  );
}

/**
 * Dot geometry + ink for a level. Size and opacity both climb, so a busy day
 * is a large, near-foreground dot and an empty day a faint speck. Level 1 sits
 * above 3:1 against the window in both themes.
 */
function dotStyle(level: number, mode: 'light' | 'dark', mono: boolean): React.CSSProperties {
  const idx = Math.max(0, Math.min(4, level));
  const sizeFrac = [0.34, 0.55, 0.7, 0.85, 1][idx];
  const size = `calc(var(--cell) * ${sizeFrac})`;

  if (mono) {
    const ink = mode === 'dark' ? '255,255,255' : '17,17,17';
    const op = [0.14, 0.45, 0.62, 0.8, 0.95][idx];
    return { width: size, height: size, background: `rgba(${ink},${op})` };
  }
  // Fun palette: GitHub's greens. Level 0 stays a visible neutral speck.
  const dark = ['#2d333b', '#0e4429', '#006d32', '#26a641', '#39d353'];
  const light = ['#d8dce1', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  return { width: size, height: size, background: (mode === 'dark' ? dark : light)[idx] };
}

function FieldLegend({ mode, mono }: { mode: 'light' | 'dark'; mono: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      <span>Less</span>
      <span className="flex items-center gap-1 [--cell:14px]" aria-hidden>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <span key={lvl} className="grid place-items-center" style={{ width: 'var(--cell)', height: 'var(--cell)' }}>
            <span className="block rounded-full" style={dotStyle(lvl, mode, mono)} />
          </span>
        ))}
      </span>
      <span>More</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Activity feed: one linked row per event, in every palette.
 * ────────────────────────────────────────────────────────────────── */

interface FeedItem {
  id: string;
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
      if (last) {
        const summary =
          commits.length > 1
            ? `Pushed ${commits.length} commits: ${truncate(last.message, 72)}`
            : `Pushed: ${truncate(last.message, 80)}`;
        return { summary, link: last.url };
      }
      // GitHub's public feed no longer lists commits; name the branch instead.
      return {
        summary: ev.branch ? `Pushed to ${ev.branch}` : 'Pushed commits',
        link: ev.headSha ? `${ev.repoUrl}/commit/${ev.headSha}` : ev.repoUrl,
      };
    }
    case 'PullRequestEvent': {
      const verb = capitalize(ev.prAction ?? 'updated');
      const pr = ev.prNumber !== undefined ? `PR #${ev.prNumber}` : 'a PR';
      const detail = ev.prTitle ?? ev.prBranch;
      return {
        summary: detail ? `${verb} ${pr}: ${truncate(detail, 80)}` : `${verb} ${pr}`,
        link: ev.prUrl ?? ev.repoUrl,
      };
    }
    case 'CreateEvent':
      if (ev.refType === 'repository' || !ev.refName) {
        return { summary: `Created ${ev.refType ?? 'repository'}`, link: ev.repoUrl };
      }
      return {
        summary: `Created ${ev.refType} ${ev.refName}`,
        link: ev.refType === 'tag' ? `${ev.repoUrl}/releases/tag/${ev.refName}` : `${ev.repoUrl}/tree/${ev.refName}`,
      };
    case 'ReleaseEvent':
      return {
        summary: `Released ${ev.releaseTag ?? 'a new version'}`,
        link: ev.releaseTag ? `${ev.repoUrl}/releases/tag/${ev.releaseTag}` : ev.repoUrl,
      };
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
      summary,
      repo: ev.repo.split('/').pop() ?? ev.repo,
      when: relativeTime(ev.createdAt),
      link,
    };
  });
}

function ActivityFeed({ events, reduced }: { events: ActivityEvent[]; reduced: boolean | null }) {
  const items = useMemo(() => toFeedItems(events), [events]);

  if (items.length === 0) {
    return (
      <EmptyNote
        line="No recent public events."
        hint="Most of my recent work is in the repositories below."
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {items.map((it) => (
        <li key={it.id}>
          <FeedRow item={it} reduced={reduced} />
          <Hairline />
        </li>
      ))}
    </ul>
  );
}

const ROW_HOVER =
  '[@media(hover:hover)and(pointer:fine)]:hover:bg-black/[0.03] dark:[@media(hover:hover)and(pointer:fine)]:hover:bg-white/[0.05]';

function FeedRow({ item, reduced }: { item: FeedItem; reduced: boolean | null }) {
  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={reduced ? undefined : { transform: 'scale(0.98)', transition: { duration: 0.13, ease: EASE_OUT } }}
      className={`dapp-row group flex items-start gap-3 px-1 py-3 transition-colors duration-150 ${ROW_HOVER}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-text leading-snug [overflow-wrap:anywhere]">{item.summary}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
          <span className="font-[family-name:var(--font-geist-mono)]">{item.repo}</span>
          <span>{item.when}</span>
        </span>
      </span>
      <ExternalLink size={13} aria-hidden className="mt-1 shrink-0 text-text-secondary" />
    </motion.a>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Repo row
 * ────────────────────────────────────────────────────────────────── */

function RepoRow({ repo, reduced }: { repo: ActiveRepo; reduced: boolean | null }) {
  const mono = useIsMono();
  return (
    <motion.a
      href={repo.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      whileTap={reduced ? undefined : { transform: 'scale(0.98)', transition: { duration: 0.13, ease: EASE_OUT } }}
      className={`dapp-row group flex items-start gap-4 px-1 py-4 transition-colors duration-150 ${ROW_HOVER}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-text text-[1.25rem] leading-tight [overflow-wrap:anywhere]">
          {repo.name}
        </span>
        {repo.description && (
          <span className="mt-1 block max-w-[60ch] text-sm text-text-secondary leading-snug">
            {repo.description}
          </span>
        )}
        <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
          {repo.language && (
            <span className="inline-flex items-center gap-1.5">
              {/* Mono drops the language hue; the name carries the meaning. */}
              <span
                aria-hidden
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
      <ExternalLink size={13} aria-hidden className="mt-1.5 shrink-0 text-text-secondary" />
    </motion.a>
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
 * States
 * ────────────────────────────────────────────────────────────────── */

function EmptyNote({ line, hint }: { line: string; hint: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm text-text">{line}</p>
      <p className="text-sm text-text-secondary">{hint}</p>
    </div>
  );
}

/** Loading: a skeleton in the shape of the page. */
function LoadingState() {
  return (
    <div className="dapp h-full overflow-auto bg-transparent" data-testid="activity-loading">
      <div className="dapp-col flex flex-col gap-12" aria-busy="true" aria-label="Loading GitHub activity">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-full max-w-[40ch]" />
        </div>
        <div className="gh-stats">
          {[0, 1, 2].map((i) => (
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
  return <div className={`rounded bg-text-secondary/10 motion-safe:animate-pulse ${className ?? ''}`} />;
}

/** GitHub gave nothing (down or rate limited): say so, and offer a way forward. */
function UnavailableState({ onRetry }: { onRetry: () => void }) {
  const profileUrl = `https://github.com/${FALLBACK_USER}`;
  return (
    <div className="dapp h-full overflow-auto bg-transparent" data-testid="activity-error">
      <div className="dapp-col dapp-col--read flex flex-col gap-4">
        <h1 className="dapp-title">Activity</h1>
        <div className="flex flex-col gap-2" role="status">
          <p className="text-base text-text">Activity is unavailable right now.</p>
          <p className="dapp-lede">
            GitHub is not answering, usually because of its hourly rate limit. The
            live data comes back on its own. Everything is on my GitHub profile in
            the meantime.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="dapp-button">
            Open github.com/{FALLBACK_USER}
            <ExternalLink size={13} aria-hidden />
          </a>
          <button type="button" onClick={onRetry} className="dapp-button">
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Time + string helpers
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
  const line = s.split('\n')[0];
  if (line.length <= n) return line;
  return line.slice(0, n - 1) + '…';
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
