'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNotificationStore, type Notification } from '@/store/notificationStore';
import { notifications as notifCopy } from '@/data/copy';
import { playSound } from '@/hooks/useSoundEffects';
import { Z } from '@/lib/zLayers';

/** Shell toasts stay up long enough to read, and pause while hovered or focused. */
const SHELL_TOAST_MS = 8000;

/** Ids of toasts this component pushed and times itself (with pause). */
const managedIds = new Set<string>();

function pushManaged(title: string, body: string) {
  const store = useNotificationStore.getState();
  store.push({ title, body, dismissAfter: 0 });
  const added = useNotificationStore.getState().notifications.at(-1);
  if (added) managedIds.add(added.id);
}

function Toast({ notif }: { notif: Notification }) {
  const dismiss = useNotificationStore(state => state.dismiss);
  const managed = managedIds.has(notif.id);
  const onDismiss = useCallback(() => {
    managedIds.delete(notif.id);
    dismiss(notif.id);
  }, [dismiss, notif.id]);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(SHELL_TOAST_MS);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!managed || paused) return;
    startedAt.current = Date.now();
    const t = setTimeout(onDismiss, remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current = Math.max(1000, remaining.current - (Date.now() - startedAt.current));
    };
  }, [managed, paused, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="glass-medium bg-surface/90 backdrop-blur-xl border border-border
                 rounded-xl shadow-lg p-4 pr-10 relative cursor-default"
    >
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="absolute top-3 right-3 text-text-secondary hover:text-text
                   transition-colors p-0.5 rounded-md hover:bg-text/10"
      >
        <X size={14} aria-hidden />
      </button>
      <p className="text-sm font-semibold text-text mb-1">{notif.title}</p>
      <p className="text-[13px] text-text-secondary leading-relaxed">{notif.body}</p>
    </motion.div>
  );
}

export default function NotificationCenter() {
  const notifications = useNotificationStore(state => state.notifications);
  const hasShownWelcome = useRef(false);
  const hasShownIdleNudge = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Brief welcome notification on first load. The guard flips inside the
  // timeout so React StrictMode's mount, unmount, mount still shows it once.
  useEffect(() => {
    if (hasShownWelcome.current) return;
    const timer = setTimeout(() => {
      if (hasShownWelcome.current) return;
      hasShownWelcome.current = true;
      playSound('notify');
      pushManaged(notifCopy.welcome.title, notifCopy.welcome.body);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Idle nudge: fires after 30s of no mouse/keyboard activity
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hasShownIdleNudge.current) return;

      idleTimerRef.current = setTimeout(() => {
        if (hasShownIdleNudge.current) return;
        hasShownIdleNudge.current = true;
        playSound('notify');
        pushManaged(notifCopy.idleNudge.title, notifCopy.idleNudge.body);
      }, 30_000);
    };

    resetIdle(); // start on mount
    window.addEventListener('mousemove', resetIdle, { passive: true });
    window.addEventListener('keydown', resetIdle, { passive: true });
    window.addEventListener('click', resetIdle, { passive: true });

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      window.removeEventListener('click', resetIdle);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-9 right-4 flex flex-col gap-3 w-[min(24rem,calc(100vw-2rem))]"
      style={{ zIndex: Z.notifications }}
    >
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <Toast key={notif.id} notif={notif} />
        ))}
      </AnimatePresence>
    </div>
  );
}
