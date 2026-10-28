import { describe, expect, it } from 'vitest';
import type { KpiSummary } from '@/types/kpi';
import { spokenHours, weeklyHighlights } from './highlights';

function kpis(over: { [K in keyof KpiSummary]?: Partial<KpiSummary[K]> } = {}): KpiSummary {
  return {
    traffic: { received: 0, published: 0, rejected: 0, out_of_area: 0, by_type: {}, ...over.traffic },
    requests: { received: 0, resolved: 0, rejected: 0, open_now: 0, avg_resolution_hours: null, top_supported: [], ...over.requests },
    businesses: { approved_total: 80, submitted: 0, pending_now: 0, ...over.businesses },
    tourism: { places_published: 21, routes_published: 3, proposals_pending: 0, ...over.tourism },
    users: { new: 0, ...over.users },
    engagement: { views: 0, ...over.engagement },
  };
}
const muni = (name: string, metrics: KpiSummary) => ({ municipality_id: name, municipality_name: name, metrics });
const types = { bache: 'Bache', accidente: 'Accidente', animales: 'Animales en la vía' };

describe('weeklyHighlights', () => {
  it('semana tranquila: lo dice en una frase y no inventa nada', () => {
    const out = weeklyHighlights({ snapshots: [{ municipality_id: null, municipality_name: null, metrics: kpis() }], traffic_types: types });
    expect(out).toEqual(['Semana tranquila: no llegaron alertas de tránsito ni reportes de los vecinos.']);
  });

  it('semana con actividad: lo que pide acción va primero y nunca pasa de 6 frases', () => {
    const province = kpis({
      traffic: { received: 8, rejected: 1, by_type: { bache: 5, accidente: 2, animales: 1 } },
      requests: { received: 6, resolved: 0, open_now: 5, top_supported: [{ id: 'x', title: 'Arreglar el puente de Los Almácigos', support_count: 12 }] },
      businesses: { pending_now: 2 },
      tourism: { proposals_pending: 1 },
      users: { new: 3 },
      engagement: { views: 140 },
    });
    const out = weeklyHighlights({
      snapshots: [
        { municipality_id: null, municipality_name: null, metrics: province },
        muni('Monción', kpis({ traffic: { received: 6 }, requests: { received: 4, open_now: 4 } })),
        muni('San Ignacio de Sabaneta', kpis({ traffic: { received: 2 }, requests: { received: 2, open_now: 1 } })),
      ],
      traffic_types: types,
    });
    expect(out.length).toBeLessThanOrEqual(6);
    expect(out[0]).toBe('No se resolvió ninguna consulta esta semana y quedan 5 abiertas.');
    expect(out[1]).toBe('Monción tiene la mayor cantidad de consultas abiertas (4).');
    expect(out[2]).toBe('Esperan revisión en el panel: 2 negocios y 1 propuesta de lugar o ruta.');
    expect(out).toContain('La prioridad más apoyada por los vecinos: «Arreglar el puente de Los Almácigos» (12 apoyos).');
    expect(out).toContain('La alerta vial más común fue «Bache» (5 de 8).');
    expect(out).toContain('Los vecinos enviaron 8 alertas de tránsito y 6 reportes o consultas.');
  });

  it('respuesta del municipio con tiempo medio, y concentración por municipio', () => {
    const out = weeklyHighlights({
      snapshots: [
        { municipality_id: null, municipality_name: null, metrics: kpis({ traffic: { received: 1, by_type: { accidente: 1 } }, requests: { received: 4, resolved: 3, avg_resolution_hours: 60 } }) },
        muni('Villa Los Almácigos', kpis({ traffic: { received: 1 }, requests: { received: 3 } })),
        muni('Monción', kpis({ requests: { received: 1 } })),
      ],
      traffic_types: types,
    });
    expect(out).toContain('El municipio resolvió 3 consultas, en un tiempo medio de 2,5 días.');
    expect(out).toContain('Villa Los Almácigos concentró el 80 % de la actividad de los vecinos.');
    expect(out).toContain('La alerta vial más común fue «Accidente» (1).');
    expect(out).toContain('Los vecinos enviaron 1 alerta de tránsito y 4 reportes o consultas.');
  });

  it('muchas alertas rechazadas: sugiere revisar si se entiende cómo reportar', () => {
    const out = weeklyHighlights({ snapshots: [{ municipality_id: null, municipality_name: null, metrics: kpis({ traffic: { received: 10, rejected: 4, by_type: { bache: 10 } } }) }], traffic_types: types });
    expect(out).toContain('La moderación rechazó 4 de 10 alertas: conviene revisar si los vecinos entienden cómo reportar.');
  });

  it('singulares y alcance', () => {
    const out = weeklyHighlights({ snapshots: [{ municipality_id: null, municipality_name: null, metrics: kpis({ requests: { received: 1, resolved: 1 }, businesses: { pending_now: 1 }, users: { new: 1 }, engagement: { views: 1 } }) }], traffic_types: types });
    expect(out).toContain('Espera revisión en el panel: 1 negocio.');
    expect(out).toContain('El municipio resolvió 1 consulta.');
    expect(out).toContain('Las fichas recibieron 1 visita y se sumaron 1 persona nueva.');
  });

  it('sin la foto de la provincia no hay frases', () => {
    expect(weeklyHighlights({ snapshots: [], traffic_types: {} })).toEqual([]);
  });
});

describe('spokenHours', () => {
  it('horas hasta 2 días, luego días con coma decimal', () => {
    expect(spokenHours(1)).toBe('1 hora');
    expect(spokenHours(18.4)).toBe('18 horas');
    expect(spokenHours(60)).toBe('2,5 días');
  });
});
