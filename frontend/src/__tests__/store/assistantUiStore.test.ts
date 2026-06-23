// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useChatStore } from '@/store/chatStore';
import { useMobileStore } from '@/store/mobileStore';

function setWidth(px: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: px });
}

beforeEach(() => {
  useChatStore.getState().reset();
  useAssistantUiStore.setState({ open: false });
  useMobileStore.setState({ openApps: [], openAppType: null, locked: false });
  // Desktop width by default so the orb path is exercised unless a test opts into mobile.
  setWidth(1280);
});

afterEach(() => {
  setWidth(1024);
});

describe('assistantUiStore — desktop (orb) routing', () => {
  it('openAssistant(seed) seeds chatStore and opens the orb', () => {
    useAssistantUiStore.getState().openAssistant('What do you build?');
    expect(useChatStore.getState().seed).toBe('What do you build?');
    expect(useAssistantUiStore.getState().open).toBe(true);
    expect(useMobileStore.getState().openAppType).toBeNull();
  });

  it('openAssistant() with no seed leaves the seed null', () => {
    useAssistantUiStore.getState().openAssistant();
    expect(useChatStore.getState().seed).toBeNull();
    expect(useAssistantUiStore.getState().open).toBe(true);
  });

  it('closeAssistant closes without clearing the conversation', () => {
    useChatStore.getState().addUser('keep me');
    useAssistantUiStore.getState().openAssistant();
    expect(useAssistantUiStore.getState().open).toBe(true);

    useAssistantUiStore.getState().closeAssistant();
    expect(useAssistantUiStore.getState().open).toBe(false);
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0]).toMatchObject({ role: 'user', content: 'keep me' });
  });
});

describe('assistantUiStore — mobile routing (opens the DevAI app)', () => {
  it('openAssistant(seed) seeds chatStore and opens the dev-ai app, not the orb', () => {
    setWidth(390);
    useAssistantUiStore.getState().openAssistant('How is your RAG different?');
    expect(useChatStore.getState().seed).toBe('How is your RAG different?');
    expect(useMobileStore.getState().openAppType).toBe('dev-ai');
    // The desktop orb surface stays closed on mobile.
    expect(useAssistantUiStore.getState().open).toBe(false);
  });

  it('openAssistant() with no seed still opens the dev-ai app', () => {
    setWidth(390);
    useAssistantUiStore.getState().openAssistant();
    expect(useChatStore.getState().seed).toBeNull();
    expect(useMobileStore.getState().openAppType).toBe('dev-ai');
  });
});
