import { describe, expect, it } from 'vitest';
import { pickVoice, speechChunks } from './listen-button';

describe('pickVoice', () => {
  it('prefiere la voz dominicana, luego la latinoamericana y luego cualquier español', () => {
    expect(pickVoice([{ lang: 'en-US' }, { lang: 'es-ES' }, { lang: 'es-MX' }, { lang: 'es-DO' }])?.lang).toBe('es-DO');
    expect(pickVoice([{ lang: 'es-ES' }, { lang: 'es_US' }])?.lang).toBe('es_US');
    expect(pickVoice([{ lang: 'en-US' }, { lang: 'es-ES' }])?.lang).toBe('es-ES');
  });
  it('sin voces en español devuelve null (se usa el idioma es-DO por defecto)', () => {
    expect(pickVoice([{ lang: 'en-US' }, { lang: 'fr-FR' }])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});

describe('speechChunks', () => {
  it('parte por frases y limpia los espacios', () => {
    expect(speechChunks('  Presa de Monción.   Abierto  todo el día. ¿Hay baño? Sí ')).toEqual(['Presa de Monción.', 'Abierto todo el día.', '¿Hay baño?', 'Sí']);
  });
  it('ningún trozo pasa del máximo, aunque la frase sea larguísima', () => {
    const long = Array.from({ length: 80 }, (_, i) => `palabra${i}`).join(' ');
    const chunks = speechChunks(long, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 120)).toBe(true);
    expect(chunks.join(' ')).toBe(long);
  });
  it('texto vacío: nada que leer', () => {
    expect(speechChunks('   ')).toEqual([]);
  });
});
