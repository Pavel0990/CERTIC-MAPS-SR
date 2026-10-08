'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Search, TriangleAlert, X } from 'lucide-react';
import { LAYER_BY_ID, type LatLng } from '@/modules/map';
import { LayerDot } from './shared';

export interface SearchHit { layer: 'business' | 'tourism' | 'route'; id: string; name: string; municipality: string | null; point: LatLng | null }

/** Buscador del mapa (sin tildes, con espera corta entre teclas) y acceso directo a "Reportar". */
export function SearchBox({ onPick }: { onPick: (hit: SearchHit) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  const trimmed = query.trim();
  // Los resultados solo valen para la consulta actual (valor derivado, sin setState en efectos)
  const hits = trimmed.length >= 2 && results?.q === trimmed ? results.hits : null;

  useEffect(() => {
    const q = trimmed;
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : []))
        .then((found: SearchHit[]) => setResults({ q, hits: found }))
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [trimmed]);

  return (
    <div className="pointer-events-auto relative">
      <label className="flex h-14 items-center gap-2 rounded-[18px] bg-surface pl-4 pr-2 shadow-[var(--shadow-float)]">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="sr-only">Buscar lugares, negocios o rutas</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="¿A dónde quieres ir?"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-subtle"
          autoComplete="off"
          aria-controls="search-results"
        />
        {query && (
          <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')} className="rounded-full p-2 text-muted hover:bg-canvas">
            <X className="size-5" />
          </button>
        )}
        <Link
          href="/reportar"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] bg-danger-soft px-3 text-[15px] font-semibold text-danger-strong hover:bg-[#fdd5d2]"
        >
          <TriangleAlert className="size-4" aria-hidden /> Reportar
        </Link>
      </label>
      {hits && (
        <div id="search-results" className="absolute inset-x-0 top-[calc(100%+6px)] max-h-[50dvh] overflow-y-auto rounded-[18px] bg-surface p-2 shadow-[var(--shadow-float)]">
          {hits.length === 0 ? (
            <p className="px-3 py-4 text-[15px] text-muted">No encontramos «{query}». Prueba con otra palabra, como «café» o «río».</p>
          ) : (
            <ul>
              {hits.map((h) => {
                const L = LAYER_BY_ID[h.layer];
                return (
                  <li key={`${h.layer}-${h.id}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setQuery('');
                        onPick(h);
                      }}
                      className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left hover:bg-canvas"
                    >
                      <LayerDot color={L.color} path={L.icon} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{h.name}</span>
                        <span className="block text-sm text-muted">{L.label}{h.municipality ? ` · ${h.municipality}` : ''}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
