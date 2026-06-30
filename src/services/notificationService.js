// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — Notification Service
// Activity feed: duel challenges, badges, coins, level-ups
// ═══════════════════════════════════════════════════════

import {
  collection, addDoc, updateDoc, doc, query, where,
  onSnapshot, getDocs, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const ts = (n) => (n.createdAt?.toDate ? n.createdAt.toDate().getTime() : 0);

/**
 * Push a notification to a user's activity feed.
 */
export async function pushNotification(userId, { type, title, body, icon, meta = {} }) {
  if (!userId) return;
  try {
    await addDoc(collection(db, 'notifications'), {
      userId,
      type,
      title,
      body: body || '',
      icon: icon || '🔔',
      meta,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('pushNotification failed:', err);
  }
}

/**
 * Live-subscribe to a user's notifications (latest 30).
 * Returns the unsubscribe function.
 */
export function subscribeNotifications(userId, callback) {
  if (!userId) return () => {};
  // Single-field query (no composite index needed); sort + slice client-side.
  const q = query(collection(db, 'notifications'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => ts(b) - ts(a))
        .slice(0, 30);
      callback(rows);
    },
    (err) => console.warn('notifications subscription error:', err.message),
  );
}

export async function markNotificationRead(id) {
  try {
    await updateDoc(doc(db, 'notifications', id), { read: true });
  } catch (err) {
    console.error('markNotificationRead failed:', err);
  }
}

/**
 * Mark every unread notification for a user as read (batched).
 */
export async function markAllNotificationsRead(userId) {
  if (!userId) return;
  try {
    // Single-field query (no composite index); filter unread client-side.
    const q = query(collection(db, 'notifications'), where('userId', '==', userId));
    const snap = await getDocs(q);
    const unread = snap.docs.filter((d) => d.data().read === false);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((d) => batch.update(d.ref, { read: true }));
    await batch.commit();
  } catch (err) {
    console.error('markAllNotificationsRead failed:', err);
  }
}
