// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileExplorerApp from '@/components/apps/FileExplorerApp';
import { projectMeta, getAllProjectKeys } from '@/data/projectMeta';
import { useOSStore } from '@/store/osStore';
import type { EnrichedRepo } from '@/app/api/github/repos/route';

/**
 * FileExplorerApp ("Finder") - editorial redesign.
 *
 * Covers the load-bearing behaviour the reskin must preserve:
 *   - its files are the Projects app's projects (data/projectMeta.ts), never
 *     a second hardcoded copy;
 *   - folder rail with live per-folder counts and status filtering;
 *   - the file list, selecting a file, the detail pane, and closing it;
 *   - live GitHub data (stars + language) flowing from /api/github/repos into
 *     the mono spec line (never hardcoded);
 *   - quiet editorial links carry the right href / target / rel;
 *   - the persona guarantee for Finder's own wording: no student / graduation /
 *     degree / visa words.
 */

const PERSONA_BANNED =
  /\b(student|pursuing|seeking|graduation|graduated|degree|university|visa|f-?1|opt)\b/i;

type User = ReturnType<typeof userEvent.setup>;

// A minimal live payload: CallBudget gets live stars + a live language that
// differs from its lead tech, so we can prove the spec line reads from the API.
const LIVE_REPOS: Partial<EnrichedRepo>[] = [
  { name: 'callbudget', stars: 42, language: 'Jupyter Notebook' },
  { name: 'saar', stars: 7, language: 'Python' },
];

function mockReposOk() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/github/repos')) {
        return new Response(JSON.stringify(LIVE_REPOS), { status: 200 });
      }
      return new Response('null', { status: 200 });
    }),
  );
}

function mockReposFail() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('error', { status: 500 })),
  );
}

beforeEach(() => {
  // jsdom has no matchMedia; useReducedMotion calls it.
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
  // jsdom does not implement scrollTo on elements.
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const TOTAL = getAllProjectKeys().length;

describe('FileExplorerApp data source', () => {
  it('lists exactly the projects in projectMeta, in Projects order', () => {
    mockReposOk();
    render(<FileExplorerApp />);
    const rows = screen.getAllByTestId('finder-file-row');
    expect(rows.length).toBe(TOTAL);
    getAllProjectKeys().forEach((key, i) => {
      expect(rows[i].textContent).toContain(projectMeta[key].displayName);
      expect(rows[i].textContent).toContain(projectMeta[key].tagline);
    });
  });
});

describe('FileExplorerApp folder rail', () => {
  it('renders status folders with live per-folder counts', () => {
    mockReposOk();
    render(<FileExplorerApp />);

    const rows = screen.getAllByTestId('finder-folder-row');
    expect(rows.map((r) => r.textContent?.replace(/\d+$/, ''))).toEqual(
      expect.arrayContaining(['All projects', 'Featured', 'Active', 'Completed']),
    );
    const all = rows.find((r) => /^All projects/i.test(r.textContent ?? ''))!;
    expect(all.textContent).toMatch(new RegExp(`${TOTAL}$`));
    expect(all).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters the file list when a folder is selected', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);

    expect(screen.getAllByTestId('finder-file-row').length).toBe(TOTAL);

    const experimental = screen
      .getAllByTestId('finder-folder-row')
      .find((r) => /Experimental/i.test(r.textContent ?? ''))!;
    await user.click(experimental);

    const expected = Object.values(projectMeta).filter((m) => m.status === 'experimental');
    const after = screen.getAllByTestId('finder-file-row');
    expect(after.length).toBe(expected.length);
    expect(after[0].textContent).toMatch(/Tool Crowding/i);
    expect(experimental).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('FileExplorerApp detail pane', () => {
  async function selectCallBudget(user: User) {
    const row = screen
      .getAllByTestId('finder-file-row')
      .find((r) => /CallBudget/i.test(r.textContent ?? ''))!;
    await user.click(row);
  }

  it('opens a detail pane with serif title, overview and stack on select', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);

    await selectCallBudget(user);

    // The detail title is the h2 (file rows render the name as an h3).
    expect(
      screen.getByRole('heading', { name: 'CallBudget', level: 2 }),
    ).toBeInTheDocument();
    // Long description (overview) comes from projectMeta.
    expect(screen.getByText(projectMeta.callbudget.descriptionOverride!)).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Stack')).toBeInTheDocument();
  });

  it('reflects live stars and live language in the spec line', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);

    await selectCallBudget(user);

    // Live values from the API, not anything hardcoded.
    await waitFor(() =>
      expect(screen.getAllByText(/42 STARS/i).length).toBeGreaterThan(0),
    );
    // Live language ("Jupyter Notebook") overrides the lead tech ("Python").
    expect(screen.getAllByText('Jupyter Notebook').length).toBeGreaterThan(0);
  });

  it('carries quiet editorial links with correct href / target / rel', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);

    await selectCallBudget(user);

    const github = screen.getByRole('link', { name: /GitHub/i });
    expect(github).toHaveAttribute(
      'href',
      'https://github.com/DevanshuNEU/callbudget',
    );
    expect(github).toHaveAttribute('target', '_blank');
    expect(github).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('closes the detail pane via the Close control', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);

    await selectCallBudget(user);
    expect(
      screen.getByRole('heading', { name: 'CallBudget', level: 2 }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close preview/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole('heading', { name: 'CallBudget', level: 2 }),
      ).not.toBeInTheDocument(),
    );
  });

  it('uses status as a mono label, never a colored badge', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);

    await selectCallBudget(user);
    // CallBudget is status "active" -> Active label (CSS uppercases it).
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it('keeps the file open when it is clicked again', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp />);
    await selectCallBudget(user);
    await selectCallBudget(user);
    expect(screen.getByRole('heading', { name: 'CallBudget', level: 2 })).toBeInTheDocument();
  });

  it('opens the Projects app from the preview', async () => {
    mockReposOk();
    const openWindow = vi.fn();
    const original = useOSStore.getState().openWindow;
    useOSStore.setState({ openWindow });
    const user = userEvent.setup();
    render(<FileExplorerApp />);
    await selectCallBudget(user);
    await user.click(screen.getByRole('button', { name: 'Open in Projects' }));
    expect(openWindow).toHaveBeenCalledWith('projects');
    useOSStore.setState({ openWindow: original });
  });
});

describe('FileExplorerApp resilience + persona', () => {
  it('still renders the file list when the live API fails', async () => {
    mockReposFail();
    render(<FileExplorerApp />);

    await waitFor(() =>
      expect(screen.getAllByTestId('finder-file-row').length).toBe(TOTAL),
    );
    // No stars cell appears, but the status label still does (local data).
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
  });

  it("never renders student / graduation / degree / visa wording in Finder's own text", () => {
    mockReposOk();
    const { container } = render(<FileExplorerApp />);
    // Project rows carry projectMeta text (owned by the Projects data); check
    // Finder's chrome around them.
    const chrome = container.cloneNode(true) as HTMLElement;
    chrome.querySelectorAll('[data-testid="finder-file-row"]').forEach((n) => n.remove());
    expect(chrome.textContent ?? '').not.toMatch(PERSONA_BANNED);
  });
});

describe('FileExplorerApp mobile variant', () => {
  it('renders the push-view root with folder chips and file rows', async () => {
    mockReposOk();
    render(<FileExplorerApp variant="mobile" />);

    expect(screen.getByTestId('push-view-container')).toBeInTheDocument();
    expect(screen.getAllByTestId('finder-folder-chip').length).toBeGreaterThan(1);
    expect(screen.getAllByTestId('finder-file-row').length).toBe(TOTAL);
  });

  it('pushes an editorial detail view when a file row is tapped', async () => {
    mockReposOk();
    const user = userEvent.setup();
    render(<FileExplorerApp variant="mobile" />);

    const row = screen
      .getAllByTestId('finder-file-row')
      .find((r) => /CallBudget/i.test(r.textContent ?? ''))!;
    await user.click(row);

    // The pushed view carries the editorial detail body.
    const detail = await screen.findByTestId('push-view-callbudget');
    expect(within(detail).getByText('Overview')).toBeInTheDocument();
    expect(within(detail).getByText('Stack')).toBeInTheDocument();
  });
});
