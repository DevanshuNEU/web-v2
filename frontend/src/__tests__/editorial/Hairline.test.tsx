// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Hairline } from '@/components/editorial';

describe('Hairline', () => {
  it('renders a horizontal separator by default', () => {
    render(<Hairline />);
    const rule = screen.getByTestId('hairline');
    expect(rule).toHaveClass('hairline');
    expect(rule).toHaveAttribute('data-orientation', 'horizontal');
    expect(rule).toHaveAttribute('role', 'separator');
    expect(rule).toHaveAttribute('aria-orientation', 'horizontal');
  });

  it('renders a vertical rule when orientation=vertical', () => {
    render(<Hairline orientation="vertical" />);
    const rule = screen.getByTestId('hairline');
    expect(rule).toHaveAttribute('data-orientation', 'vertical');
    expect(rule).toHaveAttribute('aria-orientation', 'vertical');
    // Vertical rule uses a left border instead of the .hairline top border.
    expect(rule.getAttribute('style') || '').toContain('border-left');
  });

  it('applies inset as a left margin when horizontal', () => {
    render(<Hairline inset={56} />);
    expect(screen.getByTestId('hairline')).toHaveStyle({ 'margin-left': '56px' });
  });

  it('merges a custom className', () => {
    render(<Hairline className="custom-x" />);
    expect(screen.getByTestId('hairline')).toHaveClass('custom-x');
  });
});
