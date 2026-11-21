// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useMobileStore } from '@/store/mobileStore';

// Stand-in apps so the test is about the shell's chrome, not app bodies.
vi.mock('@/lib/appRegistry', async (orig) => {
  const real = await orig<typeof import('@/lib/appRegistry')>();
  const Stub = ({ name }: { name: string }) => <p>{name} body</p>;
  const registry = new Proxy(real.appRegistry, {
    get(t, k: string) {
      const entry = t[k as keyof typeof t];
      return entry ? { ...entry, component: () => <Stub name={k} /> } : entry;
    },
  });
  return { ...real, appRegistry: registry };
});

import AppView from '@/components/mobile/AppView';

const store = () => useMobileStore.getState();

beforeEach(() => {
  useMobileStore.setState({ locked: false, openApps: [], openAppType: null, spotlightOpen: false, immersive: false });
});

describe('immersive flag (mobile store)', () => {
  it('is off by default and only turns on while an app is open', () => {
    expect(store().immersive).toBe(false);
    store().setImmersive(true);
    expect(store().immersive).toBe(false);
    store().openApp('games');
    store().setImmersive(true);
    expect(store().immersive).toBe(true);
    store().setImmersive(false);
    expect(store().immersive).toBe(false);
  });

  it('closing the app, switching apps, locking and system back all clear it', () => {
    const cases: (() => void)[] = [
      () => store().closeApp(),
      () => store().openApp('about-me'),
      () => store().lock(),
      () => store().closeAppFromPopstate(),
    ];
    for (const leave of cases) {
      useMobileStore.setState({ locked: false, openApps: [], openAppType: null, immersive: false });
      store().openApp('games');
      store().setImmersive(true);
      leave();
      expect(store().immersive).toBe(false);
    }
  });
});

describe('AppView chrome', () => {
  it('another app shows the bar with its title and Done', async () => {
    act(() => store().openApp('about-me'));
    render(<AppView />);
    expect(await screen.findByText('about-me body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('immersive hides the bar and keeps the app; dropping it brings the bar back', async () => {
    act(() => store().openApp('games'));
    render(<AppView />);
    await screen.findByText('games body');
    act(() => store().setImmersive(true));
    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('games body')).toBeInTheDocument();
    act(() => store().setImmersive(false));
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('leaving the game for another app restores the chrome', async () => {
    act(() => store().openApp('games'));
    render(<AppView />);
    await screen.findByText('games body');
    act(() => store().setImmersive(true));
    act(() => store().openApp('about-me'));
    expect(await screen.findByText('about-me body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });
});
