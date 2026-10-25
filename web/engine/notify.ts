'use client';

// Notifications shown by this device while Compressly is open (also when the tab is in the background).
// No server is involved: the page asks the browser's service worker to show them.

export interface Note {
  title: string;
  body: string;
  tag: string;
  url: string;
  silent?: boolean;
  renotify?: boolean;
}

export type NotifyStatus = 'unsupported' | 'insecure' | 'denied' | 'off' | 'on';

const KEY = 'notifications';

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  void navigator.serviceWorker.register('/sw.js').catch(() => {});
}

export function notifyStatus(): NotifyStatus {
  if (!window.isSecureContext) return 'insecure';
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  let wanted = true;
  try {
    wanted = localStorage.getItem(KEY) !== 'off';
  } catch {}
  return Notification.permission === 'granted' && wanted ? 'on' : 'off';
}

export async function enableNotifications(): Promise<NotifyStatus> {
  const s = notifyStatus();
  if (s === 'insecure' || s === 'unsupported' || s === 'denied') return s;
  const perm = await Notification.requestPermission();
  try {
    localStorage.setItem(KEY, 'on');
  } catch {}
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  await notify({ title: 'Notifications are on', body: 'You will see progress here while Compressly works.', tag: 'test', url: '/settings' }, true);
  return 'on';
}

export function disableNotifications(): NotifyStatus {
  try {
    localStorage.setItem(KEY, 'off');
  } catch {}
  return 'off';
}

/** Shows a notification if they're on. Never throws: a missed notification must not stop a job. */
export async function notify(n: Note, force = false) {
  try {
    if (!force && notifyStatus() !== 'on') return;
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(n.title, {
      body: n.body,
      tag: n.tag,
      silent: !!n.silent,
      icon: '/icon-192.png',
      badge: '/badge.png',
      data: { url: n.url },
      ...(n.renotify ? { renotify: true } : {}),
    } as NotificationOptions);
  } catch {}
}
