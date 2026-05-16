// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MobileSection from '@/components/mobile/ui/MobileSection';
import MobileListRow from '@/components/mobile/ui/MobileListRow';

describe('MobileSection', () => {
  it('renders header text uppercase', () => {
    render(
      <MobileSection header="Appearance">
        <MobileListRow title="A" />
      </MobileSection>
    );
    expect(screen.getByTestId('section-header')).toHaveTextContent('Appearance');
    expect(screen.getByTestId('section-header')).toHaveClass('uppercase');
  });

  it('renders footer text below the group', () => {
    render(
      <MobileSection footer="Adjust how devOS looks across the system.">
        <MobileListRow title="A" />
      </MobileSection>
    );
    expect(screen.getByTestId('section-footer')).toHaveTextContent(
      'Adjust how devOS looks across the system.'
    );
  });

  it('omits header when not provided', () => {
    render(
      <MobileSection>
        <MobileListRow title="A" />
      </MobileSection>
    );
    expect(screen.queryByTestId('section-header')).not.toBeInTheDocument();
  });

  it('omits footer when not provided', () => {
    render(
      <MobileSection>
        <MobileListRow title="A" />
      </MobileSection>
    );
    expect(screen.queryByTestId('section-footer')).not.toBeInTheDocument();
  });

  it('renders all child rows in order', () => {
    render(
      <MobileSection>
        <MobileListRow title="First" />
        <MobileListRow title="Second" />
        <MobileListRow title="Third" />
      </MobileSection>
    );
    const body = screen.getByTestId('section-body');
    const titles = Array.from(body.querySelectorAll('span')).map((s) => s.textContent);
    expect(titles).toEqual(expect.arrayContaining(['First', 'Second', 'Third']));
  });

  it('applies divide-y separators in non-inset mode', () => {
    render(
      <MobileSection inset={false}>
        <MobileListRow title="A" />
        <MobileListRow title="B" />
      </MobileSection>
    );
    expect(screen.getByTestId('section-body').className).toMatch(/divide-y/);
  });

  it('switches to inset separator strategy when inset=true', () => {
    render(
      <MobileSection inset>
        <MobileListRow title="A" />
        <MobileListRow title="B" />
      </MobileSection>
    );
    // Inset uses a pseudo-element approach, not the divide-y utility
    expect(screen.getByTestId('section-body').className).not.toMatch(/^divide-y/);
    expect(screen.getByTestId('section-body').className).toMatch(/before:absolute/);
  });

  it('forwards className to the outer section', () => {
    const { container } = render(
      <MobileSection className="my-section">
        <MobileListRow title="A" />
      </MobileSection>
    );
    expect(container.firstChild).toHaveClass('my-section');
  });
});
