import { describe, expect, it } from 'vitest';
import { readable, servicesSentence } from './readable';

describe('readable', () => {
  it('une con punto final, limpia espacios y omite lo vacío', () => {
    expect(readable(['Presa de Monción', null, '', false, '  Mirador   y río ', 'Horario: todos los días.'])).toBe('Presa de Monción. Mirador y río. Horario: todos los días.');
  });
  it('no duplica la puntuación final', () => {
    expect(readable(['¿Hay baño?', '¡Bienvenido!'])).toBe('¿Hay baño? ¡Bienvenido!');
  });
});

describe('servicesSentence', () => {
  it('dice lo que tiene y lo que no, en lenguaje natural', () => {
    expect(servicesSentence([
      { label: 'Baño', available: true },
      { label: 'Parqueo', available: true },
      { label: 'Agua potable', available: true },
      { label: 'Electricidad', available: false },
    ])).toBe('Tiene baño, parqueo y agua potable. No tiene electricidad.');
  });
  it('sin servicios: nada', () => {
    expect(servicesSentence([])).toBe('');
  });
});
