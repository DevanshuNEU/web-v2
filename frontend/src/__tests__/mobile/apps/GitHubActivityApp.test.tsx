// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import GitHubActivityApp, {
  relativeTime,
} from '@/components/apps/GitHubActivityApp';

/**
 * Component tests for the GitHub Activity surface. /api/github/activity is
 * mocked at the fetch level so tests cover rendering paths (loading, error,
 * populated, partial-failure) without touching the network.
 */

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const SAMPLE_PAYLOAD = {
  username: 'DevanshuNEU',
  events: [
    {
      id: 'evt-1',
      type: 'PushEvent' as const,
      repo: 'DevanshuNEU/devOS',
      repoUrl: 'https://github.com/DevanshuNEU/devOS',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      commits: [
        {
          sha: 'abc123',
          message: 'feat: add iOS Settings to mobile',
          url: 'https://github.com/DevanshuNEU/devOS/commit/abc123',
        },
      ],
    },
    {
      id: 'evt-2',
      type: 'PullRequestEvent' as const,
      repo: 'DevanshuNEU/devOS',
      repoUrl: 'https://github.com/DevanshuNEU/devOS',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      prAction: 'opened' as const,
      prTitle: 'Add GitHub Activity app',
      prUrl: 'https://github.com/DevanshuNEU/devOS/pull/42',
    },
  ],
  calendar: {
    totalLastYear: 1234,
    currentStreak: 7,
    longestStreak: 21,
    days: [
      { date: '2024-05-15', count: 0, level: 0 as const },
      { date: '2024-05-16', count: 3, level: 2 as const },
      { date: '2024-05-17', count: 7, level: 3 as const },
    ],
  },
  activeRepos: [
    {
      name: 'devOS',
      fullName: 'DevanshuNEU/devOS',
      description: 'A portfolio shaped like an operating system',
      htmlUrl: 'https://github.com/DevanshuNEU/devOS',
      language: 'TypeScript',
      stars: 42,
      pushedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
  ],
  fetchedAt: new Date().toISOString(),
  warnings: [],
};

describe('GitHubActivityApp — render states', () => {
  it('shows a loading skeleton before data arrives', () => {
    fetchMock.mockReturnValueOnce(new Promise(() => {})); // never resolves
    render(<GitHubActivityApp variant="mobile" />);
    expect(screen.getByTestId('activity-loading')).toBeInTheDocument();
  });

  it('shows an error state when the fetch fails', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() =>
      expect(screen.getByTestId('activity-error')).toBeInTheDocument()
    );
    expect(screen.getByText(/Activity is unavailable right now/i)).toBeInTheDocument();
    // A way forward: the profile link and a retry, never zero tiles.
    expect(screen.getByRole('link', { name: /github\.com\/DevanshuNEU/i })).toHaveAttribute(
      'href',
      'https://github.com/DevanshuNEU',
    );
    expect(screen.getByRole('button', { name: /Try again/i })).toBeInTheDocument();
    expect(screen.queryByTestId('activity-stats')).not.toBeInTheDocument();
  });

  it('retries the fetch from the unavailable state', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503 });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => SAMPLE_PAYLOAD });
    render(<GitHubActivityApp variant="mobile" />);
    const retry = await screen.findByRole('button', { name: /Try again/i });
    retry.click();
    await waitFor(() => expect(screen.getByTestId('activity-stats')).toBeInTheDocument());
  });

  it('shows an error state when fetch rejects (network)', async () => {
    fetchMock.mockRejectedValueOnce(new Error('NetworkError'));
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() =>
      expect(screen.getByTestId('activity-error')).toBeInTheDocument()
    );
  });
});

describe('GitHubActivityApp — populated mobile render', () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => SAMPLE_PAYLOAD,
    });
  });

  it('renders the mobile shell after loading completes', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() =>
      expect(screen.getByTestId('github-activity-mobile')).toBeInTheDocument()
    );
  });

  it('shows the username under github.com/', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() =>
      expect(screen.getByText(/github\.com\/DevanshuNEU/)).toBeInTheDocument()
    );
  });

  it('renders the three stat tiles', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    const stats = screen.getByTestId('activity-stats');
    // Contributions = 1234, streak = 7 (longest 21), active repos = 1. No stars tile.
    expect(stats).toHaveTextContent('1,234');
    expect(stats).toHaveTextContent('Day streak');
    expect(stats).toHaveTextContent('longest 21');
    expect(stats).toHaveTextContent('Active repos');
    expect(stats).not.toHaveTextContent(/stars/i);
  });

  it('shows the longest streak instead of a current streak of 0', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, calendar: { ...SAMPLE_PAYLOAD.calendar, currentStreak: 0 } }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(screen.getByTestId('activity-stats')).toHaveTextContent('Longest streak');
  });

  it('renders the contribution heatmap when calendar is present', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() =>
      expect(screen.getByTestId('contribution-heatmap')).toBeInTheDocument()
    );
    // Accessible label reflects total contributions.
    expect(
      screen.getByLabelText(/1234 contributions in the last year/i)
    ).toBeInTheDocument();
  });

  it('hides the heatmap section when calendar is null', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, calendar: null }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(screen.queryByTestId('contribution-heatmap')).not.toBeInTheDocument();
  });

  it('hides the heatmap section when calendar exists but has no days', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...SAMPLE_PAYLOAD,
        calendar: { ...SAMPLE_PAYLOAD.calendar!, days: [] },
      }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    // No legend strip floating alone.
    expect(screen.queryByTestId('contribution-heatmap')).not.toBeInTheDocument();
  });

  it('hides calendar tiles (no "--", no "0") and says so when the calendar failed', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, calendar: null, warnings: ['calendar: unavailable'] }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    const stats = screen.getByTestId('activity-stats');
    expect(stats).not.toHaveTextContent('--');
    expect(stats).not.toHaveTextContent('Contributions');
    expect(stats).toHaveTextContent('Active repos');
    expect(screen.getByText(/Some GitHub data did not load/i)).toBeInTheDocument();
  });

  it('says the feed failed instead of showing an empty feed', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, events: [], warnings: ['events: GitHub API error: 403'] }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(screen.getByText(/did not return recent events/i)).toBeInTheDocument();
    expect(screen.queryByText(/No recent public events/i)).not.toBeInTheDocument();
  });

  it('labels a PR without a title by number and branch, never "PR: " alone', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...SAMPLE_PAYLOAD,
        events: [{
          id: 'evt-3',
          type: 'PullRequestEvent',
          repo: 'DevanshuNEU/overhear',
          repoUrl: 'https://github.com/DevanshuNEU/overhear',
          createdAt: new Date().toISOString(),
          prAction: 'merged',
          prNumber: 31,
          prBranch: 'fix/clinic-service-guards',
          prUrl: 'https://github.com/DevanshuNEU/overhear/pull/31',
        }],
      }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    const row = await screen.findByText('Merged PR #31: fix/clinic-service-guards');
    expect(row.closest('a')).toHaveAttribute('href', 'https://github.com/DevanshuNEU/overhear/pull/31');
  });

  it('renders each event with a summary line', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() =>
      expect(
        screen.getByText(/feat: add iOS Settings to mobile/i)
      ).toBeInTheDocument()
    );
    expect(screen.getByText(/Add GitHub Activity app/i)).toBeInTheDocument();
  });

  it('event links open in a new tab', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByText(/Add GitHub Activity app/i));
    const links = screen.getAllByRole('link');
    links.forEach((l: HTMLElement) => {
      if (l.getAttribute('href')?.startsWith('https://github.com')) {
        expect(l).toHaveAttribute('target', '_blank');
        expect(l.getAttribute('rel')).toContain('noopener');
      }
    });
  });

  it('renders the active repo with description and language indicator', async () => {
    render(<GitHubActivityApp variant="mobile" />);
    // The description is unique to the repo row (events don't carry it).
    await waitFor(() =>
      expect(
        screen.getByText('A portfolio shaped like an operating system')
      ).toBeInTheDocument()
    );
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    // "devOS" appears both as the repo name and inside event rows.
    expect(screen.getAllByText('devOS').length).toBeGreaterThan(0);
  });

  it('shows empty state copy when events array is empty', async () => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, events: [] }),
    });
    render(<GitHubActivityApp variant="mobile" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(screen.getByText(/No recent public events/i)).toBeInTheDocument();
  });
});

describe('GitHubActivityApp — desktop empty states', () => {
  it('shows an empty-state row when desktop events array is empty', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, events: [] }),
    });
    render(<GitHubActivityApp variant="desktop" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(screen.getByText(/No recent public events/i)).toBeInTheDocument();
  });

  it('shows an empty-state row when desktop activeRepos array is empty', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...SAMPLE_PAYLOAD, activeRepos: [] }),
    });
    render(<GitHubActivityApp variant="desktop" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(
      screen.getByText(/No recently-pushed repositories/i)
    ).toBeInTheDocument();
  });
});

describe('GitHubActivityApp — desktop variant', () => {
  it('does not render the mobile shell when variant is desktop', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => SAMPLE_PAYLOAD,
    });
    render(<GitHubActivityApp variant="desktop" />);
    await waitFor(() => screen.getByTestId('activity-stats'));
    expect(
      screen.queryByTestId('github-activity-mobile')
    ).not.toBeInTheDocument();
  });
});

describe('relativeTime helper', () => {
  it('formats seconds', () => {
    const t = new Date(Date.now() - 10_000).toISOString();
    expect(relativeTime(t)).toMatch(/\d+s ago/);
  });

  it('formats minutes', () => {
    const t = new Date(Date.now() - 1000 * 60 * 5).toISOString();
    expect(relativeTime(t)).toMatch(/5m ago/);
  });

  it('formats hours', () => {
    const t = new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString();
    expect(relativeTime(t)).toMatch(/3h ago/);
  });

  it('formats days', () => {
    const t = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString();
    expect(relativeTime(t)).toMatch(/2d ago/);
  });

  it('formats weeks', () => {
    const t = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString();
    expect(relativeTime(t)).toMatch(/1w ago/);
  });

  it('formats months', () => {
    const t = new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString();
    expect(relativeTime(t)).toMatch(/3mo ago/);
  });

  it('formats years', () => {
    const t = new Date(Date.now() - 1000 * 60 * 60 * 24 * 400).toISOString();
    expect(relativeTime(t)).toMatch(/1y ago/);
  });
});
