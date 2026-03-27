import { create } from 'zustand';

export interface Notification {
  id: string;
  title: string;
  body: string;
  dismissAfter?: number; // ms, default 5000
  createdAt: number;
}

interface NotificationStore {
  notifications: Notification[];
  dismissed: Set<string>;
  push: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

let counter = 0;

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  dismissed: new Set(),

  push: (notification) => {
    const id = `notif-${++counter}`;
    const entry: Notification = {
      ...notification,
      id,
      createdAt: Date.now(),
      dismissAfter: notification.dismissAfter ?? 5000,
    };

    set((state) => ({
      notifications: [...state.notifications, entry],
    }));

    // Auto-dismiss
    if (entry.dismissAfter && entry.dismissAfter > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, entry.dismissAfter);
    }
  },

  dismiss: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clear: () => set({ notifications: [] }),
}));
