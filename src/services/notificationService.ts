import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppNotification, NotificationAudience, NotificationType } from '../types';

const NOTIFICATIONS_COLLECTION = 'notifications';

function toTimestampMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === 'object' && value !== null && 'toMillis' in value) {
    const fn = (value as { toMillis?: () => number }).toMillis;
    if (typeof fn === 'function') return fn();
  }
  if (value instanceof Date) return value.getTime();
  return 0;
}

function normalizeNotification(id: string, data: Record<string, unknown>): AppNotification {
  const type: NotificationType =
    data.type === 'article_published' || data.type === 'system' ? data.type : 'editorial';
  const audience: NotificationAudience = data.audience === 'admin' ? 'admin' : 'public';

  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    message: typeof data.message === 'string' ? data.message : '',
    type,
    audience,
    link: typeof data.link === 'string' ? data.link : '',
    read: Boolean(data.read),
    createdByUid: typeof data.createdByUid === 'string' ? data.createdByUid : '',
    createdAt: data.createdAt,
  };
}

function sortNotificationsDesc(items: AppNotification[]): AppNotification[] {
  return [...items].sort((a, b) => toTimestampMillis(b.createdAt) - toTimestampMillis(a.createdAt));
}

function sanitizeInternalLink(link: string): string {
  const trimmed = link.trim();
  if (!trimmed) return '';
  if (!trimmed.startsWith('/')) return '';
  const cleaned = trimmed.replace(/[^a-zA-Z0-9/_-]/g, '').slice(0, 300);
  return /^\/[a-zA-Z0-9/_-]*$/.test(cleaned) ? cleaned : '';
}

function generateSafeNotificationId(prefix: string): string {
  const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) || 'notif';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${safePrefix}-${Date.now()}-${suffix}`;
}

export function subscribePublicNotifications(
  onData: (items: AppNotification[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = query(
    collection(db, NOTIFICATIONS_COLLECTION),
    where('audience', '==', 'public')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => normalizeNotification(d.id, d.data()));
      onData(sortNotificationsDesc(items).slice(0, 30));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLLECTION);
      }
    }
  );
}

export function subscribeAdminNotifications(
  uid: string,
  isBootstrapAdmin: boolean,
  onData: (items: AppNotification[]) => void,
  onError?: (err: Error) => void
): () => void {
  const q = isBootstrapAdmin
    ? query(collection(db, NOTIFICATIONS_COLLECTION), where('audience', '==', 'admin'))
    : query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('audience', '==', 'admin'),
        where('createdByUid', '==', uid)
      );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => normalizeNotification(d.id, d.data()));
      onData(sortNotificationsDesc(items).slice(0, 50));
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, NOTIFICATIONS_COLLECTION);
      }
    }
  );
}

export async function createNotification(
  input: {
    title: string;
    message: string;
    type: NotificationType;
    audience: NotificationAudience;
    link?: string;
    read?: boolean;
    customId?: string;
  },
  adminUid: string
): Promise<string> {
  const title = input.title.trim().slice(0, 160);
  const message = input.message.trim().slice(0, 500);
  if (!title || !message) {
    throw new Error('Notification title and message are required.');
  }

  const safeId = input.customId
    ? input.customId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 120)
    : generateSafeNotificationId('notif');
  const path = `${NOTIFICATIONS_COLLECTION}/${safeId}`;

  try {
    await setDoc(doc(db, NOTIFICATIONS_COLLECTION, safeId), {
      title,
      message,
      type: input.type,
      audience: input.audience,
      link: sanitizeInternalLink(input.link || ''),
      read: Boolean(input.read),
      createdByUid: adminUid,
      createdAt: serverTimestamp(),
    });
    return safeId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function publishArticleNotifications(
  article: { title: string; slug: string; category: string },
  adminUid: string
): Promise<void> {
  const safeSlugId = `pub-${article.slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100)}`;
  const adminLogId = `admin-pub-${article.slug.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 90)}`;
  const articleLink = sanitizeInternalLink(`/article/${article.slug}`);

  await Promise.all([
    createNotification(
      {
        customId: safeSlugId,
        title: `New in ${article.category}`,
        message: article.title,
        type: 'article_published',
        audience: 'public',
        link: articleLink,
        read: false,
      },
      adminUid
    ),
    createNotification(
      {
        customId: adminLogId,
        title: 'Article Published Live',
        message: `"${article.title}" is now live in ${article.category}.`,
        type: 'article_published',
        audience: 'admin',
        link: articleLink,
        read: false,
      },
      adminUid
    ),
  ]);
}

export async function markAdminNotificationRead(id: string, read: boolean): Promise<void> {
  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await updateDoc(doc(db, NOTIFICATIONS_COLLECTION, id), { read });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markAllAdminNotificationsRead(items: AppNotification[]): Promise<void> {
  const unread = items.filter((n) => !n.read);
  if (unread.length === 0) return;

  try {
    const batch = writeBatch(db);
    unread.slice(0, 400).forEach((item) => {
      batch.update(doc(db, NOTIFICATIONS_COLLECTION, item.id), { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, NOTIFICATIONS_COLLECTION);
  }
}

export async function deleteNotification(id: string): Promise<void> {
  const path = `${NOTIFICATIONS_COLLECTION}/${id}`;
  try {
    await deleteDoc(doc(db, NOTIFICATIONS_COLLECTION, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
