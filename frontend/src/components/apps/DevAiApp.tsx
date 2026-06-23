'use client';

/**
 * DevAiApp — the dedicated "DevAI" chat surface.
 *
 * A thin host around the shared ChatPanel, which carries all of the chat logic.
 * Primarily a mobile-only surface (opened through the mobile AppView, which owns
 * the Done/close affordance), but the component is variant-agnostic and renders
 * the panel at full height either way. No onClose is passed — the host chrome
 * owns closing. Strictly monochrome / token-based, inherited from ChatPanel.
 */

import ChatPanel from '@/components/chat/ChatPanel';

export default function DevAiApp(
  { variant }: { variant?: 'desktop' | 'mobile' } = {},
) {
  void variant;
  // Full-bleed on phones; a readable max measure that centres on wide screens
  // (foldables / tablet landscape) so the thread never sprawls past a
  // comfortable line length. mx-auto is a no-op below the cap.
  return (
    <div className="h-full mx-auto w-full max-w-[640px]">
      <ChatPanel showHeader autoFocusComposer={false} />
    </div>
  );
}
