'use client';

import { api } from './useLibrary';

/** Browser side of notifications: register the service worker, subscribe, unsubscribe, test. */

export type PushStatus = 'unsupported' | 'insecure' | 'denied' | 'off' | 'on';

export function registerServiceWorker() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  void navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function supported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function currentSub() {
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function pushStatus(): Promise<PushStatus> {
  if (!window.isSecureContext) return 'insecure';
  if (!supported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  const sub = await currentSub();
  if (!sub) return 'off';
  const r = await api<{ subscribed: boolean }>(`/api/push?endpoint=${encodeURIComponent(sub.endpoint)}`).catch(() => ({ subscribed: false }));
  return r.subscribed ? 'on' : 'off';
}

function keyBytes(b64: string) {
  const s = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

export async function enablePush(): Promise<PushStatus> {
  if (!window.isSecureContext) return 'insecure';
  if (!supported()) return 'unsupported';
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off';
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const { publicKey } = await api<{ publicKey: string }>('/api/push');
  let sub = await reg.pushManager.getSubscription();
  // A subscription made with an older key can't receive; start over.
  if (sub && btoa(String.fromCharCode(...new Uint8Array(sub.options.applicationServerKey ?? new ArrayBuffer(0)))) !== btoa(String.fromCharCode(...keyBytes(publicKey)))) {
    await sub.unsubscribe();
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  await api('/api/push', { method: 'POST', json: { subscription: sub.toJSON() } });
  await api('/api/push', { method: 'POST', json: { test: sub.endpoint } });
  return 'on';
}

export async function disablePush(): Promise<PushStatus> {
  const sub = await currentSub();
  if (sub) {
    await api('/api/push', { method: 'DELETE', json: { endpoint: sub.endpoint } }).catch(() => {});
    await sub.unsubscribe();
  }
  return 'off';
}

export async function testPush() {
  const sub = await currentSub();
  if (sub) await api('/api/push', { method: 'POST', json: { test: sub.endpoint } });
}
