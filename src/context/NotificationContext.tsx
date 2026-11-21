import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  markAllAdminNotificationsRead,
  markAdminNotificationRead,
  subscribeAdminNotifications,
  subscribePublicNotifications,
} from '../services/notificationService';
import { AppNotification, ToastItem, ToastVariant } from '../types';
import { useAuth } from './AuthContext';

const READ_STORAGE_KEY = 'hermoney_read_notifications_v1';
const BROWSER_ALERTS_KEY = 'hermoney_browser_alerts_v1';
const BOOTSTRAP_ADMIN_EMAIL = 'rbousaid677@gmail.com';

interface NotificationContextValue {
  toasts: ToastItem[];
  showToast: (variant: ToastVariant, title: string, message?: string) => void;
  dismissToast: (id: string) => void;

  publicNotifications: AppNotification[];
  readPublicIds: Set<string>;
  unreadPublicCount: number;
  markPublicRead: (id: string) => void;
  markAllPublicRead: () => void;

  adminNotifications: AppNotification[];
  unreadAdminCount: number;
  markAdminRead: (id: string, read?: boolean) => Promise<void>;
  markAllAdminRead: () => Promise<void>;

  browserSupported: boolean;
  browserPermission: NotificationPermission | 'unsupported';
  browserAlertsEnabled: boolean;
  toggleBrowserAlerts: () => Promise<void>;

  popupOpen: boolean;
  openNotificationPopup: () => void;
  closeNotificationPopup: () => void;
  toggleNotificationPopup: () => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

function loadReadIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((item): item is string => typeof item === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>): void {
  try {
    window.localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids).slice(-200)));
  } catch {
    // Ignore storage quota errors
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAuth();

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [publicNotifications, setPublicNotifications] = useState<AppNotification[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AppNotification[]>([]);
  const [readPublicIds, setReadPublicIds] = useState<Set<string>>(() => loadReadIds());
  const [popupOpen, setPopupOpen] = useState(false);

  const openNotificationPopup = useCallback(() => setPopupOpen(true), []);
  const closeNotificationPopup = useCallback(() => setPopupOpen(false), []);
  const toggleNotificationPopup = useCallback(() => setPopupOpen((prev) => !prev), []);

  const browserSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    browserSupported ? window.Notification.permission : 'unsupported'
  );
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState<boolean>(() => {
    if (!browserSupported || window.Notification.permission !== 'granted') return false;
    try {
      return window.localStorage.getItem(BROWSER_ALERTS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const publicLoadedRef = useRef(false);
  const knownPublicIdsRef = useRef<Set<string>>(new Set());
  const contactLoadedRef = useRef(false);
  const knownContactIdsRef = useRef<Set<string>>(new Set());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, variant, title, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5200);
    },
    []
  );

  const sendBrowserNotification = useCallback(
    (title: string, body: string) => {
      if (!browserSupported || !browserAlertsEnabled) return;
      if (window.Notification.permission !== 'granted') return;
      try {
        new window.Notification(title, {
          body,
          icon: '/favicon.ico',
        });
      } catch {
        // Ignore browser notification restrictions inside iframes
      }
    },
    [browserAlertsEnabled, browserSupported]
  );

  // Real-time Firestore subscription for public reader notifications
  useEffect(() => {
    publicLoadedRef.current = false;
    knownPublicIdsRef.current = new Set();

    const unsubscribe = subscribePublicNotifications(
      (items) => {
        setPublicNotifications(items);

        if (!publicLoadedRef.current) {
          items.forEach((n) => knownPublicIdsRef.current.add(n.id));
          publicLoadedRef.current = true;
          return;
        }

        items.forEach((item) => {
          if (!knownPublicIdsRef.current.has(item.id)) {
            knownPublicIdsRef.current.add(item.id);
            showToast('info', item.title, item.message);
            sendBrowserNotification(item.title, item.message);
          }
        });
      },
      (err) => {
        console.error('Public notifications listener error:', err);
      }
    );

    return () => unsubscribe();
  }, [sendBrowserNotification, showToast]);

  // Real-time Firestore subscription for admin notifications & new reader contact messages
  useEffect(() => {
    if (!isAdmin || !user) {
      setAdminNotifications([]);
      contactLoadedRef.current = false;
      knownContactIdsRef.current = new Set();
      return;
    }

    const isBootstrap = user.email === BOOTSTRAP_ADMIN_EMAIL;
    const unsubAdmin = subscribeAdminNotifications(
      user.uid,
      isBootstrap,
      (items) => {
        setAdminNotifications(items);
      },
      (err) => {
        console.error('Admin notifications listener error:', err);
      }
    );

    let unsubContacts: (() => void) | undefined;
    if (isBootstrap) {
      contactLoadedRef.current = false;
      knownContactIdsRef.current = new Set();
      unsubContacts = onSnapshot(
        collection(db, 'contactMessages'),
        (snapshot) => {
          if (!contactLoadedRef.current) {
            snapshot.docs.forEach((d) => knownContactIdsRef.current.add(d.id));
            contactLoadedRef.current = true;
            return;
          }

          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' && !knownContactIdsRef.current.has(change.doc.id)) {
              knownContactIdsRef.current.add(change.doc.id);
              const data = change.doc.data();
              const sender = typeof data.name === 'string' ? data.name : 'Reader';
              const subject = typeof data.subject === 'string' ? data.subject : 'New contact inquiry';
              showToast('info', `New Inquiry from ${sender}`, subject);
              sendBrowserNotification(`New Inquiry from ${sender}`, subject);
            }
          });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'contactMessages');
        }
      );
    }

    return () => {
      unsubAdmin();
      if (unsubContacts) unsubContacts();
    };
  }, [isAdmin, sendBrowserNotification, showToast, user]);

  const markPublicRead = useCallback((id: string) => {
    setReadPublicIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllPublicRead = useCallback(() => {
    setReadPublicIds((prev) => {
      const next = new Set(prev);
      publicNotifications.forEach((n) => next.add(n.id));
      saveReadIds(next);
      return next;
    });
  }, [publicNotifications]);

  const markAdminRead = useCallback(async (id: string, read = true) => {
    await markAdminNotificationRead(id, read);
  }, []);

  const markAllAdminRead = useCallback(async () => {
    await markAllAdminNotificationsRead(adminNotifications);
  }, [adminNotifications]);

  const toggleBrowserAlerts = useCallback(async () => {
    if (!browserSupported) {
      showToast('error', 'Browser alerts unsupported', 'Your browser does not support Web Notifications.');
      return;
    }

    if (browserAlertsEnabled) {
      setBrowserAlertsEnabled(false);
      try {
        window.localStorage.setItem(BROWSER_ALERTS_KEY, 'false');
      } catch {
        // Ignore
      }
      showToast('info', 'Browser alerts paused', 'You can still view updates inside the Notification Bell.');
      return;
    }

    let perm = window.Notification.permission;
    if (perm === 'default') {
      try {
        perm = await window.Notification.requestPermission();
      } catch {
        perm = 'denied';
      }
    }
    setBrowserPermission(perm);

    if (perm === 'granted') {
      setBrowserAlertsEnabled(true);
      try {
        window.localStorage.setItem(BROWSER_ALERTS_KEY, 'true');
      } catch {
        // Ignore
      }
      showToast('success', 'Browser alerts enabled', 'You will be notified when new articles are published.');
    } else {
      setBrowserAlertsEnabled(false);
      showToast(
        'error',
        'Notifications blocked',
        'Please allow notifications in your browser settings to enable desktop/mobile alerts.'
      );
    }
  }, [browserAlertsEnabled, browserSupported, showToast]);

  const unreadPublicCount = useMemo(
    () => publicNotifications.filter((n) => !readPublicIds.has(n.id)).length,
    [publicNotifications, readPublicIds]
  );

  const unreadAdminCount = useMemo(
    () => adminNotifications.filter((n) => !n.read).length,
    [adminNotifications]
  );

  const value: NotificationContextValue = {
    toasts,
    showToast,
    dismissToast,
    publicNotifications,
    readPublicIds,
    unreadPublicCount,
    markPublicRead,
    markAllPublicRead,
    adminNotifications,
    unreadAdminCount,
    markAdminRead,
    markAllAdminRead,
    browserSupported,
    browserPermission,
    browserAlertsEnabled,
    toggleBrowserAlerts,
    popupOpen,
    openNotificationPopup,
    closeNotificationPopup,
    toggleNotificationPopup,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider.');
  }
  return ctx;
}
