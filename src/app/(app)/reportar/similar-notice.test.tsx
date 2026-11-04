import { createRef, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { similarNotice, type SimilarReport } from '@/modules/citizen-reports';
import { SimilarNotice } from './similar-notice';

const ID = '0b7e7c3e-6f1a-4c8e-9d38-2f8a1c5b9e01';
const POINT = { lat: 19.4752, lng: -71.3412 };
const supportable: SimilarReport = { id: ID, kind: 'request', type: 'alumbrado', distance_m: 42, mine: false, support_count: 3, can_support: true, supported: false };

function notice(over: Partial<Parameters<typeof SimilarNotice>[0]> = {}) {
  const props = {
    model: similarNotice([supportable], 'Alumbrado', POINT)!,
    headingRef: createRef<HTMLHeadingElement>(),
    supporting: false,
    supported: false,
    onSupport: vi.fn(),
    onContinue: vi.fn(),
    ...over,
  };
  return { props, element: SimilarNotice(props) };
}

/** Elementos con onClick del árbol (el componente no tiene estado: se puede recorrer sin montarlo). */
function clickables(node: ReactNode, out: ReactElement<{ onClick?: () => void; children?: ReactNode }>[] = []) {
  if (Array.isArray(node)) node.forEach((n) => clickables(n, out));
  else if (isValidElement<{ onClick?: () => void; children?: ReactNode }>(node)) {
    if (node.props.onClick) out.push(node);
    clickables(node.props.children, out);
  }
  return out;
}
const label = (el: ReactElement<{ children?: ReactNode }>) => renderToStaticMarkup(<>{el.props.children}</>).replace(/<[^>]+>/g, '');

describe('SimilarNotice', () => {
  it('muestra la pregunta, el detalle y los tres botones grandes (44 px o más)', () => {
    const html = renderToStaticMarkup(notice().element);
    expect(html).toContain('Ya hay un reporte parecido aquí');
    expect(html).toContain('¿Quieres apoyarlo en lugar de crear otro?');
    expect(html).toContain('a unos 42 m de aquí · 3 personas lo apoyan');
    expect(html).toContain(`href="/consultas/${ID}"`);
    for (const text of ['Apoyarlo', 'Ver el reporte', 'Crear el mío igual']) expect(html).toContain(text);
    expect(html.match(/min-h-\[52px\]/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('"Apoyarlo" llama al voto de ese reporte y "Crear el mío igual" sigue con el asistente', () => {
    const { props, element } = notice();
    const [support, cont] = clickables(element);
    expect(label(support!)).toBe('Apoyarlo');
    support!.props.onClick!();
    expect(props.onSupport).toHaveBeenCalledWith(ID);
    expect(label(cont!)).toBe('Crear el mío igual');
    cont!.props.onClick!();
    expect(props.onContinue).toHaveBeenCalledOnce();
  });

  it('después de apoyar da las gracias y deja seguir igual (nunca bloquea el envío)', () => {
    const { element } = notice({ supported: true });
    const html = renderToStaticMarkup(element);
    expect(html).toContain('¡Gracias por tu apoyo!');
    expect(html).not.toContain('>Apoyarlo<');
    expect(clickables(element).map(label)).toEqual(['Crear el mío igual']);
  });
});
