// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileSwitch from '@/components/mobile/ui/MobileSwitch';

describe('MobileSwitch', () => {
  it('uses role="switch" with aria-checked reflecting state', () => {
    const { rerender } = render(<MobileSwitch on={false} />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
    rerender(<MobileSwitch on />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with the inverted value on click', async () => {
    const onChange = vi.fn();
    render(<MobileSwitch on={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('inverts again when clicked from on', async () => {
    const onChange = vi.fn();
    render(<MobileSwitch on onChange={onChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('does not fire when disabled', async () => {
    const onChange = vi.fn();
    render(<MobileSwitch on={false} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('toggles via keyboard Space', async () => {
    const onChange = vi.fn();
    render(<MobileSwitch on={false} onChange={onChange} />);
    screen.getByRole('switch').focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('exposes the label as an aria-label', () => {
    render(<MobileSwitch on={false} label="Dark mode" />);
    expect(screen.getByRole('switch', { name: 'Dark mode' })).toBeInTheDocument();
  });
});
