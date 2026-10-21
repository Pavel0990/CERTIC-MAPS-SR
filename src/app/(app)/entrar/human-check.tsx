'use client';
import { useEffect, useRef, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { HUMAN_CHECK } from '@/lib/vocabulary';

// Captcha de Cloudflare Turnstile (SECURITY.md). Solo se monta en /entrar y solo si existe
// NEXT_PUBLIC_TURNSTILE_SITE_KEY: el script de Cloudflare no se carga en ninguna otra pantalla.
// El token viaja en el campo oculto "captchaToken" y lo valida Supabase Auth (Attack Protection).

interface TurnstileApi {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export interface CaptchaConfig {
  siteKey: string;
  /** Nonce de la CSP de este request (src/proxy.ts); Turnstile lo propaga a lo que carga. */
  nonce?: string;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<void> | null = null;

function loadTurnstile(nonce?: string): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    if (nonce) script.nonce = nonce;
    script.onload = () => resolve();
    script.onerror = () => {
      // Sin conexión o bloqueado: se quita para que "intentar otra vez" lo vuelva a pedir
      script.remove();
      loading = null;
      reject(new Error('turnstile_unavailable'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Tema del recuadro igual al de la app: el elegido en Perfil (data-theme) o, sin elección, el del teléfono. */
function currentTheme() {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || t === 'light' ? t : 'auto';
}

/**
 * Recuadro "eres una persona". Cada token sirve una sola vez: quien lo usa debe volver a montarlo
 * (key distinta) después de cada envío para que salga uno nuevo.
 */
export function HumanCheck({ siteKey, nonce }: CaptchaConfig) {
  const wrap = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState('');
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let widgetId: string | null = null;
    loadTurnstile(nonce).then(
      () => {
        if (cancelled || !box.current || !wrap.current || !window.turnstile) return;
        widgetId = window.turnstile.render(box.current, {
          sitekey: siteKey,
          theme: currentTheme(),
          language: 'es',
          // "flexible" ocupa todo el ancho pero necesita 300 px; en teléfonos de 320 px queda el compacto
          size: wrap.current.clientWidth < 300 ? 'compact' : 'flexible',
          // El campo oculto lo ponemos nosotros (captchaToken); así no se duplica
          'response-field': false,
          callback: (t: string) => {
            setToken(t);
            setFailed(false);
          },
          // Vence a los 5 minutos y Turnstile lo renueva solo
          'expired-callback': () => setToken(''),
          'timeout-callback': () => {
            setToken('');
            setFailed(true);
          },
          'error-callback': () => {
            setToken('');
            setFailed(true);
            return true;
          },
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, nonce, attempt]);

  function retry() {
    setFailed(false);
    setToken('');
    setAttempt((n) => n + 1);
  }

  return (
    <div ref={wrap} role="group" aria-label={HUMAN_CHECK.label} data-captcha={token ? 'listo' : failed ? 'fallo' : 'esperando'}>
      <input type="hidden" name="captchaToken" value={token} />
      <div ref={box} className={failed ? 'hidden' : 'min-h-[65px]'} />
      {failed && (
        <div role="alert">
          <button
            type="button"
            onClick={retry}
            className="press flex min-h-11 w-full items-center gap-3 rounded-[14px] border border-danger-line bg-danger-soft px-4 py-3 text-left text-[15px] font-semibold text-danger-strong hover:bg-danger-soft-strong"
          >
            <RotateCw className="size-5 shrink-0" aria-hidden />
            {HUMAN_CHECK.failed}
          </button>
        </div>
      )}
    </div>
  );
}
