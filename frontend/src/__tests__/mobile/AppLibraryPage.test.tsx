// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import AppLibraryPage from '@/components/mobile/AppLibraryPage';
import { useMobileStore } from '@/store/mobileStore';

/**
 * The App Library is the consolidated search + all-apps surface (replaces the
 * old search pill + bottom sheet). Empty → flat grid of every app; typing →
 * inline Spotlight results.
 */

beforeEach(() => {
  useMobileStore.setState({ openApps: [], openAppType: null, locked: false });
});

describe('AppLibraryPage', () => {
  it('shows the all-apps grid (with search field) when the query is empty', () => {
    render(<AppLibraryPage />);
    expect(screen.getByLabelText('Search apps')).toBeInTheDocument();
    // Representative apps from the flat grid — including the new DevAI app.
    expect(screen.getByText('About Me')).toBeInTheDocument();
    expect(screen.getByText('DevAI')).toBeInTheDocument();
  });

  it('shows inline Spotlight results (with an Ask row) when typing', async () => {
    render(<AppLibraryPage />);
    await userEvent.type(screen.getByLabelText('Search apps'), 'terminal');
    expect(screen.getByText('Ask Devanshu')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
  });

  it('opens an app when its grid icon is tapped', async () => {
    render(<AppLibraryPage />);
    await userEvent.click(screen.getByText('About Me'));
    expect(useMobileStore.getState().openAppType).toBe('about-me');
  });
});
