// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileListRow from '@/components/mobile/ui/MobileListRow';

describe('MobileListRow', () => {
  it('renders title text', () => {
    render(<MobileListRow title="Appearance" />);
    expect(screen.getByText('Appearance')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<MobileListRow title="WiFi" subtitle="Connected to Devanshu's Network" />);
    expect(screen.getByText("Connected to Devanshu's Network")).toBeInTheDocument();
  });

  it('renders value text right-aligned', () => {
    render(<MobileListRow title="Storage" value="1.2 GB" />);
    expect(screen.getByText('1.2 GB')).toBeInTheDocument();
  });

  it('renders icon slot when provided', () => {
    render(
      <MobileListRow
        icon={<span data-testid="custom-icon">icon</span>}
        title="x"
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('is not interactive without onClick — renders as div, no role=button', () => {
    render(<MobileListRow title="Static" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders as a button when onClick is provided and fires it on click', async () => {
    const onClick = vi.fn();
    render(<MobileListRow title="Tap me" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /tap me/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('defaults to chevron accessory when onClick is set', () => {
    render(<MobileListRow title="x" onClick={() => {}} />);
    // ChevronRight from lucide renders an <svg>
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  it('accessory="none" hides the chevron even when tappable', () => {
    render(<MobileListRow title="x" onClick={() => {}} accessory="none" />);
    expect(screen.getByRole('button').querySelector('svg')).not.toBeInTheDocument();
  });

  it('accessory="switch" renders a switch and toggles independently of the row', async () => {
    const onSwitchToggle = vi.fn();
    const onClick = vi.fn();
    render(
      <MobileListRow
        title="Dark mode"
        accessory="switch"
        switchOn={false}
        onSwitchToggle={onSwitchToggle}
        onClick={onClick}
      />
    );
    // The row should not be a <button> when accessory is switch
    // (we don't want one tap toggling both)
    expect(screen.queryByRole('button', { name: /dark mode/i })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('switch'));
    expect(onSwitchToggle).toHaveBeenCalledWith(true);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('accessory="check" renders a check icon', () => {
    render(<MobileListRow title="Selected" accessory="check" />);
    // Check icon from lucide
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('accessory ReactNode passes through', () => {
    render(
      <MobileListRow
        title="x"
        accessory={<span data-testid="custom-accessory">!</span>}
      />
    );
    expect(screen.getByTestId('custom-accessory')).toBeInTheDocument();
  });

  it('remains a button when disabled (preserves a11y) but does not fire onClick', async () => {
    const onClick = vi.fn();
    render(<MobileListRow title="x" onClick={onClick} disabled />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('destructive applies red text', () => {
    render(<MobileListRow title="Delete" destructive />);
    expect(screen.getByText('Delete')).toHaveClass('text-red-500');
  });
});
