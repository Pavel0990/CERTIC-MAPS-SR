import { describe, expect, it } from 'vitest';
import { notificationHref } from './href';

describe('notificationHref', () => {
  it('lleva al personal a su bandeja del panel', () => {
    expect(notificationHref('content_status', { entity: 'business', id: 'x', href: '/admin/validaciones' })).toBe('/admin/validaciones');
    expect(notificationHref('request_status', { href: '/admin/bandeja' })).toBe('/admin/bandeja');
  });

  it('nunca acepta un enlace fuera del panel', () => {
    for (const href of ['https://malo.example', '//malo.example', '/admin/../perfil', '/admin?x=//malo', 'javascript:alert(1)', '/perfil']) {
      expect(notificationHref('system', { href })).toBeNull();
    }
  });

  it('mantiene los destinos de siempre', () => {
    expect(notificationHref('request_status', { request_id: 'r1' })).toBe('/consultas/r1');
    expect(notificationHref('traffic_nearby', { traffic_report_id: 't1' })).toBe('/mapa?capas=traffic');
    expect(notificationHref('system', { report_run_id: 'p1' })).toBe('/admin/informes');
    expect(notificationHref('content_status', { entity: 'place', id: 'l1' })).toBe('/turismo/l1');
  });
});
