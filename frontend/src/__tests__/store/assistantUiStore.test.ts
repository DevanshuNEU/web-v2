import { describe, it, expect, beforeEach } from 'vitest';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { useChatStore } from '@/store/chatStore';

beforeEach(() => {
  useChatStore.getState().reset();
  useAssistantUiStore.setState({ open: false });
});

describe('assistantUiStore', () => {
  it('openAssistant(seed) seeds chatStore and opens', () => {
    useAssistantUiStore.getState().openAssistant('What do you build?');
    expect(useChatStore.getState().seed).toBe('What do you build?');
    expect(useAssistantUiStore.getState().open).toBe(true);
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
    // The thread survives a close.
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(useChatStore.getState().messages[0]).toMatchObject({ role: 'user', content: 'keep me' });
  });
});
