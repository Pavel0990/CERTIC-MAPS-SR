// Textos para leer en voz alta (botón «Escuchar», src/components/shared/listen-button.tsx).

/** Texto que lee el botón «Escuchar»: une las partes con punto final y omite las vacías. */
export function readable(parts: (string | null | undefined | false)[]) {
  return parts
    .map((p) => (p || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((p) => (/[.!?:]$/.test(p) ? p : `${p}.`))
    .join(' ');
}

/** Servicios en palabras: «Tiene baño y parqueo. No tiene electricidad.» */
export function servicesSentence(services: { label: string; available: boolean }[]) {
  const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}` : xs[0]);
  const yes = services.filter((s) => s.available).map((s) => s.label.toLowerCase());
  const no = services.filter((s) => !s.available).map((s) => s.label.toLowerCase());
  return readable([yes.length > 0 && `Tiene ${list(yes)}`, no.length > 0 && `No tiene ${list(no)}`]);
}
