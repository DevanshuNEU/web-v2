// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IndexRow } from '@/components/editorial';

describe('IndexRow', () => {
  it('renders its number, title, and meta', () => {
    render(<IndexRow number="03" title="Open Code Intel" meta="2026" />);
    const row = screen.getByTestId('index-row');
    expect(row).toHaveTextContent('03');
    expect(row).toHaveTextContent('Open Code Intel');
    expect(row).toHaveTextContent('2026');
  });

  it('renders a hairline by default and drops it when hairline=false', () => {
    const { rerender } = render(<IndexRow number="01" title="A" />);
    expect(screen.getByTestId('hairline')).toBeInTheDocument();

    rerender(<IndexRow number="01" title="A" hairline={false} />);
    expect(screen.queryByTestId('hairline')).not.toBeInTheDocument();
  });

  it('is a non-interactive div when neither href nor onClick is set', () => {
    render(<IndexRow number="01" title="Static" />);
    expect(screen.getByTestId('index-row').tagName).toBe('DIV');
  });

  it('renders a keyboard-focusable button and fires onClick when interactive', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<IndexRow number="02" title="Clickable" onClick={onClick} />);

    const row = screen.getByTestId('index-row');
    expect(row.tagName).toBe('BUTTON');

    await user.tab();
    expect(row).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a focusable anchor when href is set', async () => {
    const user = userEvent.setup();
    render(<IndexRow number="04" title="Linked" href="#linked" />);

    const row = screen.getByTestId('index-row');
    expect(row.tagName).toBe('A');
    expect(row).toHaveAttribute('href', '#linked');

    await user.tab();
    expect(row).toHaveFocus();
  });

  it('marks the active row with aria-current', () => {
    render(<IndexRow number="05" title="Current" href="#x" active />);
    expect(screen.getByTestId('index-row')).toHaveAttribute('aria-current', 'true');
  });
});
