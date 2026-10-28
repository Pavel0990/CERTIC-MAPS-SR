'use client';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Square, Volume2 } from 'lucide-react';
import { cn } from '@/utils/cn';

// Botón «Escuchar»: lee el texto en voz alta con la voz del propio teléfono (Web Speech API).
// Pensado para quien lee con dificultad (criterio de baja alfabetización digital): gratis, sin
// internet y sin enviar datos a ningún servicio. Si el navegador no tiene voz, el botón no aparece.

const subscribe = () => () => {};
const hasSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

/** Voz en español: primero la dominicana, luego la latinoamericana y por último cualquiera en español. */
export function pickVoice(voices: Pick<SpeechSynthesisVoice, 'lang'>[]) {
  const by = (re: RegExp) => voices.find((v) => re.test(v.lang.replace('_', '-')));
  return by(/^es-DO$/i) ?? by(/^es-(419|US|MX|PR|CO|VE)$/i) ?? by(/^es\b/i) ?? null;
}

/**
 * Parte el texto en trozos cortos por frase: Chrome corta en silencio las lecturas de más de ~15 s,
 * y así además se puede detener entre frases.
 */
export function speechChunks(text: string, max = 180) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[¿¡]?[^.!?¡¿;:]+[.!?;:]*/g) ?? [clean];
  const out: string[] = [];
  for (const raw of sentences) {
    let s = raw.trim();
    while (s.length > max) {
      const cut = s.lastIndexOf(' ', max) > 40 ? s.lastIndexOf(' ', max) : max;
      out.push(s.slice(0, cut).trim());
      s = s.slice(cut).trim();
    }
    if (s) out.push(s);
  }
  return out;
}

export function ListenButton({ text, variant = 'block', className }: { text: string; variant?: 'block' | 'compact'; className?: string }) {
  const supported = useSyncExternalStore(subscribe, hasSpeech, () => false);
  const [speaking, setSpeaking] = useState(false);
  const runId = useRef(0);

  // Al salir de la pantalla (o al cambiar el texto, p. ej. otro paso del asistente) se calla
  useEffect(() => () => {
    if (hasSpeech()) window.speechSynthesis.cancel();
  }, [text]);

  if (!supported || !text.trim()) return null;

  function stop() {
    runId.current += 1;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  function speak() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const id = ++runId.current;
    const voice = pickVoice(synth.getVoices());
    const chunks = speechChunks(text);
    chunks.forEach((chunk, i) => {
      const u = new SpeechSynthesisUtterance(chunk);
      u.lang = voice?.lang ?? 'es-DO';
      if (voice) u.voice = voice as SpeechSynthesisVoice;
      u.rate = 0.95;
      if (i === chunks.length - 1) u.onend = () => { if (runId.current === id) setSpeaking(false); };
      u.onerror = () => { if (runId.current === id) setSpeaking(false); };
      synth.speak(u);
    });
    setSpeaking(true);
  }

  const Icon = speaking ? Square : Volume2;
  const label = speaking ? 'Detener' : 'Escuchar';
  return (
    <button
      type="button"
      onClick={speaking ? stop : speak}
      aria-pressed={speaking}
      className={cn(
        'press inline-flex select-none items-center justify-center gap-2 font-semibold transition-colors',
        variant === 'block'
          ? 'min-h-[52px] w-full rounded-[14px] border border-line-strong bg-surface px-5 text-base text-ink hover:bg-canvas sm:w-auto'
          : 'min-h-11 shrink-0 rounded-full bg-brand-soft px-4 text-[15px] text-brand-strong hover:bg-brand-soft/80',
        speaking && 'border-brand text-brand-strong',
        className,
      )}
    >
      <Icon className={cn('size-5', speaking && 'size-4 fill-current')} aria-hidden />
      {label}
      {speaking && <span className="sr-only">: leyendo en voz alta</span>}
    </button>
  );
}
