import React, { useMemo, useState } from 'react';
import { RiArrowDownSLine, RiArrowRightSLine, RiBarChartGroupedLine } from '@remixicon/react';

import { Card } from './components/Card/Card';
import { cx } from './utils/cx';

// Comparación del indicador Hs MO / kWp por grupo de obras (rango de potencia o implantación)
// contra el promedio de su propio grupo. Los rangos son los mismos del resto del tablero.
const RANGOS = [
  { id: 'micro', label: 'Micro (1–4 kWp)', max: 4 },
  { id: 'pequena', label: 'Pequeña (5–12 kWp)', max: 12 },
  { id: 'mediana', label: 'Mediana (13–40 kWp)', max: 40 },
  { id: 'grande', label: 'Grande (41–99 kWp)', max: 99 },
  { id: 'muy_grande', label: 'Muy grande (100–300 kWp)', max: 300 },
  { id: 'parque', label: 'Parque solar (>300 kWp)', max: Infinity },
];
const IMPLANTACIONES = ['En techo', 'En suelo', 'Cochera Solar', 'Residencial'];
const SIN_IMPL = 'Sin implantación cargada';

// Las obras "Alto" o "Crítico" (más de 12 Hs MO/kWp) se pueden dejar afuera, igual que en el Estimador.
const UMBRAL_ATIPICA = 12;
const MIN_OBRAS = 3;

const rangoDe = (kwp) => RANGOS.find((r) => kwp <= r.max) || RANGOS[RANGOS.length - 1];

const colorHs = (v) =>
  v <= 5 ? '#95de1d' : v <= 8 ? '#c7ee8a' : v <= 12 ? '#ffc933' : v <= 18 ? '#ff9f4a' : '#ff5f5f';

const fmt = (n, d = 1) =>
  typeof n === 'number' && Number.isFinite(n)
    ? n.toLocaleString('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '—';

const mediana = (valores) => {
  const v = [...valores].sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
};

// Promedio ponderado por kWp (equivale a horas totales sobre kWp totales).
const estadisticas = (lista) => {
  const kwp = lista.reduce((s, o) => s + o.kwp, 0);
  const hs = lista.map((o) => o.hs);
  return {
    n: lista.length,
    kwp,
    prom: kwp > 0 ? lista.reduce((s, o) => s + o.hs * o.kwp, 0) / kwp : null,
    mediana: mediana(hs),
    mejor: hs.length ? Math.min(...hs) : null,
    peor: hs.length ? Math.max(...hs) : null,
  };
};

/** Desvío porcentual de "valor" respecto de "ref" (positivo = más horas por kWp = peor). */
const desvio = (valor, ref) => (ref > 0 ? ((valor - ref) / ref) * 100 : null);

function Chip({ pct, neutro }) {
  if (pct === null || pct === undefined) return <span className="text-gray-500">—</span>;
  const cercano = Math.abs(pct) < 5;
  // neutro: la diferencia contra "todas las obras" mezcla el efecto del tamaño, no se pinta de bueno/malo
  const color = cercano || neutro ? (neutro ? '#8fc9e8' : '#b9c7c9') : pct < 0 ? '#95de1d' : '#ff7b7b';
  return (
    <span
      className="inline-block whitespace-nowrap rounded px-1.5 py-0.5 text-xs font-bold"
      style={{ color, background: color + '1f' }}
    >
      {cercano ? '≈ ' : pct < 0 ? '▼ ' : '▲ '}
      {fmt(Math.abs(pct), 0)} %
    </span>
  );
}

export default function BenchmarkObras({ obras }) {
  const [criterio, setCriterio] = useState('rango');
  const [sinAtipicas, setSinAtipicas] = useState(false);
  const [abierto, setAbierto] = useState(null);

  const { filas, total, excluidas, sinDato } = useMemo(() => {
    const conDato = (obras || [])
      .filter((o) => o.hs_mo_kwp !== null && o.hs_mo_kwp !== undefined && Number(o.kwp) > 0 && Number.isFinite(Number(o.hs_mo_kwp)))
      .map((o) => ({
        nombre: o.nombre,
        kwp: Number(o.kwp),
        hs: Number(o.hs_mo_kwp),
        rango: rangoDe(Number(o.kwp)),
        impl: o.implantacion || SIN_IMPL,
      }));
    const excl = sinAtipicas ? conDato.filter((o) => o.hs > UMBRAL_ATIPICA) : [];
    const base = sinAtipicas ? conDato.filter((o) => o.hs <= UMBRAL_ATIPICA) : conDato;

    const grupos =
      criterio === 'rango'
        ? RANGOS.map((r) => ({ id: r.id, etiqueta: r.label, lista: base.filter((o) => o.rango.id === r.id) }))
        : [...IMPLANTACIONES, SIN_IMPL].map((i) => ({ id: i, etiqueta: i, lista: base.filter((o) => o.impl === i) }));

    const totalStats = estadisticas(base);
    return {
      filas: grupos
        .filter((g) => g.lista.length > 0)
        .map((g) => {
          const st = estadisticas(g.lista);
          return {
            ...g,
            st,
            vsGeneral: desvio(st.prom, totalStats.prom),
            obras: [...g.lista]
              .sort((a, b) => a.hs - b.hs)
              .map((o) => ({ ...o, vsGrupo: desvio(o.hs, st.prom) })),
          };
        }),
      total: totalStats,
      excluidas: excl,
      sinDato: (obras || []).length - conDato.length,
    };
  }, [obras, criterio, sinAtipicas]);

  const cols = 'grid grid-cols-[minmax(170px,2fr)_60px_80px_minmax(110px,1.2fr)_80px_80px_80px_100px] items-center gap-x-3';

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            <RiBarChartGroupedLine className="size-4" aria-hidden="true" />
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
            Hs MO / kWp por grupo de obras — comparación con el promedio
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5" role="tablist" aria-label="Agrupar por">
            {[
              ['rango', 'Por rango de potencia'],
              ['implantacion', 'Por implantación'],
            ].map(([v, t]) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={criterio === v}
                onClick={() => {
                  setCriterio(v);
                  setAbierto(null);
                }}
                className={cx(
                  'rounded-full border px-3 py-0.5 text-xs font-semibold transition-colors',
                  criterio === v
                    ? 'border-[#95de1d] bg-[#95de1d] text-gray-900'
                    : 'border-gray-700 text-gray-300 hover:border-gray-500',
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-300">
            <input
              type="checkbox"
              checked={sinAtipicas}
              onChange={(e) => setSinAtipicas(e.target.checked)}
              className="size-3.5 accent-[#95de1d]"
            />
            Excluir obras atípicas (más de {UMBRAL_ATIPICA} Hs MO/kWp)
          </label>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-gray-500">
        El promedio es ponderado por kWp. Cada obra se compara contra el promedio de <b className="text-gray-300">su propio grupo</b>:
        las obras chicas necesitan más horas por kWp que los parques, así que comparar contra el promedio de todas mezcla
        el efecto del tamaño. Menos Hs MO/kWp es mejor.
        {sinAtipicas && excluidas.length > 0 && (
          <span title={excluidas.map((o) => `${o.nombre} (${fmt(o.hs, 1)})`).join(' · ')} className="ml-1 cursor-help text-[#ffc933]">
            Se excluyeron {excluidas.length} obras atípicas (pasá el cursor para ver cuáles).
          </span>
        )}
        {sinDato > 0 && <span className="ml-1">{sinDato} obras sin indicador no entran en el cálculo.</span>}
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className={cx(cols, 'border-b border-white/10 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500')}>
            <span>{criterio === 'rango' ? 'Rango de potencia' : 'Implantación'}</span>
            <span className="text-right">Obras</span>
            <span className="text-right">kWp</span>
            <span>Promedio (pond.)</span>
            <span className="text-right">Mediana</span>
            <span className="text-right">Mejor</span>
            <span className="text-right">Peor</span>
            <span className="text-right" title="Promedio del grupo contra el promedio de todas las obras (refleja sobre todo el efecto del tamaño)">
              vs. todas
            </span>
          </div>

          {filas.map((f) => {
            const abierta = abierto === f.id;
            const pocas = f.st.n < MIN_OBRAS;
            return (
              <div key={f.id} className="border-b border-white/5">
                <button
                  type="button"
                  onClick={() => setAbierto(abierta ? null : f.id)}
                  aria-expanded={abierta}
                  className={cx(cols, 'w-full px-2 py-2.5 text-left transition-colors hover:bg-white/5', pocas && 'opacity-70')}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-50">
                    {abierta ? (
                      <RiArrowDownSLine className="size-4 shrink-0 text-[#95de1d]" aria-hidden="true" />
                    ) : (
                      <RiArrowRightSLine className="size-4 shrink-0 text-gray-500" aria-hidden="true" />
                    )}
                    {f.etiqueta}
                    {pocas && (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400" title="Con menos de 3 obras el promedio es poco confiable">
                        pocas obras
                      </span>
                    )}
                  </span>
                  <span className="text-right text-sm text-gray-300">{f.st.n}</span>
                  <span className="text-right text-sm text-gray-300">{fmt(f.st.kwp, 0)}</span>
                  <span className="flex items-center gap-2">
                    <span className="h-2 flex-1 rounded-full bg-gray-800">
                      <span
                        className="block h-2 rounded-full"
                        style={{ width: `${Math.min((f.st.prom / 20) * 100, 100)}%`, background: colorHs(f.st.prom) }}
                      />
                    </span>
                    <span className="w-10 text-right text-sm font-bold" style={{ color: colorHs(f.st.prom) }}>
                      {fmt(f.st.prom, 1)}
                    </span>
                  </span>
                  <span className="text-right text-sm text-gray-300">{fmt(f.st.mediana, 1)}</span>
                  <span className="text-right text-sm text-gray-300">{fmt(f.st.mejor, 1)}</span>
                  <span className="text-right text-sm text-gray-300">{fmt(f.st.peor, 1)}</span>
                  <span className="text-right">
                    <Chip pct={f.vsGeneral} neutro />
                  </span>
                </button>

                {abierta && (
                  <div className="mb-2 ml-6 mr-2 rounded-lg bg-black/20 p-2.5">
                    <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                      Obras del grupo, de mejor a peor, contra el promedio del grupo ({fmt(f.st.prom, 2)} Hs MO/kWp)
                    </div>
                    {f.obras.map((o) => (
                      <div
                        key={o.nombre}
                        className="grid grid-cols-[minmax(160px,2fr)_70px_minmax(120px,1.5fr)_80px_90px] items-center gap-x-3 rounded px-1 py-1 text-sm hover:bg-white/5"
                      >
                        <span className="truncate text-gray-100" title={o.nombre}>
                          {o.nombre}
                        </span>
                        <span className="text-right text-xs text-gray-400">{fmt(o.kwp, 1)} kWp</span>
                        <span className="text-xs text-gray-500">
                          {criterio === 'rango' ? o.impl : o.rango.label}
                        </span>
                        <span className="text-right font-bold" style={{ color: colorHs(o.hs) }}>
                          {fmt(o.hs, 2)}
                        </span>
                        <span className="text-right">
                          <Chip pct={o.vsGrupo} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {total.n > 0 && (
            <div className={cx(cols, 'px-2 py-2.5 text-sm font-bold text-gray-50')}>
              <span className="pl-5">Todas las obras</span>
              <span className="text-right">{total.n}</span>
              <span className="text-right">{fmt(total.kwp, 0)}</span>
              <span className="flex items-center gap-2">
                <span className="h-2 flex-1 rounded-full bg-gray-800">
                  <span
                    className="block h-2 rounded-full"
                    style={{ width: `${Math.min((total.prom / 20) * 100, 100)}%`, background: colorHs(total.prom) }}
                  />
                </span>
                <span className="w-10 text-right" style={{ color: colorHs(total.prom) }}>
                  {fmt(total.prom, 1)}
                </span>
              </span>
              <span className="text-right">{fmt(total.mediana, 1)}</span>
              <span className="text-right">{fmt(total.mejor, 1)}</span>
              <span className="text-right">{fmt(total.peor, 1)}</span>
              <span className="text-right text-xs font-normal text-gray-500">referencia</span>
            </div>
          )}
          {total.n === 0 && <div className="py-8 text-center text-sm text-gray-500">No hay obras con indicador para comparar.</div>}
        </div>
      </div>
    </Card>
  );
}
