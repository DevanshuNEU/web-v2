'use client';

/**
 * AssistantSheet: the mobile assistant launcher on the home screen.
 *
 * A labeled "Ask AI" pill pinned bottom-right, just above the dock. Tapping
 * calls openAssistant(), which on mobile opens the full-screen DevAI chat app.
 *
 * It only shows on the home pages. Inside an app there is no dock, and a
 * floating button there covered body text, links and form fields, so apps get
 * an Ask button in their nav bar instead (AppView). It also hides on the App
 * Library page, whose search field already offers "Ask", and while locked.
 *
 * Strictly neutral tokens (no accent).
 */

import { MessageSquare } from 'lucide-react';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { HOME_PAGES } from '@/lib/mobileAppRegistry';

// Dock height above the safe area: icon 54 + label gap 6 + label 15
// + padding 18 + bottom margin 12 = about 105px. The pill floats 12px above it.
const DOCK_CLEARANCE = 105;

export default function AssistantSheet() {
  const locked = useMobileStore((s) => s.locked);
  const spotlightOpen = useMobileStore((s) => s.spotlightOpen);
  const openAppType = useMobileStore((s) => s.openAppType);
  const currentPage = useMobileStore((s) => s.currentPage);
  const open = useAssistantUiStore((s) => s.open);
  const openAssistant = useAssistantUiStore((s) => s.openAssistant);

  const onLibrary = currentPage >= HOME_PAGES.length;
  if (locked || open || spotlightOpen || openAppType !== null || onLibrary) return null;

  return (
    <button
      type="button"
      onClick={() => openAssistant()}
      aria-label="Ask AI about Devanshu"
      className="fixed z-[60] flex h-11 items-center gap-2 rounded-full border border-border
                 bg-surface/85 px-4 text-[15px] font-medium text-text shadow-lg backdrop-blur
                 active:scale-95 transition-transform"
      style={{
        right: 16,
        bottom: `calc(env(safe-area-inset-bottom) + ${DOCK_CLEARANCE}px + 12px)`,
      }}
    >
      <MessageSquare size={18} strokeWidth={2} aria-hidden />
      Ask AI
    </button>
  );
}
