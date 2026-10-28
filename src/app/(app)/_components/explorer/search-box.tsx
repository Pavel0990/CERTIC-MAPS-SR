'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Search, TriangleAlert, X } from 'lucide-react';
import { LAYER_BY_ID, type LatLng } from '@/modules/map';
import { cn } from '@/utils/cn';
import { LayerDot } from './shared';

export interface SearchHit { layer: 'business' | 'tourism' | 'route'; id: string; name: string; municipality: string | null; point: LatLng | null }

/** Buscador del mapa (sin tildes, con espera corta entre teclas) y acceso directo a "Reportar". */
export function SearchBox({ onPick }: { onPick: (hit: SearchHit) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ q: string; hits: SearchHit[] } | null>(null);
  // Resultado resaltado con las flechas, y si la lista está cerrada (Escape o clic fuera)
  const [active, setActive] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();
  // Los resultados solo valen para la consulta actual (valor derivado, sin setState en efectos)
  const hits = !dismissed && trimmed.length >= 2 && results?.q === trimmed ? results.hits : null;

  // En PC: "/" o Ctrl+K llevan al buscador desde cualquier parte del mapa
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if ((e.key === '/' && !typing) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setDismissed(true);
    }
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, []);

  function pick(h: SearchHit) {
    setQuery('');
    setActive(-1);
    onPick(h);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      if (hits) setDismissed(true);
      else setQuery('');
      return;
    }
    if (!hits?.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + hits.length) % hits.length);
    } else if (e.key === 'Enter') {
      const hit = hits[Math.max(active, 0)];
      if (!hit) return;
      e.preventDefault();
      pick(hit);
    }
  }

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
    <div ref={rootRef} className="pointer-events-auto relative">
      <label className="flex h-14 items-center gap-2 rounded-[18px] bg-surface pl-4 pr-2 shadow-[var(--shadow-float)]">
        <Search className="size-5 shrink-0 text-muted" aria-hidden />
        <span className="sr-only">Buscar lugares, negocios o rutas</span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(-1);
            setDismissed(false);
          }}
          onFocus={() => setDismissed(false)}
          onKeyDown={onKeyDown}
          placeholder="¿A dónde quieres ir?"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-subtle [&::-webkit-search-cancel-button]:appearance-none"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={hits ? 'search-results' : undefined}
          aria-expanded={!!hits}
          aria-activedescendant={hits && active >= 0 ? `search-hit-${active}` : undefined}
        />
        {!query && (
          <kbd className="mr-1 hidden h-7 min-w-7 items-center justify-center rounded-[8px] border border-line-strong px-1.5 text-[13px] font-semibold text-subtle lg:inline-flex" title="Pulsa / para buscar">/</kbd>
        )}
        {query && (
          <button type="button" aria-label="Borrar búsqueda" onClick={() => setQuery('')} className="press rounded-full p-2.5 text-muted hover:bg-canvas">
            <X className="size-5" />
          </button>
        )}
        <Link prefetch={false}
          href="/reportar"
          className="press inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-danger-soft px-3 text-[15px] font-semibold text-danger-strong hover:bg-danger-soft-strong"
        >
          {/* En 320 px solo el ícono (la barra de abajo ya tiene «Reportar» con texto) para que se lea el buscador */}
          <TriangleAlert className="size-4" aria-hidden /> <span className="max-[359px]:sr-only">Reportar</span>
        </Link>
      </label>
      {hits && (
        <div id="search-results" className="animate-fade-in absolute inset-x-0 top-[calc(100%+6px)] max-h-[50dvh] overflow-y-auto rounded-[18px] bg-surface p-2 shadow-[var(--shadow-float)]">
          {hits.length === 0 ? (
            <p className="px-3 py-4 text-[15px] text-muted">No encontramos «{query}». Prueba con otra palabra, como «café» o «río».</p>
          ) : (
            <ul role="listbox" aria-label="Resultados de la búsqueda">
              {hits.map((h, i) => {
                const L = LAYER_BY_ID[h.layer];
                return (
                  <li key={`${h.layer}-${h.id}`} role="none">
                    <button
                      id={`search-hit-${i}`}
                      type="button"
                      role="option"
                      aria-selected={i === active}
                      tabIndex={-1}
                      onClick={() => pick(h)}
                      onMouseEnter={() => setActive(i)}
                      className={cn('press-soft flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left active:bg-canvas', i === active ? 'bg-brand-soft' : 'hover:bg-canvas')}
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
