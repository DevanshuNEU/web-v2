// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EditorialSection } from '@/components/editorial';

describe('EditorialSection', () => {
  it('renders the number, eyebrow, and serif title', () => {
    render(
      <EditorialSection number="01" eyebrow="About" title="The work">
        body
      </EditorialSection>,
    );
    expect(screen.getByTestId('editorial-section-number')).toHaveTextContent('01');
    expect(screen.getByTestId('editorial-section')).toHaveTextContent('About');

    const title = screen.getByTestId('editorial-section-title');
    expect(title).toHaveTextContent('The work');
    expect(title).toHaveClass('editorial-head');
    // Serif face must never be faux-bolded.
    expect(title).not.toHaveClass('font-bold');
  });

  it('renders the hairline rule by default and hides it when rule=false', () => {
    const { rerender } = render(<EditorialSection title="A" />);
    expect(screen.getByTestId('hairline')).toBeInTheDocument();

    rerender(<EditorialSection title="A" rule={false} />);
    expect(screen.queryByTestId('hairline')).not.toBeInTheDocument();
  });

  it('renders children and forwards id to the section element', () => {
    render(
      <EditorialSection id="about" title="A">
        <span data-testid="child">hi</span>
      </EditorialSection>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('editorial-section')).toHaveAttribute('id', 'about');
  });
});
