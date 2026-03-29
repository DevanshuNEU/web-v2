'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';
import { notifications as notifCopy } from '@/data/copy';
import { playSound } from '@/hooks/useSoundEffects';

export default function NotificationCenter() {
  const notifications = useNotificationStore(state => state.notifications);
  const push = useNotificationStore(state => state.push);
  const dismiss = useNotificationStore(state => state.dismiss);
  const hasShownWelcome = useRef(false);
  const hasShownIdleNudge = useRef(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Brief welcome notification on first load
  useEffect(() => {
    if (hasShownWelcome.current) return;
    hasShownWelcome.current = true;

    const timer = setTimeout(() => {
      playSound('notify');
      push({
        title: notifCopy.welcome.title,
        body: notifCopy.welcome.body,
        dismissAfter: 4000,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [push]);

  // Idle nudge — fires after 30s of no mouse/keyboard activity
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (hasShownIdleNudge.current) return;

      idleTimerRef.current = setTimeout(() => {
        if (hasShownIdleNudge.current) return;
        hasShownIdleNudge.current = true;
        playSound('notify');
        push({
          title: notifCopy.idleNudge.title,
          body: notifCopy.idleNudge.body,
          dismissAfter: 6000,
        });
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
  }, [push]);

  return (
    <div className="fixed top-9 right-4 z-[900] flex flex-col gap-3 max-w-sm">
      <AnimatePresence mode="popLayout">
        {notifications.map((notif) => (
          <motion.div
            key={notif.id}
            layout
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="glass-medium bg-surface/80 backdrop-blur-xl
                       border border-white/20 dark:border-white/10
                       rounded-xl shadow-lg p-4 pr-10 relative
                       cursor-default"
          >
            <button
              onClick={() => dismiss(notif.id)}
              className="absolute top-3 right-3 text-text-secondary/50 hover:text-text
                         transition-colors p-0.5 rounded-md hover:bg-surface/50"
            >
              <X size={14} />
            </button>
            <p className="text-sm font-semibold text-text mb-1">{notif.title}</p>
            <p className="text-xs text-text-secondary leading-relaxed">{notif.body}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
