// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/components/mobile/PhoneShell', () => ({ default: () => <div>phone shell</div> }));

import DesktopHome from '@/components/os/DesktopHome';

function viewport(width: number, height: number, coarse: boolean) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.matchMedia = vi.fn((q: string) => ({
    matches: q === '(pointer: coarse)' ? coarse : false,
    media: q, onchange: null,
    addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

describe('DesktopHome on a phone that rotates', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the phone shell when the phone turns sideways', () => {
    viewport(390, 844, true);
    render(<DesktopHome />);
    expect(screen.getByText('phone shell')).toBeInTheDocument();
    viewport(844, 390, true);
    act(() => { window.dispatchEvent(new Event('orientationchange')); window.dispatchEvent(new Event('resize')); });
    expect(screen.getByText('phone shell')).toBeInTheDocument();
  });

  it('still gives a narrow desktop window the phone shell', () => {
    viewport(700, 900, false);
    render(<DesktopHome />);
    expect(screen.getByText('phone shell')).toBeInTheDocument();
  });
});
