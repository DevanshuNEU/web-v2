// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileActionRow from '@/components/mobile/ui/MobileActionRow';

describe('MobileActionRow', () => {
  it('renders the title and icon', () => {
    render(
      <MobileActionRow
        icon={<span data-testid="ico">@</span>}
        title="Send Email"
      />
    );
    expect(screen.getByText('Send Email')).toBeInTheDocument();
    expect(screen.getByTestId('ico')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(
      <MobileActionRow
        icon="@"
        title="Send Email"
        subtitle="hello@example.com"
      />
    );
    expect(screen.getByText('hello@example.com')).toBeInTheDocument();
  });

  it('renders as a <button> when onClick is provided (no href)', () => {
    const onClick = vi.fn();
    render(<MobileActionRow icon="@" title="Tap me" onClick={onClick} />);
    const el = screen.getByRole('button', { name: /tap me/i });
    expect(el.tagName).toBe('BUTTON');
  });

  it('invokes onClick when tapped (button variant)', async () => {
    const onClick = vi.fn();
    render(<MobileActionRow icon="@" title="Tap me" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /tap me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders as an <a target="_blank"> when href is provided', () => {
    render(
      <MobileActionRow
        icon="@"
        title="Open on LinkedIn"
        href="https://linkedin.com/in/x"
      />
    );
    const link = screen.getByRole('link', { name: /open on linkedin/i });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', 'https://linkedin.com/in/x');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('link variant includes rel="noopener noreferrer" (security)', () => {
    render(
      <MobileActionRow
        icon="@"
        title="External"
        href="https://example.com"
      />
    );
    const link = screen.getByRole('link');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
  });

  it('defaults to chevron accessory when onClick is set (no href)', () => {
    const { container } = render(
      <MobileActionRow icon="@" title="X" onClick={() => {}} />
    );
    // Lucide renders an <svg> with class containing "lucide-chevron-right".
    expect(container.querySelector('.lucide-chevron-right')).toBeTruthy();
    expect(container.querySelector('.lucide-external-link')).toBeFalsy();
  });

  it('defaults to external-link accessory when href is set', () => {
    const { container } = render(
      <MobileActionRow icon="@" title="X" href="https://x.com" />
    );
    expect(container.querySelector('.lucide-external-link')).toBeTruthy();
    expect(container.querySelector('.lucide-chevron-right')).toBeFalsy();
  });

  it('defaults to no accessory when neither onClick nor href is set', () => {
    const { container } = render(<MobileActionRow icon="@" title="X" />);
    expect(container.querySelector('.lucide-chevron-right')).toBeFalsy();
    expect(container.querySelector('.lucide-external-link')).toBeFalsy();
  });

  it('respects explicit accessory="none" override', () => {
    const { container } = render(
      <MobileActionRow icon="@" title="X" href="https://x.com" accessory="none" />
    );
    expect(container.querySelector('.lucide-external-link')).toBeFalsy();
  });

  it('respects explicit accessory="chevron" on a link (override)', () => {
    const { container } = render(
      <MobileActionRow
        icon="@"
        title="X"
        href="https://x.com"
        accessory="chevron"
      />
    );
    expect(container.querySelector('.lucide-chevron-right')).toBeTruthy();
    expect(container.querySelector('.lucide-external-link')).toBeFalsy();
  });

  it('applies a custom iconBackground color', () => {
    render(
      <MobileActionRow
        icon={<span data-testid="ico">@</span>}
        title="X"
        iconBackground="#00ff00"
      />
    );
    // The icon's parent tile carries the color.
    const tile = screen.getByTestId('ico').parentElement!;
    expect(tile).toHaveStyle({ background: 'rgb(0, 255, 0)' });
  });

  it('forwards className', () => {
    render(
      <MobileActionRow icon="@" title="X" onClick={() => {}} className="custom-thing" />
    );
    expect(screen.getByRole('button')).toHaveClass('custom-thing');
  });
});
