// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileAppIcon from '@/components/mobile/ui/MobileAppIcon';

describe('MobileAppIcon', () => {
  it('renders the icon content inside the squircle', () => {
    render(<MobileAppIcon icon={<span data-testid="ico">★</span>} label="Star" />);
    expect(screen.getByTestId('ico')).toBeInTheDocument();
  });

  it('renders the label when provided', () => {
    render(<MobileAppIcon icon="x" label="Music" />);
    expect(screen.getByTestId('app-icon-label')).toHaveTextContent('Music');
  });

  it('omits the label slot entirely when label is not provided', () => {
    render(<MobileAppIcon icon="x" />);
    expect(screen.queryByTestId('app-icon-label')).not.toBeInTheDocument();
  });

  it('uses the label for the button accessible name when provided', () => {
    render(<MobileAppIcon icon="x" label="Notes" />);
    expect(screen.getByRole('button', { name: 'Open Notes' })).toBeInTheDocument();
  });

  it('falls back to a generic accessible name when no label is given', () => {
    render(<MobileAppIcon icon="x" />);
    expect(screen.getByRole('button', { name: 'App icon' })).toBeInTheDocument();
  });

  it('invokes onClick when the icon is tapped', async () => {
    const onClick = vi.fn();
    render(<MobileAppIcon icon="x" label="Mail" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: 'Open Mail' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not show a badge when badge is omitted', () => {
    render(<MobileAppIcon icon="x" />);
    expect(screen.queryByTestId('app-icon-badge')).not.toBeInTheDocument();
  });

  it('does not show a badge when badge=false', () => {
    render(<MobileAppIcon icon="x" badge={false} />);
    expect(screen.queryByTestId('app-icon-badge')).not.toBeInTheDocument();
  });

  it('does not show a badge when badge=0 (zero pending → nothing to show)', () => {
    render(<MobileAppIcon icon="x" badge={0} />);
    expect(screen.queryByTestId('app-icon-badge')).not.toBeInTheDocument();
  });

  it('renders the numeric badge with the count', () => {
    render(<MobileAppIcon icon="x" badge={5} />);
    expect(screen.getByTestId('app-icon-badge')).toHaveTextContent('5');
  });

  it('caps badge counts above 99 to "99+"', () => {
    render(<MobileAppIcon icon="x" badge={123} />);
    expect(screen.getByTestId('app-icon-badge')).toHaveTextContent('99+');
  });

  it('renders an empty dot badge for badge=true', () => {
    render(<MobileAppIcon icon="x" badge={true} />);
    const badge = screen.getByTestId('app-icon-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('');
  });

  it('badge has an accessible label describing the unread state', () => {
    render(<MobileAppIcon icon="x" label="Mail" badge={3} />);
    expect(screen.getByLabelText('3 unread')).toBeInTheDocument();
  });

  it('size prop scales the squircle dimensions', () => {
    render(<MobileAppIcon icon="x" size={80} />);
    const sq = screen.getByTestId('app-icon-squircle');
    expect(sq).toHaveStyle({ width: '80px', height: '80px' });
  });

  it('border-radius scales with size (squircle proportion)', () => {
    render(<MobileAppIcon icon="x" size={100} />);
    const sq = screen.getByTestId('app-icon-squircle');
    // 100 * 0.225 = 22.5, rounded to 23
    expect(sq.style.borderRadius).toBe('23px');
  });

  it('applies a custom background color', () => {
    render(<MobileAppIcon icon="x" background="#ff00ff" />);
    expect(screen.getByTestId('app-icon-squircle')).toHaveStyle({
      background: 'rgb(255, 0, 255)',
    });
  });
});
