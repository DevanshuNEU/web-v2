import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from '@/store/chatStore';

beforeEach(() => {
  useChatStore.getState().reset();
});

describe('chatStore', () => {
  it('starts empty and idle', () => {
    const s = useChatStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.status).toBe('idle');
    expect(s.seed).toBeNull();
  });

  it('addUser appends a user turn', () => {
    useChatStore.getState().addUser('hello');
    expect(useChatStore.getState().messages).toEqual([{ role: 'user', content: 'hello' }]);
  });

  it('startAssistant pushes an empty assistant turn and flips to streaming', () => {
    const st = useChatStore.getState();
    st.addUser('hi');
    st.startAssistant();
    const s = useChatStore.getState();
    expect(s.status).toBe('streaming');
    expect(s.messages.at(-1)).toEqual({ role: 'assistant', content: '' });
  });

  it('appendAssistant accumulates deltas into the last assistant turn', () => {
    const st = useChatStore.getState();
    st.addUser('hi');
    st.startAssistant();
    st.appendAssistant('I build ');
    st.appendAssistant('MCP tools.');
    expect(useChatStore.getState().messages.at(-1)?.content).toBe('I build MCP tools.');
  });

  it('dropLastAssistant removes a trailing assistant turn', () => {
    const st = useChatStore.getState();
    st.addUser('hi');
    st.startAssistant();
    st.dropLastAssistant();
    expect(useChatStore.getState().messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('dropLastAssistant is a no-op when the last turn is from the user', () => {
    useChatStore.getState().addUser('hi');
    useChatStore.getState().dropLastAssistant();
    expect(useChatStore.getState().messages).toEqual([{ role: 'user', content: 'hi' }]);
  });

  it('setSeed stores a handed-off question; reset clears everything', () => {
    const st = useChatStore.getState();
    st.setSeed('what do you build?');
    expect(useChatStore.getState().seed).toBe('what do you build?');
    st.addUser('x');
    st.setStatus('thinking');
    st.reset();
    const s = useChatStore.getState();
    expect(s.messages).toEqual([]);
    expect(s.seed).toBeNull();
    expect(s.status).toBe('idle');
  });
});
