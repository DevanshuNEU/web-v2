'use client';

/**
 * AssistantSheet — the mobile assistant launcher FAB.
 *
 * A monochrome FAB pinned to the bottom-right, offset above the sticky dock so
 * it never collides with it. Tapping calls openAssistant(), which on mobile
 * routes to the dedicated full-screen DevAI chat app (opened through the mobile
 * AppView; that view owns its own Done/close affordance). This component no
 * longer hosts a bottom sheet — it is purely the launcher. Hidden while the
 * phone is locked.
 *
 * Strictly neutral tokens (no accent).
 */

import { MessageSquare } from 'lucide-react';
import { useMobileStore } from '@/store/mobileStore';
import { useAssistantUiStore } from '@/store/assistantUiStore';
import { isImmersiveApp } from '@/lib/mobileAppRegistry';

// The dock (icon 54 + py-3 + mb-3) is ~96px tall above the safe area; the FAB
// floats 16px above that so a thumb never lands on both.
const DOCK_CLEARANCE = 96;

export default function AssistantSheet() {
  const locked = useMobileStore((s) => s.locked);
  const spotlightOpen = useMobileStore((s) => s.spotlightOpen);
  const openAppType = useMobileStore((s) => s.openAppType);
  const open = useAssistantUiStore((s) => s.open);
  const openAssistant = useAssistantUiStore((s) => s.openAssistant);

  if (locked) return null;

  return (
    <>
      {/* FAB — hidden while the spotlight is open, while an immersive app
          (Games / Terminal / Files) owns the screen so it never sits over the
          app's own controls, and while the DevAI chat itself is open (tapping
          it again would be a no-op). Still floats on home + reading apps. */}
      {!open && !spotlightOpen && !isImmersiveApp(openAppType) && openAppType !== 'dev-ai' && (
        <button
          type="button"
          onClick={() => openAssistant()}
          aria-label="Ask Devanshu"
          className="fixed z-[60] grid place-items-center w-14 h-14 rounded-full
                     border border-border bg-text text-bg shadow-xl active:scale-95 transition-transform"
          style={{
            right: 16,
            bottom: `calc(env(safe-area-inset-bottom) + ${DOCK_CLEARANCE}px + 16px)`,
          }}
        >
          <MessageSquare size={22} strokeWidth={2} />
        </button>
      )}
    </>
  );
}
