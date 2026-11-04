// Copia a public/vendor los archivos que ciertas librerías cargan por URL en tiempo de ejecución.
// MapLibre 6 levanta su web worker desde un archivo aparte que el empaquetador no copia.
// Se ejecuta antes de dev y build (predev / prebuild). La carpeta generada no se versiona.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(readFileSync(path.join(root, 'node_modules/maplibre-gl/package.json'), 'utf8'));
const dest = path.join(root, 'public/vendor/maplibre', pkg.version);
mkdirSync(dest, { recursive: true });
for (const f of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(path.join(root, 'node_modules/maplibre-gl/dist', f), path.join(dest, f));
}
console.log(`maplibre-gl ${pkg.version} → public/vendor/maplibre/${pkg.version}`);
