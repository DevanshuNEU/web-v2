// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileSegmented from '@/components/mobile/ui/MobileSegmented';

const OPTIONS = [
  { value: 'story', label: 'Story' },
  { value: 'tech', label: 'Tech' },
  { value: 'impact', label: 'Impact' },
] as const;

describe('MobileSegmented', () => {
  it('renders every option', () => {
    render(<MobileSegmented options={[...OPTIONS]} value="story" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Story' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tech' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Impact' })).toBeInTheDocument();
  });

  it('marks the active segment via aria-pressed', () => {
    render(<MobileSegmented options={[...OPTIONS]} value="tech" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Story' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Tech' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Impact' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onChange with the segment value when clicked', async () => {
    const onChange = vi.fn();
    render(<MobileSegmented options={[...OPTIONS]} value="story" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Impact' }));
    expect(onChange).toHaveBeenCalledWith('impact');
  });

  it('clicking the already-active segment still fires onChange (parent decides)', async () => {
    const onChange = vi.fn();
    render(<MobileSegmented options={[...OPTIONS]} value="story" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Story' }));
    expect(onChange).toHaveBeenCalledWith('story');
  });

  it('activates via keyboard Enter and Space', async () => {
    const onChange = vi.fn();
    render(<MobileSegmented options={[...OPTIONS]} value="story" onChange={onChange} />);
    screen.getByRole('button', { name: 'Tech' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onChange).toHaveBeenCalledWith('tech');

    onChange.mockClear();
    screen.getByRole('button', { name: 'Impact' }).focus();
    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalledWith('impact');
  });

  it('positions the thumb at index 0 when the first option is selected', () => {
    render(<MobileSegmented options={[...OPTIONS]} value="story" onChange={() => {}} />);
    const thumb = screen.getByTestId('segmented-thumb');
    expect(thumb.style.transform).toBe('translateX(calc(0 * 100%))');
  });

  it('positions the thumb at the correct index for a later option', () => {
    render(<MobileSegmented options={[...OPTIONS]} value="impact" onChange={() => {}} />);
    const thumb = screen.getByTestId('segmented-thumb');
    expect(thumb.style.transform).toBe('translateX(calc(2 * 100%))');
  });

  it('falls back to index 0 when the value does not match any option', () => {
    render(
      <MobileSegmented
        options={[...OPTIONS]}
        value={'nonexistent' as 'story'}
        onChange={() => {}}
      />
    );
    const thumb = screen.getByTestId('segmented-thumb');
    expect(thumb.style.transform).toBe('translateX(calc(0 * 100%))');
  });

  it('thumb width scales with the number of options', () => {
    render(
      <MobileSegmented
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
        value="a"
        onChange={() => {}}
      />
    );
    // JSDom normalizes calc() algebraically, so the literal string varies
    // ("calc((100% - 4px) / 2)" → "calc(0.5 * (100% - 4px))"). Just verify
    // the divisor: 2 options ⇒ a 0.5x or "/ 2" factor must appear.
    const width = screen.getByTestId('segmented-thumb').style.width;
    expect(width).toMatch(/0\.5|\/\s*2/);
    expect(width).toContain('4px');
  });

  it('fullWidth adds the w-full class', () => {
    const { container } = render(
      <MobileSegmented options={[...OPTIONS]} value="story" onChange={() => {}} fullWidth />
    );
    expect(container.firstChild).toHaveClass('w-full');
  });

  it('label is exposed on the wrapping group', () => {
    render(
      <MobileSegmented
        options={[...OPTIONS]}
        value="story"
        onChange={() => {}}
        label="View mode"
      />
    );
    expect(screen.getByRole('group', { name: 'View mode' })).toBeInTheDocument();
  });

  it('ariaLabel on an option provides an accessible name for icon-only segments', () => {
    render(
      <MobileSegmented
        options={[
          { value: 'grid', label: <span aria-hidden>▦</span>, ariaLabel: 'Grid view' },
          { value: 'list', label: <span aria-hidden>≡</span>, ariaLabel: 'List view' },
        ]}
        value="grid"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: 'Grid view' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'List view' })).toBeInTheDocument();
  });
});
