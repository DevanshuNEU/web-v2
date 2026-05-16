// @vitest-environment jsdom

import '../../setup/dom';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MobileBottomSheet from '@/components/mobile/ui/MobileBottomSheet';

/**
 * Drag-physics tests live in /mobile-preview (need a real browser to
 * simulate pointer velocity). These tests cover behaviour we can
 * exercise in JSDom: render gating, dismiss paths, title rendering,
 * handle visibility, and the dismissible=false escape hatches.
 */

describe('MobileBottomSheet', () => {
  it('does not render any sheet content when open=false', () => {
    render(
      <MobileBottomSheet open={false} onClose={() => {}} title="Hello">
        <p>body</p>
      </MobileBottomSheet>
    );
    expect(screen.queryByTestId('sheet-content')).not.toBeInTheDocument();
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });

  it('renders content into a portal when open=true', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="Hello">
        <p>body content</p>
      </MobileBottomSheet>
    );
    expect(screen.getByTestId('sheet-content')).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('exposes a dialog role for screen readers', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="Filters">
        <p>x</p>
      </MobileBottomSheet>
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('renders the title visibly by default', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="Share">
        <p>x</p>
      </MobileBottomSheet>
    );
    const title = screen.getByText('Share');
    expect(title).toBeInTheDocument();
    expect(title).not.toHaveClass('sr-only');
  });

  it('visually hides the title when hideTitle is true (still in a11y tree)', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="Hidden title" hideTitle>
        <p>x</p>
      </MobileBottomSheet>
    );
    const title = screen.getByText('Hidden title');
    expect(title).toHaveClass('sr-only');
    // Still announced
    expect(screen.getByRole('dialog', { name: 'Hidden title' })).toBeInTheDocument();
  });

  it('renders the drag handle by default', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="x">
        <p>y</p>
      </MobileBottomSheet>
    );
    expect(screen.getByTestId('sheet-handle')).toBeInTheDocument();
  });

  it('hides the drag handle when hideHandle=true', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="x" hideHandle>
        <p>y</p>
      </MobileBottomSheet>
    );
    expect(screen.queryByTestId('sheet-handle')).not.toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet open onClose={onClose} title="x">
        <p>y</p>
      </MobileBottomSheet>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('does NOT call onClose on Escape when dismissible=false', async () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet open onClose={onClose} title="x" dismissible={false}>
        <p>y</p>
      </MobileBottomSheet>
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  // NB: We don't unit-test that the sheet visually slides off after `open`
  // flips false. That assertion exercises AnimatePresence + Framer Motion's
  // exit physics, which depend on rAF — JSDom's rAF isn't reliable enough
  // to drive the unmount within a sensible timeout. The render-on-open and
  // unmount-on-open-false paths are covered by the first two tests, which
  // verify presence and absence of DOM nodes without timing dependencies.

  it('children render arbitrary content', () => {
    render(
      <MobileBottomSheet open onClose={() => {}} title="x">
        <button>tappable</button>
        <input placeholder="type here" />
      </MobileBottomSheet>
    );
    expect(screen.getByRole('button', { name: 'tappable' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('type here')).toBeInTheDocument();
  });
});
