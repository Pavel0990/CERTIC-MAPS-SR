import { describe, expect, it } from 'vitest';
import { notificationBody } from './text';

describe('notificationBody', () => {
  it('traduce el código del estado a palabras', () => {
    expect(notificationBody('traffic_status', 'Nuevo estado: active', { status: 'active' })).toBe('Activo. Se ve en el mapa ahora mismo.');
    expect(notificationBody('request_status', 'Nuevo estado: in_progress', {})).toBe('En proceso. Ya están trabajando en esto.');
    expect(notificationBody('content_status', 'Nuevo estado: approved', { status: 'approved' })).toBe('Aprobado. Ya aparece en el mapa.');
  });

  it('nunca deja un código en inglés a la vista', () => {
    expect(notificationBody('traffic_status', 'Nuevo estado: desconocido', {})).toBe('Cambió de estado. Toca para ver cómo va.');
  });

  it('no toca los textos que ya están escritos para personas', () => {
    expect(notificationBody('request_status', 'Resuelta: se cambió la bombilla.', {})).toBe('Resuelta: se cambió la bombilla.');
    expect(notificationBody('system', null, {})).toBeNull();
  });
});
