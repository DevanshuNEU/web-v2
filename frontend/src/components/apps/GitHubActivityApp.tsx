'use client';

/**
 * GitHubActivityApp — live activity surface backed by /api/github/activity.
 *
 * Why this app exists: a portfolio that *says* "I ship a lot" is unconvincing.
 * The same portfolio rendering today's contribution graph + last week's
 * commits + currently-active repos is unfakeable, and is the single
 * highest-credibility surface a recruiter or founder can see on first visit.
 *
 * Layout (mobile, top to bottom):
 *   1. Hero stat strip — commits this year, current streak, active repos, stars
 *   2. Contribution heatmap — full year, scaled to fit screen width
 *   3. Recent Activity feed — last ~10 push events with commit messages
 *   4. Active repos — anything pushed in the last 60 days
 *
 * Desktop variant uses the same building blocks at slightly larger scale
 * with a two-column split for sections 3 + 4.
 */

import { useEffect, useState } from 'react';
import {
  GitCommit,
  GitPullRequest,
  GitBranch,
  Tag,
  Star,
  Flame,
  Activity as ActivityIcon,
  ExternalLink,
  Github,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '@/store/themeStore';
import type {
  ActivityEvent,
  ContributionCalendar,
  ContributionDay,
} from '@/lib/github';

/* ────────────────────────────────────────────────────────────────────
 * API client types — kept in sync with /api/github/activity payload
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

/* ────────────────────────────────────────────────────────────────────
 * Public entry — branches on variant
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

  if (error) return <ErrorState message={error} variant={variant} />;
  if (!data) return <LoadingState variant={variant} />;

  return variant === 'mobile' ? (
    <MobileLayout data={data} />
  ) : (
    <DesktopLayout data={data} />
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Mobile layout
 * ────────────────────────────────────────────────────────────────── */

function MobileLayout({ data }: { data: ActivePayload }) {
  return (
    <div
      className="h-full overflow-y-auto bg-bg text-text"
      data-testid="github-activity-mobile"
    >
      <header className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 text-text-secondary text-[11px] font-medium uppercase tracking-wider">
          <Github size={12} />
          <span>github.com/{data.username}</span>
        </div>
        <h1 className="text-[28px] font-bold mt-1">Activity</h1>
      </header>

      <StatStrip data={data} />

      {data.calendar && data.calendar.days.length > 0 && (
        <section className="px-4 pt-5">
          <SectionHeader title="Contributions" subtitle="Last 12 months" />
          <div className="mt-3 mx-1">
            <ContributionHeatmap calendar={data.calendar} compact />
          </div>
          <CalendarLegend />
        </section>
      )}

      <section className="px-4 pt-6">
        <SectionHeader title="Recent Activity" subtitle="Live from the public events feed" />
        <div className="mt-3 mx-1 rounded-2xl bg-surface dark:bg-white/[0.04] overflow-hidden divide-y divide-text-secondary/10">
          {data.events.length === 0 ? (
            <EmptyRow text="No recent public events." />
          ) : (
            data.events.slice(0, 10).map((ev) => <EventRow key={ev.id} event={ev} />)
          )}
        </div>
      </section>

      <section className="px-4 pt-6 pb-10">
        <SectionHeader
          title="Active Repositories"
          subtitle="Pushed within the last 60 days"
        />
        <div className="mt-3 mx-1 flex flex-col gap-2">
          {data.activeRepos.length === 0 ? (
            <EmptyRow text="No recently-pushed repositories." />
          ) : (
            data.activeRepos.map((r) => <RepoRow key={r.fullName} repo={r} />)
          )}
        </div>
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Desktop layout
 * ────────────────────────────────────────────────────────────────── */

function DesktopLayout({ data }: { data: ActivePayload }) {
  return (
    <div className="h-full overflow-y-auto bg-bg text-text">
      <header className="px-6 pt-6 pb-4 border-b border-text-secondary/10">
        <div className="flex items-center gap-2 text-text-secondary text-[11px] font-medium uppercase tracking-wider">
          <Github size={12} />
          <span>github.com/{data.username}</span>
        </div>
        <h1 className="text-[24px] font-bold mt-1">Activity</h1>
      </header>

      <div className="p-6 flex flex-col gap-6">
        <StatStrip data={data} />

        {data.calendar && data.calendar.days.length > 0 && (
          <section>
            <SectionHeader title="Contributions" subtitle="Last 12 months" />
            <div className="mt-3">
              <ContributionHeatmap calendar={data.calendar} compact={false} />
            </div>
            <CalendarLegend />
          </section>
        )}

        <div className="grid grid-cols-2 gap-6">
          <section>
            <SectionHeader title="Recent Activity" subtitle="Live public events" />
            <div className="mt-3 rounded-xl bg-surface dark:bg-white/[0.04] overflow-hidden divide-y divide-text-secondary/10">
              {data.events.length === 0 ? (
                <EmptyRow text="No recent public events." />
              ) : (
                data.events.slice(0, 10).map((ev) => <EventRow key={ev.id} event={ev} />)
              )}
            </div>
          </section>
          <section>
            <SectionHeader title="Active Repositories" subtitle="Last 60 days" />
            <div className="mt-3 flex flex-col gap-2">
              {data.activeRepos.length === 0 ? (
                <EmptyRow text="No recently-pushed repositories." />
              ) : (
                data.activeRepos.map((r) => <RepoRow key={r.fullName} repo={r} />)
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Stat strip — four pill cards
 * ────────────────────────────────────────────────────────────────── */

function StatStrip({ data }: { data: ActivePayload }) {
  // Calendar-derived stats render as "—" when the calendar fetch failed, so
  // a visitor doesn't read "0 day streak" and assume Devanshu has stopped
  // shipping — they correctly read it as "data unavailable."
  const hasCalendar = data.calendar !== null;
  const contributionsLabel = hasCalendar
    ? data.calendar!.totalLastYear.toLocaleString()
    : '—';
  const streak = data.calendar?.currentStreak ?? 0;
  const longestStreak = data.calendar?.longestStreak ?? 0;
  const streakLabel = hasCalendar ? streak : '—';
  const activeCount = data.activeRepos.length;
  const totalStars = data.activeRepos.reduce((s, r) => s + r.stars, 0);

  return (
    <div className="px-4 mt-1 grid grid-cols-2 gap-2" data-testid="activity-stats">
      <StatCard
        icon={<GitCommit size={16} />}
        value={contributionsLabel}
        label="contributions"
        sub="last 12 months"
        accent="#34d399"
      />
      <StatCard
        icon={<Flame size={16} />}
        value={streakLabel}
        label="day streak"
        sub={
          !hasCalendar
            ? 'data unavailable'
            : longestStreak > streak
            ? `longest ${longestStreak}`
            : 'current'
        }
        accent="#f97316"
      />
      <StatCard
        icon={<ActivityIcon size={16} />}
        value={activeCount}
        label="active repos"
        sub="pushed recently"
        accent="#60a5fa"
      />
      <StatCard
        icon={<Star size={16} />}
        value={totalStars}
        label="stars"
        sub="across active repos"
        accent="#facc15"
      />
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
  sub: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl p-3 bg-surface dark:bg-white/[0.04] flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-[11px] text-text-secondary font-medium uppercase tracking-wide">
        <span style={{ color: accent }} className="flex">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="text-[22px] font-semibold text-text leading-none">
        {value}
      </div>
      <div className="text-[11px] text-text-secondary">{sub}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Contribution heatmap — 7 rows × ~53 columns
 * ────────────────────────────────────────────────────────────────── */

function ContributionHeatmap({
  calendar,
  compact,
}: {
  calendar: ContributionCalendar;
  compact: boolean;
}) {
  const { mode } = useTheme();
  const cellSize = compact ? 9 : 12;
  const gap = 2;

  // Pad with empty cells so the first cell sits on its actual weekday row.
  // GitHub displays Sun as the top row, so weekday 0..6 = Sun..Sat.
  const days = calendar.days;
  if (days.length === 0) return null;
  const firstDay = new Date(days[0].date);
  const firstWeekday = firstDay.getUTCDay(); // 0=Sun..6=Sat
  const padded: Array<ContributionDay | null> = [
    ...Array(firstWeekday).fill(null),
    ...days,
  ];

  return (
    <div
      className="overflow-x-auto pb-1 -mx-1 px-1"
      data-testid="contribution-heatmap"
      aria-label={`${calendar.totalLastYear} contributions in the last year`}
    >
      <div
        className="grid grid-rows-7 grid-flow-col"
        style={{
          gap: `${gap}px`,
          width: 'fit-content',
        }}
      >
        {padded.map((d, i) => (
          <div
            key={i}
            className="rounded-[2px]"
            style={{
              width: cellSize,
              height: cellSize,
              background: d ? cellColor(d.level, mode) : 'transparent',
            }}
            title={d ? `${d.date} · ${d.count} contributions` : undefined}
            data-level={d?.level}
          />
        ))}
      </div>
    </div>
  );
}

function cellColor(level: number, mode: 'light' | 'dark'): string {
  // GitHub's official palette (dark = darker base, brighter greens).
  const dark = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
  const light = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
  const scale = mode === 'dark' ? dark : light;
  return scale[Math.max(0, Math.min(4, level))];
}

function CalendarLegend() {
  const { mode } = useTheme();
  return (
    <div className="flex items-center gap-1.5 mt-2 px-1 text-[10px] text-text-secondary">
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((lvl) => (
        <span
          key={lvl}
          className="w-2 h-2 rounded-[2px] inline-block"
          style={{ background: cellColor(lvl, mode) }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
 * Event row — one line per push/PR/release/branch
 * ────────────────────────────────────────────────────────────────── */

function EventRow({ event }: { event: ActivityEvent }) {
  const repoName = event.repo.split('/').pop() ?? event.repo;
  const when = relativeTime(event.createdAt);

  const { icon, summary, link } = describeEvent(event);

  return (
    <a
      href={link ?? event.repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 active:opacity-70 hover:bg-text-secondary/[0.03] transition-colors"
    >
      <span className="mt-0.5 text-text-secondary shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] text-text leading-snug">
          <span className="font-medium">{summary}</span>
        </div>
        <div className="text-[12px] text-text-secondary mt-0.5 flex items-center gap-1.5 truncate">
          <span className="truncate">{repoName}</span>
          <span className="text-text-secondary/40">·</span>
          <span className="shrink-0">{when}</span>
        </div>
      </div>
      <ExternalLink size={13} className="text-text-secondary/40 shrink-0 mt-1" />
    </a>
  );
}

function describeEvent(ev: ActivityEvent): {
  icon: React.ReactNode;
  summary: string;
  link?: string;
} {
  switch (ev.type) {
    case 'PushEvent': {
      const commits = ev.commits ?? [];
      const last = commits[commits.length - 1];
      const summary =
        commits.length > 1
          ? `Pushed ${commits.length} commits — ${truncate(last?.message ?? '', 64)}`
          : `Pushed: ${truncate(last?.message ?? '', 80)}`;
      return {
        icon: <GitCommit size={16} />,
        summary,
        link: last?.url,
      };
    }
    case 'PullRequestEvent':
      return {
        icon: <GitPullRequest size={16} />,
        summary: `${capitalize(ev.prAction ?? 'updated')} PR: ${truncate(ev.prTitle ?? '', 80)}`,
        link: ev.prUrl,
      };
    case 'CreateEvent':
      return {
        icon: <GitBranch size={16} />,
        summary: `Created ${ev.refType ?? 'thing'}`,
      };
    case 'ReleaseEvent':
      return {
        icon: <Tag size={16} />,
        summary: `Released ${ev.releaseTag ?? ''}`,
      };
    case 'IssuesEvent':
      return { icon: <ActivityIcon size={16} />, summary: 'Worked on an issue' };
    case 'WatchEvent':
      return { icon: <Star size={16} />, summary: 'Starred a repo' };
    case 'ForkEvent':
      return { icon: <GitBranch size={16} />, summary: 'Forked a repo' };
    default:
      return { icon: <ActivityIcon size={16} />, summary: 'Activity' };
  }
}

/* ────────────────────────────────────────────────────────────────────
 * Repo row
 * ────────────────────────────────────────────────────────────────── */

function RepoRow({
  repo,
}: {
  repo: ActivePayload['activeRepos'][number];
}) {
  return (
    <a
      href={repo.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-surface dark:bg-white/[0.04] active:opacity-70 hover:bg-text-secondary/[0.05] transition-colors"
    >
      <span className="mt-0.5 text-text-secondary shrink-0">
        <Github size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-text truncate">{repo.name}</div>
        {repo.description && (
          <div className="text-[12px] text-text-secondary mt-0.5 line-clamp-2 leading-snug">
            {repo.description}
          </div>
        )}
        <div className="text-[11px] text-text-secondary mt-1.5 flex items-center gap-2 flex-wrap">
          {repo.language && (
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full inline-block"
                style={{ background: languageColor(repo.language) }}
              />
              {repo.language}
            </span>
          )}
          {repo.stars > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={11} /> {repo.stars}
            </span>
          )}
          <span>· {relativeTime(repo.pushedAt)}</span>
        </div>
      </div>
      <ExternalLink size={13} className="text-text-secondary/40 shrink-0 mt-1.5" />
    </a>
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
 * Small helpers + states
 * ────────────────────────────────────────────────────────────────── */

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-1 flex items-baseline gap-2">
      <h2 className="text-[18px] font-semibold text-text">{title}</h2>
      {subtitle && (
        <span className="text-[12px] text-text-secondary">{subtitle}</span>
      )}
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="px-4 py-6 text-center text-[13px] text-text-secondary">
      {text}
    </div>
  );
}

function LoadingState({ variant }: { variant: 'desktop' | 'mobile' }) {
  return (
    <div
      className={`h-full flex flex-col gap-4 bg-bg ${variant === 'mobile' ? 'p-5' : 'p-6'}`}
      data-testid="activity-loading"
    >
      <div className="h-7 w-24 bg-text-secondary/10 rounded animate-pulse" />
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-text-secondary/10 animate-pulse" />
        ))}
      </div>
      <div className="h-32 rounded-2xl bg-text-secondary/10 animate-pulse mt-2" />
      <div className="h-48 rounded-2xl bg-text-secondary/10 animate-pulse" />
    </div>
  );
}

function ErrorState({ message, variant }: { message: string; variant: 'desktop' | 'mobile' }) {
  return (
    <div
      className={`h-full flex flex-col items-center justify-center gap-3 text-center px-8 bg-bg ${
        variant === 'mobile' ? 'pt-12' : 'pt-20'
      }`}
      data-testid="activity-error"
    >
      <AlertCircle size={28} className="text-text-secondary/70" />
      <p className="text-[15px] text-text font-medium">Couldn't load activity</p>
      <p className="text-[13px] text-text-secondary max-w-[280px]">
        {message}. GitHub or the contributions API may be rate-limiting.
      </p>
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
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
