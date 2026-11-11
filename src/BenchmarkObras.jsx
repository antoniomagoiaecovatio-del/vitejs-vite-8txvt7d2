import React, { useMemo, useState } from 'react';
import { RiGridLine } from '@remixicon/react';

import { Card } from './components/Card/Card';
import { cx } from './utils/cx';
import {
  RANGOS,
  IMPLANTACIONES,
  UMBRAL_ATIPICA,
  rangoDe,
  normalizarNombre,
} from './utils/categoriasObras';

// Tablero de doble entrada: rango de potencia (filas) × implantación (columnas). Cada celda muestra el
// indicador elegido con formato condicional. Al tocar una celda se filtra el "Detalle de obras" de abajo.
const INDICADORES = [
  { id: 'hs', label: 'Hs MO / kWp', unidad: 'Hs MO / kWp', dec: 1, menosEsMejor: true },
  { id: 'dias', label: 'Días-hombre / kWp', unidad: 'días / kWp', dec: 2, menosEsMejor: true },
  { id: 'costo', label: 'Costo MO US$ / kWp', unidad: 'US$ / kWp', dec: 0, menosEsMejor: true },
  { id: 'obras', label: 'Cantidad de obras', unidad: 'obras', dec: 0, menosEsMejor: false },
  { id: 'kwp', label: 'kWp totales', unidad: 'kWp', dec: 0, menosEsMejor: false },
];
const MIN_OBRAS = 3;

const VERDE = '#95de1d';
const VERDE_CLARO = '#c7ee8a';
const AMARILLO = '#ffc933';
const NARANJA = '#ff9f4a';
const ROJO = '#ff5f5f';
const NEUTRO = '#8fc9e8';

const fmt = (n, d = 1) =>
  typeof n === 'number' && Number.isFinite(n)
    ? n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

const colorHs = (v) => (v <= 5 ? VERDE : v <= 8 ? VERDE_CLARO : v <= 12 ? AMARILLO : v <= 18 ? NARANJA : ROJO);

// Escala continua verde → amarillo → rojo para valores relativos (0 = mejor, 1 = peor).
const mezcla = (a, b, t) => {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const colorRelativo = (t) => (t < 0.5 ? mezcla(VERDE, AMARILLO, t * 2) : mezcla(AMARILLO, ROJO, (t - 0.5) * 2));

const colorDesvio = (pct) =>
  pct <= -15 ? VERDE : pct <= -5 ? VERDE_CLARO : pct < 5 ? NEUTRO : pct < 15 ? NARANJA : ROJO;

export default function BenchmarkObras({ obras, comparativa, desvios, onSeleccionar }) {
  const [indicador, setIndicador] = useState('hs');
  const [colorModo, setColorModo] = useState('valor');
  const [sinAtipicas, setSinAtipicas] = useState(false);

  const ind = INDICADORES.find((i) => i.id === indicador);
  const modo = ind.menosEsMejor ? colorModo : 'valor';

  const { celdas, filasTot, colsTot, total, categorias, excluidas, sinDato, impls } = useMemo(() => {
    // Datos económicos de Comparativa MO, cruzados por nombre de obra.
    const eco = new Map();
    (comparativa || []).forEach((r) => {
      eco.set(normalizarNombre(r.obra), {
        dias: Number(r.dias_reales) > 0 ? Number(r.dias_reales) : null,
        gasto: Number(r.gasto_mo_real_usd) > 0 ? Number(r.gasto_mo_real_usd) : null,
      });
    });

    const todas = (obras || [])
      .filter((o) => Number(o.kwp) > 0)
      .map((o) => {
        const e = eco.get(normalizarNombre(o.nombre)) || {};
        const hs = o.hs_mo_kwp !== null && o.hs_mo_kwp !== undefined && Number.isFinite(Number(o.hs_mo_kwp)) ? Number(o.hs_mo_kwp) : null;
        return { nombre: o.nombre, kwp: Number(o.kwp), hs, dias: e.dias ?? null, gasto: e.gasto ?? null, rango: rangoDe(Number(o.kwp)), impl: o.implantacion || '' };
      });
    const excl = sinAtipicas ? todas.filter((o) => o.hs !== null && o.hs > UMBRAL_ATIPICA) : [];
    const base = sinAtipicas ? todas.filter((o) => !(o.hs !== null && o.hs > UMBRAL_ATIPICA)) : todas;

    // Valor del indicador para un conjunto de obras: { v, n (obras que aportan dato), kwp, obras }
    const calc = (lista) => {
      const conDato =
        indicador === 'hs' ? lista.filter((o) => o.hs !== null)
          : indicador === 'dias' ? lista.filter((o) => o.dias !== null)
            : indicador === 'costo' ? lista.filter((o) => o.gasto !== null)
              : lista;
      const kwp = conDato.reduce((s, o) => s + o.kwp, 0);
      let v = null;
      if (conDato.length) {
        if (indicador === 'hs') v = conDato.reduce((s, o) => s + o.hs * o.kwp, 0) / kwp;
        else if (indicador === 'dias') v = conDato.reduce((s, o) => s + o.dias, 0) / kwp;
        else if (indicador === 'costo') v = conDato.reduce((s, o) => s + o.gasto, 0) / kwp;
        else if (indicador === 'obras') v = conDato.length;
        else v = kwp;
      }
      return { v, n: conDato.length, kwp, total: lista.length };
    };

    // Solo se muestran las implantaciones que tienen alguna obra.
    const impls = IMPLANTACIONES.filter((i) => base.some((o) => o.impl === i));
    const celdas = {};
    RANGOS.forEach((r) => {
      impls.forEach((i) => {
        celdas[r.id + '|' + i] = calc(base.filter((o) => o.rango.id === r.id && o.impl === i));
      });
    });
    const filasTot = {};
    RANGOS.forEach((r) => (filasTot[r.id] = calc(base.filter((o) => o.rango.id === r.id))));
    const colsTot = {};
    impls.forEach((i) => (colsTot[i] = calc(base.filter((o) => o.impl === i))));

    // Mejor y peor categoría (solo celdas con 3 obras o más que aporten dato).
    const cand = [];
    RANGOS.forEach((r) =>
      impls.forEach((i) => {
        const c = celdas[r.id + '|' + i];
        if (c.v !== null && c.n >= (ind.menosEsMejor ? MIN_OBRAS : 1)) cand.push({ ...c, nombre: `${i} · ${r.corto}` });
      })
    );
    cand.sort((a, b) => a.v - b.v);

    return {
      celdas,
      filasTot,
      colsTot,
      total: calc(base),
      categorias: cand,
      excluidas: excl,
      sinDato: todas.length - calc(base).n,
      impls,
    };
  }, [obras, comparativa, indicador, sinAtipicas, ind.menosEsMejor]);

  // Valores de las celdas con dato, para la escala de color relativa.
  const valores = Object.values(celdas).filter((c) => c.v !== null).map((c) => c.v);
  const vMin = valores.length ? Math.min(...valores) : 0;
  const vMax = valores.length ? Math.max(...valores) : 1;

  const estiloCelda = (c, fila, resaltar) => {
    if (c.v === null) return null;
    let color;
    let desv = null;
    if (modo === 'desvio' && ind.menosEsMejor && !resaltar) {
      const ref = filasTot[fila]?.v;
      desv = ref > 0 ? ((c.v - ref) / ref) * 100 : null;
      color = desv === null ? NEUTRO : colorDesvio(desv);
    } else if (indicador === 'hs') color = colorHs(c.v);
    else if (indicador === 'dias' || indicador === 'costo') color = colorRelativo(vMax > vMin ? (c.v - vMin) / (vMax - vMin) : 0);
    else color = mezcla('#4a7f8c', '#4fc3f7', vMax > 0 ? c.v / vMax : 0);
    return { color, desv };
  };

  const mejor = categorias[0];
  const peor = categorias[categorias.length - 1];
  const sobre = useMemo(() => {
    let n = 0, t = 0;
    (desvios || new Map()).forEach((d) => {
      if (d.pct === null) return;
      t += 1;
      if (d.pct >= 5) n += 1;
    });
    return { n, t };
  }, [desvios]);

  const grid = 'grid gap-2';
  const gridStyle = { gridTemplateColumns: `minmax(150px,1.3fr) repeat(${impls.length}, minmax(130px,1fr)) minmax(120px,0.9fr)` };

  const Celda = ({ c, fila, onClick, resaltar, titulo }) => {
    if (c.v === null)
      return (
        <div className="flex min-h-[92px] items-center justify-center rounded-xl border border-dashed border-white/10 text-2xl text-gray-600">—</div>
      );
    const st = estiloCelda(c, fila, resaltar) || { color: NEUTRO, desv: null };
    const pocas = ind.menosEsMejor && c.n < MIN_OBRAS;
    return (
      <button
        type="button"
        onClick={onClick}
        title={titulo}
        className={cx(
          'flex min-h-[92px] flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-transform hover:-translate-y-0.5 hover:brightness-110',
          pocas && 'opacity-70',
        )}
        style={{ background: st.color + (resaltar ? '30' : '22'), borderColor: st.color + (resaltar ? 'aa' : '66') }}
      >
        <span className="text-3xl font-extrabold leading-none tracking-tight xl:text-4xl" style={{ color: st.color }}>
          {fmt(c.v, ind.dec)}
        </span>
        {st.desv !== null && (
          <span className="mt-1 text-sm font-bold" style={{ color: st.color }}>
            {Math.abs(st.desv) < 5 ? '≈' : st.desv < 0 ? '▼' : '▲'} {fmt(Math.abs(st.desv), 0)} %
          </span>
        )}
        <span className="mt-1.5 text-xs font-medium text-gray-300">
          {indicador === 'kwp' || indicador === 'obras' ? `${c.total} ${c.total === 1 ? 'obra' : 'obras'}` : `${c.n} ${c.n === 1 ? 'obra' : 'obras'} · ${fmt(c.kwp, 0)} kWp`}
          {pocas && <span className="ml-1 rounded bg-white/10 px-1 text-[10px] text-gray-400">pocas</span>}
        </span>
      </button>
    );
  };

  const kpis = [
    {
      t: `Promedio general`,
      v: total.v !== null ? fmt(total.v, ind.dec) : '—',
      s: `${ind.unidad} · ${total.total} obras`,
      c: indicador === 'hs' && total.v !== null ? colorHs(total.v) : '#f4f8f8',
    },
    ind.menosEsMejor
      ? { t: 'Categoría más eficiente', v: mejor ? fmt(mejor.v, ind.dec) : '—', s: mejor ? `${mejor.nombre} · ${mejor.n} obras` : 'sin categorías con 3 obras o más', c: VERDE }
      : { t: 'Categoría con más', v: mejor ? fmt(categorias[categorias.length - 1].v, ind.dec) : '—', s: mejor ? categorias[categorias.length - 1].nombre : '', c: VERDE },
    ind.menosEsMejor
      ? { t: 'Categoría con más horas', v: peor ? fmt(peor.v, ind.dec) : '—', s: peor ? `${peor.nombre} · ${peor.n} obras` : 'sin categorías con 3 obras o más', c: ROJO }
      : { t: 'Categoría con menos', v: mejor ? fmt(mejor.v, ind.dec) : '—', s: mejor ? mejor.nombre : '', c: AMARILLO },
    { t: 'Obras por encima de su categoría', v: `${sobre.n} de ${sobre.t}`, s: 'más de 5 % de horas por kWp sobre el promedio de su categoría', c: AMARILLO },
  ];

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <RiGridLine className="size-4" aria-hidden="true" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Indicadores por rango de potencia e implantación
          </div>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
          <input type="checkbox" checked={sinAtipicas} onChange={(e) => setSinAtipicas(e.target.checked)} className="size-3.5 accent-[#95de1d]" />
          Excluir obras atípicas (más de {UMBRAL_ATIPICA} Hs MO/kWp)
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Indicador">
        {INDICADORES.map((i) => (
          <button
            key={i.id}
            type="button"
            role="tab"
            aria-selected={indicador === i.id}
            onClick={() => setIndicador(i.id)}
            className={cx(
              'rounded-full border px-4 py-1.5 text-sm font-bold transition-colors',
              indicador === i.id ? 'border-[#95de1d] bg-[#95de1d] text-gray-900' : 'border-gray-700 text-gray-300 hover:border-gray-500',
            )}
          >
            {i.label}
          </button>
        ))}
        {ind.menosEsMejor && (
          <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
            Colorear por
            {[
              ['valor', 'Valor'],
              ['desvio', 'Desvío vs. su rango'],
            ].map(([v, t]) => (
              <button
                key={v}
                type="button"
                onClick={() => setColorModo(v)}
                className={cx(
                  'rounded-full border px-3 py-0.5 font-semibold transition-colors',
                  colorModo === v ? 'border-[#4fc3f7] bg-[#4fc3f7]/20 text-[#4fc3f7]' : 'border-gray-700 text-gray-300 hover:border-gray-500',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.t} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{k.t}</div>
            <div className="mt-1 text-4xl font-extrabold tracking-tight" style={{ color: k.c }}>
              {k.v}
            </div>
            <div className="mt-0.5 text-xs text-gray-400">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto pb-1">
        <div style={{ minWidth: 220 + impls.length * 150 + 130 }}>
          <div className={cx(grid, 'mb-2 px-1')} style={gridStyle}>
            <div className="flex items-end text-xs font-semibold uppercase tracking-wider text-gray-500">Rango de potencia ↓ · Implantación →</div>
            {impls.map((i) => (
              <button key={i} type="button" onClick={() => onSeleccionar?.(null, i)} className="rounded-lg py-1 text-center text-base font-extrabold uppercase tracking-wide text-gray-100 hover:bg-white/10" title={`Ver las obras ${i} en el detalle`}>
                {i}
              </button>
            ))}
            <div className="flex items-end justify-center text-base font-extrabold uppercase tracking-wide text-gray-400">Todas</div>
          </div>

          {RANGOS.map((r) => (
            <div key={r.id} className={cx(grid, 'mb-2')} style={gridStyle}>
              <button type="button" onClick={() => onSeleccionar?.(r.label, null)} className="flex flex-col justify-center rounded-xl bg-white/5 px-3 text-left hover:bg-white/10" title={`Ver las obras ${r.corto} en el detalle`}>
                <span className="text-lg font-extrabold text-gray-50">{r.corto}</span>
                <span className="text-xs text-gray-400">{r.label.replace(/^[^(]*/, '').replace(/[()]/g, '')}</span>
              </button>
              {impls.map((i) => (
                <Celda key={i} c={celdas[r.id + '|' + i]} fila={r.id} onClick={() => onSeleccionar?.(r.label, i)} titulo={`${i} · ${r.label}: ver las obras en el detalle`} />
              ))}
              <Celda c={filasTot[r.id]} fila={r.id} resaltar onClick={() => onSeleccionar?.(r.label, null)} titulo={`Todas las obras ${r.corto}`} />
            </div>
          ))}

          <div className={cx(grid)} style={gridStyle}>
            <div className="flex items-center rounded-xl bg-white/5 px-3 text-lg font-extrabold text-gray-50">Todos los rangos</div>
            {impls.map((i) => (
              <Celda key={i} c={colsTot[i]} fila="__tot" resaltar onClick={() => onSeleccionar?.(null, i)} titulo={`Todas las obras ${i}`} />
            ))}
            <Celda c={total} fila="__tot" resaltar onClick={() => onSeleccionar?.(null, null)} titulo="Todas las obras (quita los filtros)" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-400">
        {modo === 'desvio' ? (
          [[VERDE, 'Mejor que su rango (−15 % o menos)'], [VERDE_CLARO, '−5 % a −15 %'], [NEUTRO, 'Parecido (±5 %)'], [NARANJA, '+5 % a +15 %'], [ROJO, 'Peor (+15 % o más)']].map(([c, t]) => (
            <span key={t} className="flex items-center gap-1.5"><span className="size-3 rounded" style={{ background: c }} />{t}</span>
          ))
        ) : indicador === 'hs' ? (
          [[VERDE, '≤ 5 Óptimo'], [VERDE_CLARO, '5–8 Bueno'], [AMARILLO, '8–12 Regular'], [NARANJA, '12–18 Alto'], [ROJO, '> 18 Crítico']].map(([c, t]) => (
            <span key={t} className="flex items-center gap-1.5"><span className="size-3 rounded" style={{ background: c }} />{t}</span>
          ))
        ) : ind.menosEsMejor ? (
          <span className="flex items-center gap-2">Menor <span className="h-3 w-32 rounded" style={{ background: `linear-gradient(90deg, ${VERDE}, ${AMARILLO}, ${ROJO})` }} /> Mayor (cada color es relativo a las demás celdas)</span>
        ) : (
          <span className="flex items-center gap-2">Menos <span className="h-3 w-32 rounded" style={{ background: 'linear-gradient(90deg, #4a7f8c, #4fc3f7)' }} /> Más</span>
        )}
        <span className="ml-auto text-gray-500">
          {ind.menosEsMejor ? 'Menos es mejor. ' : ''}Promedios ponderados por kWp. Tocá una celda para ver esas obras en el detalle de abajo.
          {sinAtipicas && excluidas.length > 0 && (
            <span className="ml-1 cursor-help text-[#ffc933]" title={excluidas.map((o) => `${o.nombre} (${fmt(o.hs, 1)})`).join(' · ')}>
              {excluidas.length} atípicas excluidas.
            </span>
          )}
          {sinDato > 0 && indicador !== 'obras' && indicador !== 'kwp' && <span className="ml-1">{sinDato} obras sin este dato no entran en el cálculo.</span>}
        </span>
      </div>
    </Card>
  );
}
