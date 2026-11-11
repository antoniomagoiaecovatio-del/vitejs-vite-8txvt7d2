import React, { useMemo } from 'react';
import { RiGridLine } from '@remixicon/react';

import { Card } from './components/Card/Card';
import { cx } from './utils/cx';
import {
  RANGOS,
  IMPLANTACIONES,
  PALETA,
  PUNTOS_HS,
  UMBRAL_ATIPICA,
  EXCLUIR_ATIPICAS,
  rangoDe,
  colorEscala,
  aclarar,
  tHs,
} from './utils/categoriasObras';

// Tablero de doble entrada del indicador Hs MO / kWp: rango de potencia (filas) × implantación (columnas),
// con formato condicional. Al tocar una celda se filtra el "Detalle de obras" de abajo.
// Por ahora no se excluye ninguna obra (ver EXCLUIR_ATIPICAS en utils/categoriasObras.js).
const MIN_OBRAS = 3;
const MEJOR = colorEscala(0);
const PEOR = colorEscala(1);

const fmt = (n, d = 1) =>
  typeof n === 'number' && Number.isFinite(n)
    ? n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

export default function BenchmarkObras({ obras, desvios, onSeleccionar }) {
  const { celdas, total, categorias, excluidas, impls } = useMemo(() => {
    const todas = (obras || [])
      .filter((o) => Number(o.kwp) > 0 && o.hs_mo_kwp !== null && o.hs_mo_kwp !== undefined && Number.isFinite(Number(o.hs_mo_kwp)))
      .map((o) => ({ nombre: o.nombre, kwp: Number(o.kwp), hs: Number(o.hs_mo_kwp), rango: rangoDe(Number(o.kwp)), impl: o.implantacion || '' }));
    const excl = EXCLUIR_ATIPICAS ? todas.filter((o) => o.hs > UMBRAL_ATIPICA) : [];
    const base = EXCLUIR_ATIPICAS ? todas.filter((o) => o.hs <= UMBRAL_ATIPICA) : todas;

    // Promedio ponderado por kWp (horas totales sobre kWp totales).
    const calc = (lista) => {
      const kwp = lista.reduce((s, o) => s + o.kwp, 0);
      return { v: lista.length ? lista.reduce((s, o) => s + o.hs * o.kwp, 0) / kwp : null, n: lista.length, kwp };
    };

    // Solo se muestran las implantaciones que tienen alguna obra.
    const impls = IMPLANTACIONES.filter((i) => base.some((o) => o.impl === i));
    const celdas = {};
    const cand = [];
    RANGOS.forEach((r) =>
      impls.forEach((i) => {
        const c = calc(base.filter((o) => o.rango.id === r.id && o.impl === i));
        celdas[r.id + '|' + i] = c;
        if (c.v !== null && c.n >= MIN_OBRAS) cand.push({ ...c, nombre: `${i} · ${r.corto}` });
      })
    );
    cand.sort((a, b) => a.v - b.v);

    return { celdas, total: calc(base), categorias: cand, excluidas: excl, impls };
  }, [obras]);

  const colorDe = (c) => (c.v === null ? null : { color: colorEscala(tHs(c.v)) });

  const mejor = categorias[0];
  const peor = categorias[categorias.length - 1];
  const sobre = useMemo(() => {
    let n = 0;
    let t = 0;
    (desvios || new Map()).forEach((d) => {
      if (d.pct === null) return;
      t += 1;
      if (d.pct >= 5) n += 1;
    });
    return { n, t };
  }, [desvios]);

  const gridStyle = { display: 'grid', gap: 8, gridTemplateColumns: `minmax(130px,1.1fr) repeat(${impls.length}, minmax(120px,1fr))` };

  const Celda = ({ c, onClick, titulo }) => {
    if (c.v === null)
      return <div className="flex min-h-[74px] items-center justify-center rounded-xl border border-dashed border-white/10 text-xl text-gray-600">—</div>;
    const st = colorDe(c);
    const pocas = c.n < MIN_OBRAS;
    return (
      <button
        type="button"
        onClick={onClick}
        title={titulo}
        className={cx(
          'flex min-h-[74px] flex-col items-center justify-center rounded-xl border px-2 py-1.5 text-center transition-transform hover:-translate-y-0.5 hover:brightness-110',
          pocas && 'opacity-75',
        )}
        style={{ background: st.color + '40', borderColor: st.color + 'cc' }}
      >
        <span className="text-[24px] font-extrabold leading-none tracking-tight xl:text-[29px]" style={{ color: aclarar(st.color, 0.3) }}>
          {fmt(c.v, 1)}
        </span>
        <span className="mt-1 text-[10px] font-medium text-gray-200">
          {c.n} {c.n === 1 ? 'obra' : 'obras'} · {fmt(c.kwp, 0)} kWp
          {pocas && <span className="ml-1 rounded bg-white/15 px-1 text-[9px] text-gray-300">pocas</span>}
        </span>
      </button>
    );
  };

  const kpis = [
    { t: 'Promedio general', v: total.v !== null ? fmt(total.v, 1) : '—', s: `Hs MO / kWp · ${total.n} obras`, c: total.v !== null ? aclarar(colorEscala(tHs(total.v)), 0.2) : '#f4f8f8' },
    { t: 'Categoría más eficiente', v: mejor ? fmt(mejor.v, 1) : '—', s: mejor ? `${mejor.nombre} · ${mejor.n} obras` : 'sin categorías con 3 obras o más', c: aclarar(MEJOR, 0.2) },
    { t: 'Categoría con más horas', v: peor ? fmt(peor.v, 1) : '—', s: peor ? `${peor.nombre} · ${peor.n} obras` : 'sin categorías con 3 obras o más', c: aclarar(PEOR, 0.25) },
    { t: 'Obras por encima de su categoría', v: `${sobre.n} de ${sobre.t}`, s: 'más de 5 % de horas por kWp sobre el promedio de su categoría', c: '#ffd93d' },
  ];

  // Leyenda: la barra va de lo mejor (verde) a lo peor (rojo).
  const barra = `linear-gradient(90deg, ${[...PALETA].reverse().join(', ')})`;
  const marcas = PUNTOS_HS.map(([v, t], i, a) => [t, (i === 0 ? '≤ ' : i === a.length - 1 ? '≥ ' : '') + v]);

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <RiGridLine className="size-4" aria-hidden="true" />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Hs MO / kWp por rango de potencia e implantación</div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.t} className="rounded-xl border border-white/10 bg-black/20 px-3.5 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{k.t}</div>
            <div className="mt-0.5 text-[29px] font-extrabold leading-tight tracking-tight" style={{ color: k.c }}>
              {k.v}
            </div>
            <div className="text-[10px] text-gray-400">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: 150 + impls.length * 135 }}>
          <div className="mb-1.5 px-1" style={gridStyle}>
            <div className="flex items-end text-[10px] font-semibold uppercase tracking-wider text-gray-500">Rango ↓ · Implantación →</div>
            {impls.map((i) => (
              <button key={i} type="button" onClick={() => onSeleccionar?.(null, i)} className="rounded-lg py-0.5 text-center text-[13px] font-extrabold uppercase tracking-wide text-gray-100 hover:bg-white/10" title={`Ver las obras ${i} en el detalle`}>
                {i}
              </button>
            ))}
          </div>

          {RANGOS.map((r) => (
            <div key={r.id} className="mb-2" style={gridStyle}>
              <button type="button" onClick={() => onSeleccionar?.(r.label, null)} className="flex flex-col justify-center rounded-xl bg-white/5 px-3 text-left hover:bg-white/10" title={`Ver las obras ${r.corto} en el detalle`}>
                <span className="text-[14px] font-extrabold text-gray-50">{r.corto}</span>
                <span className="text-[10px] text-gray-400">{r.label.replace(/^[^(]*/, '').replace(/[()]/g, '')}</span>
              </button>
              {impls.map((i) => (
                <Celda key={i} c={celdas[r.id + '|' + i]} onClick={() => onSeleccionar?.(r.label, i)} titulo={`${i} · ${r.label}: ver las obras en el detalle`} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-center gap-2 text-[10px] text-gray-400">
        <div className="w-full max-w-[460px]">
          <div className="mb-1 flex justify-between font-semibold">
            <span style={{ color: aclarar(MEJOR, 0.2) }}>Mejor (menos horas)</span>
            <span style={{ color: aclarar(PEOR, 0.25) }}>Peor (más horas)</span>
          </div>
          <div className="h-3 rounded" style={{ background: barra }} />
          <div className="relative mt-0.5 h-3">
            {marcas.map(([t, txt]) => (
              <span key={txt} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${t * 100}%` }}>
                {txt}
              </span>
            ))}
          </div>
        </div>
        <span className="text-center text-gray-500">
          Promedios ponderados por kWp. Tocá una celda para ver esas obras en el detalle de abajo.
          {excluidas.length > 0 && (
            <span className="ml-1 cursor-help text-[#ffd93d]" title={excluidas.map((o) => `${o.nombre} (${fmt(o.hs, 1)})`).join(' · ')}>
              {excluidas.length} obras atípicas (más de {UMBRAL_ATIPICA} Hs MO/kWp) excluidas — pasá el cursor para ver cuáles.
            </span>
          )}
        </span>
      </div>
    </Card>
  );
}
