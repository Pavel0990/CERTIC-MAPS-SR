import { describe, expect, it } from 'vitest';
import { formatTime, hoursByDay, isOpenNow, localNow, localToday, promotionStartMin } from './hours';

// Santo Domingo es UTC−4 todo el año (sin horario de verano).
const at = (iso: string) => new Date(`${iso}-04:00`);

describe('localNow', () => {
  it('usa la hora de Santo Domingo', () => {
    // 2026-10-05 es lunes
    expect(localNow(at('2026-10-05T09:30:00'))).toEqual({ weekday: 1, minutes: 9 * 60 + 30 });
    expect(localNow(new Date('2026-10-05T02:00:00Z'))).toEqual({ weekday: 0, minutes: 22 * 60 });
  });

  it('localToday da la fecha local, no la UTC', () => {
    expect(localToday(new Date('2026-10-05T02:00:00Z'))).toBe('2026-10-04');
  });
});

describe('isOpenNow', () => {
  const weekdays = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, opens: '08:00', closes: '17:00' }));

  it('abierto dentro del horario y cerrado fuera', () => {
    expect(isOpenNow(weekdays, at('2026-10-05T08:00:00'))).toBe(true);
    expect(isOpenNow(weekdays, at('2026-10-05T16:59:00'))).toBe(true);
    expect(isOpenNow(weekdays, at('2026-10-05T17:00:00'))).toBe(false);
    expect(isOpenNow(weekdays, at('2026-10-05T07:59:00'))).toBe(false);
  });

  it('cerrado los días sin horario', () => {
    expect(isOpenNow(weekdays, at('2026-10-04T10:00:00'))).toBe(false); // domingo
  });

  it('un horario que pasa la medianoche sigue abierto la madrugada siguiente', () => {
    const night = [{ weekday: 5, opens: '20:00', closes: '02:00' }]; // viernes
    expect(isOpenNow(night, at('2026-10-09T23:00:00'))).toBe(true); // viernes 23:00
    expect(isOpenNow(night, at('2026-10-10T01:30:00'))).toBe(true); // sábado 01:30
    expect(isOpenNow(night, at('2026-10-10T02:00:00'))).toBe(false);
    expect(isOpenNow(night, at('2026-10-09T19:00:00'))).toBe(false);
  });

  it('el sábado a medianoche enlaza con el domingo', () => {
    const sat = [{ weekday: 6, opens: '22:00', closes: '03:00' }];
    expect(isOpenNow(sat, at('2026-10-11T01:00:00'))).toBe(true); // domingo 01:00
  });

  it('acepta horario partido', () => {
    const split = [{ weekday: 1, opens: '08:00', closes: '12:00' }, { weekday: 1, opens: '14:00', closes: '18:00' }];
    expect(isOpenNow(split, at('2026-10-05T13:00:00'))).toBe(false);
    expect(isOpenNow(split, at('2026-10-05T15:00:00'))).toBe(true);
  });
});

describe('formatTime y hoursByDay', () => {
  it('formatea en 12 horas', () => {
    expect(formatTime('08:05')).toBe('8:05 a. m.');
    expect(formatTime('00:00')).toBe('12:00 a. m.');
    expect(formatTime('12:30')).toBe('12:30 p. m.');
    expect(formatTime('17:00:00')).toBe('5:00 p. m.');
  });

  it('agrupa por día y ordena por apertura', () => {
    const byDay = hoursByDay([{ weekday: 1, opens: '14:00', closes: '18:00' }, { weekday: 1, opens: '08:00', closes: '12:00' }]);
    expect(byDay).toHaveLength(7);
    expect(byDay[1]?.map((h) => h.opens)).toEqual(['08:00', '14:00']);
    expect(byDay[0]).toEqual([]);
  });
});

describe('promotionStartMin', () => {
  it('de día usa la fecha local', () => {
    expect(promotionStartMin(at('2026-10-02T10:00:00'))).toBe('2026-10-02');
  });

  it('de noche en RD sigue siendo hoy (la base compara con la fecha de RD, migración 290)', () => {
    expect(promotionStartMin(at('2026-10-02T22:50:00'))).toBe('2026-10-02');
  });
});
