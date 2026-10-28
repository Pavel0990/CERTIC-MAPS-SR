/**
 * Curva suave que pasa por cada punto y nunca se sale de los datos (interpolación monótona de Fritsch–Carlson).
 * La anterior (Catmull-Rom) subía o bajaba entre dos semanas sin datos y hacía creer que hubo un pico.
 */
export function monotonePath(pts: [number, number][]): string {
  const n = pts.length;
  if (n === 0) return '';
  if (n === 1) return `M${pts[0]![0]},${pts[0]![1]}`;
  const dx = (i: number) => pts[i + 1]![0] - pts[i]![0];
  const slope = Array.from({ length: n - 1 }, (_, i) => (pts[i + 1]![1] - pts[i]![1]) / dx(i));
  const tan = pts.map((_, i) => (i === 0 ? slope[0]! : i === n - 1 ? slope[n - 2]! : slope[i - 1]! * slope[i]! <= 0 ? 0 : (slope[i - 1]! + slope[i]!) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) { tan[i] = 0; tan[i + 1] = 0; continue; }
    const a = tan[i]! / slope[i]!;
    const b = tan[i + 1]! / slope[i]!;
    const h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); tan[i] = t * a * slope[i]!; tan[i + 1] = t * b * slope[i]!; }
  }
  let d = `M${pts[0]![0]},${pts[0]![1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]!;
    const [x1, y1] = pts[i + 1]!;
    const h = dx(i) / 3;
    d += ` C${x0 + h},${y0 + tan[i]! * h} ${x1 - h},${y1 - tan[i + 1]! * h} ${x1},${y1}`;
  }
  return d;
}
