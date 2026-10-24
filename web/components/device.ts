'use client';

import { useEffect, useState } from 'react';

export interface Device {
  phone: boolean;
  ios: boolean;
  android: boolean;
  /** Notifications and "save to phone" sharing only work on https or localhost. */
  secure: boolean;
  /** Opened from the home screen like an app. */
  standalone: boolean;
}

const NONE: Device = { phone: false, ios: false, android: false, secure: false, standalone: false };

/** What kind of device and browser the site is open on, for wording and for what the browser allows. */
export function deviceInfo(): Device {
  if (typeof window === 'undefined') return NONE;
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/.test(ua);
  return {
    phone: ios || android || /Mobile/.test(ua),
    ios,
    android,
    secure: window.isSecureContext,
    standalone: matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  };
}

/** Same as deviceInfo(), read after the first render so the server and browser draw the same page first. */
export function useDevice(): Device {
  const [d, setD] = useState(NONE);
  useEffect(() => setD(deviceInfo()), []);
  return d;
}
