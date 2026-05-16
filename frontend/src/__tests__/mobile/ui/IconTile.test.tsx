// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IconTile from '@/components/mobile/ui/IconTile';

describe('IconTile', () => {
  it('renders the icon content', () => {
    render(<IconTile color="#007AFF" icon={<span data-testid="ico">★</span>} />);
    expect(screen.getByTestId('ico')).toBeInTheDocument();
  });

  it('applies the color as background', () => {
    render(<IconTile color="#ff00ff" icon="x" />);
    expect(screen.getByTestId('icon-tile')).toHaveStyle({
      background: 'rgb(255, 0, 255)',
    });
  });

  it('applies the iconColor as text color', () => {
    render(<IconTile color="#000" icon="x" iconColor="#abcdef" />);
    expect(screen.getByTestId('icon-tile')).toHaveStyle({
      color: 'rgb(171, 205, 239)',
    });
  });

  it('forwards className', () => {
    render(<IconTile color="#000" icon="x" className="custom" />);
    expect(screen.getByTestId('icon-tile')).toHaveClass('custom');
  });
});
