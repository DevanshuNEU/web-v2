// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrowserApp from '@/components/apps/BrowserApp';

/**
 * Browser: pages from this site open inside the window (same-origin iframe);
 * other sites are plain new-tab links, labeled as such.
 */

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('BrowserApp', () => {
  it('opens a page from this site inside the window', async () => {
    const user = userEvent.setup();
    const { container } = render(<BrowserApp />);
    await user.click(screen.getByRole('button', { name: /Writing/ }));
    const frame = container.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame!.getAttribute('src')).toBe(`${window.location.origin}/writing`);
    expect(screen.getByRole('textbox', { name: 'Address' })).toHaveValue(`${window.location.origin}/writing`);
  });

  it('renders other sites as links that open a new tab, and says so', () => {
    render(<BrowserApp />);
    const gh = screen.getByRole('link', { name: /GitHub/ });
    expect(gh).toHaveAttribute('href', 'https://github.com/DevanshuNEU');
    expect(gh).toHaveAttribute('target', '_blank');
    expect(gh).toHaveAttribute('rel', 'noopener noreferrer');
    expect(gh.textContent).toMatch(/opens in a new tab/i);
  });

  it('shows an honest card for input that is not a site address', async () => {
    const user = userEvent.setup();
    render(<BrowserApp />);
    await user.type(screen.getByRole('textbox', { name: 'Address' }), 'react hooks{Enter}');
    expect(screen.getByText('That is not a site address')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /search the web/i })).toHaveAttribute(
      'href',
      'https://duckduckgo.com/?q=react%20hooks',
    );
  });

  it('offers a new-tab card for an outside site typed in the address bar', async () => {
    const user = userEvent.setup();
    render(<BrowserApp />);
    await user.type(screen.getByRole('textbox', { name: 'Address' }), 'getsaar.com{Enter}');
    expect(screen.getByText('getsaar.com opens in a new tab')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeDisabled();
  });

  it('on the phone, every row is a new-tab link and there is no toolbar', () => {
    render(<BrowserApp variant="mobile" />);
    expect(screen.queryByRole('textbox', { name: 'Address' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Writing/ })).toHaveAttribute('target', '_blank');
  });
});
