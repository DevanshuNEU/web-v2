'use client';

/**
 * DevAiApp - the dedicated "DevAI" chat surface.
 *
 * A thin host around the shared ChatPanel, which carries all of the chat logic
 * (it is also the body of the desktop chat orb). Mostly a phone surface,
 * opened through the mobile AppView, which owns Done / close. On desktop it can
 * open as a window (a restored session); Terminal's `open devai` and the orb
 * route to the same panel. No onClose is passed: the host chrome owns closing.
 *
 * The host paints the panel's own surface edge to edge, so a wide window reads
 * as one surface instead of a column floating in black bands. The thread keeps
 * a readable measure inside a centred 48rem column.
 */

import ChatPanel from '@/components/chat/ChatPanel';

export default function DevAiApp(
  { variant }: { variant?: 'desktop' | 'mobile' } = {},
) {
  return (
    <div className="h-full w-full bg-surface">
      <div className="mx-auto h-full w-full max-w-[48rem]">
        <ChatPanel showHeader autoFocusComposer={false} variant={variant} />
      </div>
    </div>
  );
}
