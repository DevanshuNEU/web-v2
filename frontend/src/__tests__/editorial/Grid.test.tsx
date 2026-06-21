// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Grid } from '@/components/editorial';

describe('Grid', () => {
  it('renders children and applies the requested column count', () => {
    render(
      <Grid cols={3}>
        <div data-testid="cell-a" />
        <div data-testid="cell-b" />
      </Grid>,
    );
    const grid = screen.getByTestId('editorial-grid');
    expect(grid).toHaveClass('grid', 'grid-cols-3');
    expect(grid).toHaveAttribute('data-cols', '3');
    expect(screen.getByTestId('cell-a')).toBeInTheDocument();
    expect(screen.getByTestId('cell-b')).toBeInTheDocument();
  });

  it('applies the rhythm gap by default', () => {
    render(<Grid cols={2} />);
    expect(screen.getByTestId('editorial-grid')).toHaveClass('gap-6');
  });

  it('adds divider classes only when divided is set', () => {
    const { rerender } = render(<Grid cols={2} />);
    expect(screen.getByTestId('editorial-grid').className).not.toContain('border-l');

    rerender(<Grid cols={2} divided />);
    expect(screen.getByTestId('editorial-grid').className).toContain('border-l');
  });
});
