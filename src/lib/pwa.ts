'use client';
// Utilidades del service worker (public/sw.js) para el cliente. Sin dependencias de dominio.

/** En desarrollo el service worker no guarda nada (rompería la recarga en caliente); push sí funciona. */
const SW_URL = process.env.NODE_ENV === 'production' ? '/sw.js' : '/sw.js?dev=1';

export function registerServiceWorker() {
  return navigator.serviceWorker.register(SW_URL, { scope: '/', updateViaCache: 'none' });
}

/** Al salir de la cuenta: borra las páginas y datos guardados para usar sin conexión (§6.4). */
export async function clearOfflineCaches() {
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  reg?.active?.postMessage({ type: 'CLEAR_USER_CACHE' });
}
