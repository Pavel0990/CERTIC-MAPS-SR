import { describe, expect, it } from 'vitest';
import { parseGpx, thinPoints } from './gpx';

const gpx = (body: string) => `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`;

describe('parseGpx', () => {
  it('lee los puntos de la pista como [lng, lat]', () => {
    const xml = gpx('<trk><trkseg><trkpt lat="19.47" lon="-71.34"><ele>200</ele></trkpt><trkpt lon="-71.35" lat="19.48"/></trkseg></trk>');
    expect(parseGpx(xml)).toEqual([[-71.34, 19.47], [-71.35, 19.48]]);
  });

  it('usa los puntos de ruta si no hay pista', () => {
    expect(parseGpx(gpx("<rte><rtept lat='19.1' lon='-71.1'/><rtept lat='19.2' lon='-71.2'/></rte>"))).toEqual([[-71.1, 19.1], [-71.2, 19.2]]);
  });

  it('prefiere la pista cuando el archivo trae las dos', () => {
    const xml = gpx('<rte><rtept lat="1" lon="1"/></rte><trk><trkseg><trkpt lat="2" lon="2"/><trkpt lat="3" lon="3"/></trkseg></trk>');
    expect(parseGpx(xml)).toEqual([[2, 2], [3, 3]]);
  });

  it('acepta etiquetas con prefijo de espacio de nombres', () => {
    expect(parseGpx('<gpx:trkpt lat="19" lon="-71"/><gpx:trkpt lat="19.1" lon="-71"/>')).toHaveLength(2);
  });

  it('descarta coordenadas inválidas y puntos repetidos seguidos', () => {
    const xml = gpx('<trkpt lat="19" lon="-71"/><trkpt lat="19" lon="-71"/><trkpt lat="abc" lon="-71"/><trkpt lat="95" lon="-71"/><trkpt lat="19.1" lon="-71"/>');
    expect(parseGpx(xml)).toEqual([[-71, 19], [-71, 19.1]]);
  });

  it('devuelve una lista vacía si no es un GPX', () => {
    expect(parseGpx('hola')).toEqual([]);
  });
});

describe('thinPoints', () => {
  it('no cambia un trazado corto', () => {
    const pts: [number, number][] = [[0, 0], [1, 1], [2, 2]];
    expect(thinPoints(pts, 5)).toBe(pts);
  });

  it('reduce a como mucho max puntos y conserva el inicio y el final', () => {
    const pts = Array.from({ length: 101 }, (_, i) => [i, i] as [number, number]);
    const out = thinPoints(pts, 11);
    expect(out).toHaveLength(11);
    expect(out[0]).toEqual([0, 0]);
    expect(out[10]).toEqual([100, 100]);
  });
});
