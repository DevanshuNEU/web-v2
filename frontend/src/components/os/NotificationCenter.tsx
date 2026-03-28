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

  return (
    <div className="fixed top-4 right-4 z-[900] flex flex-col gap-3 max-w-sm">
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
