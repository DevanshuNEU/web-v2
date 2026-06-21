// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetaLabel } from '@/components/editorial';

describe('MetaLabel', () => {
  it('renders children and applies the font-mono-meta class', () => {
    render(<MetaLabel>Selected work</MetaLabel>);
    const label = screen.getByTestId('meta-label');
    expect(label).toHaveTextContent('Selected work');
    expect(label).toHaveClass('font-mono-meta');
  });

  it('renders as the requested element', () => {
    render(<MetaLabel as="p">Caption</MetaLabel>);
    expect(screen.getByTestId('meta-label').tagName).toBe('P');
  });

  it('renders a leading glyph when provided', () => {
    render(<MetaLabel glyph={<i data-testid="glyph">x</i>}>Label</MetaLabel>);
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
    expect(screen.getByTestId('meta-label')).toHaveTextContent('Label');
  });

  it('merges a custom className', () => {
    render(<MetaLabel className="custom-y">Label</MetaLabel>);
    expect(screen.getByTestId('meta-label')).toHaveClass('custom-y');
  });
});
