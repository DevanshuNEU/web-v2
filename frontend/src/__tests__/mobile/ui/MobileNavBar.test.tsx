// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileNavBar from '@/components/mobile/ui/MobileNavBar';

describe('MobileNavBar', () => {
  it('renders string title as a heading', () => {
    render(<MobileNavBar title="Settings" />);
    expect(screen.getByRole('heading', { name: 'Settings', level: 1 })).toBeInTheDocument();
  });

  it('hides the back button when onBack is not provided', () => {
    render(<MobileNavBar title="Settings" />);
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('renders the back button when onBack is provided and invokes it on click', async () => {
    const onBack = vi.fn();
    render(<MobileNavBar title="Detail" onBack={onBack} />);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders the back label text after the chevron when provided', () => {
    render(<MobileNavBar title="Detail" onBack={() => {}} backLabel="Projects" />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('back button aria-label includes the backLabel when present (better a11y)', () => {
    render(<MobileNavBar title="Detail" onBack={() => {}} backLabel="Projects" />);
    expect(screen.getByRole('button', { name: 'Back to Projects' })).toBeInTheDocument();
  });

  it('renders an arbitrary right-action node', () => {
    render(
      <MobileNavBar
        title="x"
        rightAction={<button>Done</button>}
      />
    );
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('accepts a ReactNode title (no heading wrapper)', () => {
    render(<MobileNavBar title={<span data-testid="custom-title">Custom</span>} />);
    expect(screen.getByTestId('custom-title')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('forwards className to the root', () => {
    const { container } = render(<MobileNavBar title="x" className="my-extra" />);
    expect(container.firstChild).toHaveClass('my-extra');
  });
});
