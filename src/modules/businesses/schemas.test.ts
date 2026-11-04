import { describe, expect, it } from 'vitest';
import { businessInput, businessUpdateInput, hoursInput, promotionInput } from './schemas';

const base = { name: 'Colmado Don Pedro', categorySlug: 'colmado', lat: 19.47, lng: -71.34, idempotencyKey: 'abcdef123456' };
const ID = '6b2db7ba-87e2-4a63-aa8e-7cac3878f292';

describe('businessInput', () => {
  it('los campos de contacto vacíos quedan sin valor', () => {
    const r = businessInput.parse({ ...base, phone: '', whatsapp: '', email: '', website: '', address: '', description: '' });
    expect(r.phone).toBeUndefined();
    expect(r.website).toBeUndefined();
  });

  it('rechaza formatos que la base también rechaza', () => {
    expect(businessInput.safeParse({ ...base, phone: '12' }).success).toBe(false);
    expect(businessInput.safeParse({ ...base, website: 'http://sitio.do' }).success).toBe(false);
    expect(businessInput.safeParse({ ...base, email: 'sin-arroba' }).success).toBe(false);
    expect(businessInput.safeParse({ ...base, name: 'A' }).success).toBe(false);
  });

  it('acepta teléfonos dominicanos comunes', () => {
    expect(businessInput.safeParse({ ...base, whatsapp: '809 555 1234', phone: '+1 (829) 555-1234' }).success).toBe(true);
  });
});

describe('businessUpdateInput', () => {
  it('exige id y versión', () => {
    expect(businessUpdateInput.safeParse({ name: 'Colmado' }).success).toBe(false);
    expect(businessUpdateInput.safeParse({ id: ID, version: 3, name: 'Colmado', phone: '' }).success).toBe(true);
  });
});

describe('hoursInput', () => {
  it('rechaza horarios con la misma hora de abrir y cerrar o repetidos', () => {
    expect(hoursInput.safeParse({ businessId: ID, hours: [{ weekday: 1, opens: '08:00', closes: '08:00' }] }).success).toBe(false);
    expect(hoursInput.safeParse({ businessId: ID, hours: [{ weekday: 1, opens: '08:00', closes: '12:00' }, { weekday: 1, opens: '08:00', closes: '17:00' }] }).success).toBe(false);
  });

  it('acepta un horario vacío (cerrado toda la semana) y uno que pasa la medianoche', () => {
    expect(hoursInput.safeParse({ businessId: ID, hours: [] }).success).toBe(true);
    expect(hoursInput.safeParse({ businessId: ID, hours: [{ weekday: 5, opens: '20:00', closes: '02:00' }] }).success).toBe(true);
  });
});

describe('promotionInput', () => {
  const promo = { businessId: ID, title: '2x1 en jugos', validFrom: '2026-10-10', validUntil: '2026-10-20' };

  it('acepta una promoción válida', () => {
    expect(promotionInput.safeParse(promo).success).toBe(true);
  });

  it('la fecha final no puede ser anterior a la inicial', () => {
    expect(promotionInput.safeParse({ ...promo, validUntil: '2026-10-09' }).success).toBe(false);
  });

  it('dura como mucho 90 días', () => {
    expect(promotionInput.safeParse({ ...promo, validUntil: '2027-01-08' }).success).toBe(true); // 90 días
    expect(promotionInput.safeParse({ ...promo, validUntil: '2027-01-09' }).success).toBe(false);
  });
});
