'use client';
import { registerServiceWorker } from '@/lib/pwa';
// Web Push en el navegador (ADR-013): permiso, suscripción de ESTE dispositivo y baja.
// El servidor guarda la suscripción con register_push_device; aquí solo se habla con el navegador.

export type PushSupport = 'ok' | 'unsupported' | 'ios_needs_install' | 'denied';

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/** ¿Se puede activar push aquí? En iPhone solo con la app instalada en la pantalla de inicio (iOS 16.4+). */
export function pushSupport(): PushSupport {
  if (typeof window === 'undefined') return 'unsupported';
  if (isIos() && !isStandalone()) return 'ios_needs_install';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  return 'ok';
}

function keyBytes(base64url: string) {
  const padded = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration()) ?? registerServiceWorker();
}

/** Suscripción actual de este navegador, si la hay. */
export async function currentSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export interface DeviceSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Pide permiso (solo tras un toque de la persona) y suscribe este dispositivo. null si no da permiso. */
export async function subscribeDevice(vapidPublicKey: string): Promise<DeviceSubscription | null> {
  if ((await Notification.requestPermission()) !== 'granted') return null;
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(vapidPublicKey) }));
  const json = sub.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return null;
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth };
}

/** Quita la suscripción del navegador. Devuelve el endpoint para darlo de baja también en el servidor. */
export async function unsubscribeDevice(): Promise<string | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return null;
  const endpoint = sub.endpoint;
  await sub.unsubscribe();
  return endpoint;
}
