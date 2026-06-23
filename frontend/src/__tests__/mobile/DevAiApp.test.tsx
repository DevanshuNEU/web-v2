// @vitest-environment jsdom

import '../setup/dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import DevAiApp from '@/components/apps/DevAiApp';
import { useChatStore } from '@/store/chatStore';

/**
 * DevAiApp is the full-screen mobile chat surface that replaces the old
 * bottom sheet. It hosts the shared ChatPanel. These tests assert it mounts
 * the chat body (no logic duplication) in both variants.
 */

beforeEach(() => {
  useChatStore.getState().reset();
});

describe('DevAiApp', () => {
  it('mounts the ChatPanel chat body in the mobile variant', () => {
    render(<DevAiApp variant="mobile" />);
    // Empty-state copy proves ChatPanel mounted with no thread yet.
    expect(screen.getByText(/ask me anything about what i build/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/ask devanshu anything/i)).toBeInTheDocument();
  });

  it('also renders in the desktop variant', () => {
    render(<DevAiApp variant="desktop" />);
    expect(screen.getByPlaceholderText(/ask devanshu anything/i)).toBeInTheDocument();
  });
});
