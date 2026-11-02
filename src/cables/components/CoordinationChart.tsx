

import { useCallback, useState } from "react";
import type * as echarts from "echarts/core";
import type { FamilyResult } from "../lib/engine/types";
import { EChart, type ChartTheme } from "./charts/EChart";
import { rgba } from "./charts/color";

const n = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const sec = (s: number) => n(s, s % 1 ? 1 : 0);

const NAMES = {
  iz: "I_z corregida",
  prot: "Termomagnética (rango de I_n)",
  id: "I diseño",
} as const;

/**
 * Gráfico de áreas por sección comercial (Apache ECharts):
 * I_z corregida de cada sección · rango admisible de la protección para el cable elegido · I diseño.
 */
export function CoordinationChart({ r, iDesign, isDC }: { r: FamilyResult; iDesign: number; isDC: boolean }) {
  const [table, setTable] = useState(false);
  const f = r.final;
  // Secciones a mostrar: la mayor que no cumple, la mínima que cumple y la inmediata superior
  // (más la elegida por el usuario, si es otra).
  const fi = f ? Math.max(0, r.curve.findIndex((c) => c.section === f.section)) : 0;
  const iMin = r.sCalc !== null ? r.curve.findIndex((c) => c.section === r.sCalc) : fi;
  const idx = [...new Set([iMin - 1, iMin, iMin + 1, fi])].filter((i) => i >= 0 && i < r.curve.length).sort((a, b) => a - b);
  const pts = idx.map((i) => r.curve[i]);
  const sel = pts.findIndex((p) => f && p.section === f.section);
  const role = (i: number) =>
    idx[i] < iMin ? "No cumple" : idx[i] === iMin ? "Mínima" : idx[i] === fi ? "Elegida" : "Superior";
  const pMin = r.protection?.rangeMin ?? null;
  const pMax = r.protection?.rangeMax ?? null;
  const hasProt = pMin !== null && pMax !== null;
  const protName = isDC ? "Fusible gPV (rango de I_n)" : NAMES.prot;
  const ptsKey = pts.map((p) => `${p.section}:${p.iz}:${p.ok}`).join("|");

  const build = useCallback(
    (t: ChartTheme): echarts.EChartsCoreOption => {
      const cats = pts.map((p) => sec(p.section));
      const text = { color: t.muted, fontFamily: t.font, fontSize: 11 };

      return {
        animationDuration: 600,
        animationEasing: "cubicOut",
        textStyle: { fontFamily: t.font },
        grid: { left: 56, right: 28, top: 58, bottom: 64 },
        legend: {
          top: 0,
          left: 0,
          icon: "roundRect",
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 18,
          textStyle: { color: t.ink2, fontSize: 12, fontFamily: t.font },
          data: [NAMES.iz, ...(hasProt ? [protName] : []), NAMES.id],
          itemStyle: { opacity: 0.75 },
        },
        tooltip: {
          trigger: "axis",
          backgroundColor: t.surface,
          borderColor: t.line,
          borderWidth: 1,
          padding: [10, 12],
          textStyle: { color: t.ink, fontSize: 12, fontFamily: t.font },
          extraCssText: "border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.12);",
          axisPointer: { type: "line", lineStyle: { color: t.ink2, width: 1, opacity: 0.5 } },
          formatter: (params: unknown) => {
            const i = (params as { dataIndex: number }[])[0]?.dataIndex ?? 0;
            const p = pts[i];
            const good = p.ok;
            const ampOk = p.iz >= iDesign - 1e-9;
            const dot = (c: string) =>
              `<span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${c};margin-right:6px"></span>`;
            const row = (c: string, k: string, v: string) =>
              `<div style="display:flex;justify-content:space-between;gap:16px"><span>${dot(c)}${k}</span><b>${v}</b></div>`;
            return (
              `<div style="font-weight:600;margin-bottom:6px">${sec(p.section)} mm² · ${role(i).toLowerCase()}</div>` +
              row(t.series1, "I_z corregida", `${n(p.iz)} A`) +
              row(t.series2, isDC ? "Rango fusible" : "Rango I_n", ampOk ? `${n(iDesign, 1)}–${n(p.iz, 1)} A` : "—") +
              row(t.series3, "I diseño", `${n(iDesign)} A`) +
              row(t.muted, "Caída de tensión", `${n(p.duPct, 2)} %`) +
              `<div style="margin-top:6px;font-weight:600;color:${good ? t.ok : t.danger}">${
                good ? "✓ Cumple todos los criterios" : `✗ ${p.fail}`
              }</div>`
            );
          },
        },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: cats,
          name: "Sección del conductor",
          nameLocation: "middle",
          nameGap: 44,
          nameTextStyle: text,
          axisLine: { lineStyle: { color: t.line } },
          axisTick: { show: false },
          axisLabel: {
            interval: 0,
            fontFamily: t.font,
            lineHeight: 16,
            formatter: (v: string, i: number) => `{s|${v} mm²}\n{${pts[i].ok ? "ok" : "no"}|${role(i)}}`,
            rich: {
              s: { fontSize: 13, fontWeight: 700, color: t.ink, fontFamily: t.font },
              ok: { fontSize: 11, color: t.ok, fontFamily: t.font },
              no: { fontSize: 11, color: t.danger, fontFamily: t.font },
            },
          },
        },
        yAxis: {
          type: "value",
          // Escala ajustada a los valores (no desde 0) para que se vea la diferencia entre I diseño, I_n e I_z.
          min: (v: { min: number }) => Math.max(0, Math.floor((Math.min(v.min, iDesign) * 0.8) / 10) * 10),
          name: "Corriente (A)",
          nameTextStyle: { ...text, align: "left" },
          axisLabel: text,
          splitLine: { lineStyle: { color: t.line, type: "dashed" } },
        },
        series: [
          // 1) I_z corregida de cada sección: área azul traslúcida (atrás)
          {
            name: NAMES.iz,
            type: "line",
            data: pts.map((p) => +p.iz.toFixed(1)),
            symbol: "circle",
            symbolSize: 1,
            showSymbol: true,
            itemStyle: { color: "transparent" },
            lineStyle: { width: 0 },
            areaStyle: { color: rgba(t.series1, 0.28) },
            z: 1,
            label: {
              show: true,
              position: "top",
              distance: 6,
              formatter: (d: { value: number }) => `I_z ${n(d.value, 0)} A`,
              color: t.series1,
              fontWeight: 700,
              fontSize: 12,
              fontFamily: t.font,
            },
            markLine:
              sel >= 0
                ? {
                    silent: true,
                    symbol: "none",
                    lineStyle: { color: t.muted, type: "dashed", width: 1 },
                    label: { show: false },
                    data: [{ xAxis: cats[sel] }],
                  }
                : undefined,
          },
          // 2) Rango admisible de la protección: franja naranja traslúcida (I diseño → I_z del cable elegido)
          ...(hasProt
            ? [
                {
                  name: "_base",
                  type: "line",
                  stack: "prot",
                  data: pts.map(() => pMin),
                  symbol: "none",
                  lineStyle: { width: 0 },
                  silent: true,
                  z: 2,
                },
                {
                  name: protName,
                  type: "line",
                  stack: "prot",
                  data: pts.map(() => +(pMax! - pMin!).toFixed(1)),
                  symbol: "none",
                  lineStyle: { width: 0 },
                  itemStyle: { color: t.series2 },
                  areaStyle: { color: rgba(t.series2, 0.38) },
                  z: 2,
                  silent: true,
                },
              ]
            : []),
          // 3) I diseño: área verde traslúcida (adelante)
          {
            name: NAMES.id,
            type: "line",
            data: pts.map(() => +iDesign.toFixed(1)),
            symbol: "none",
            lineStyle: { width: 0 },
            itemStyle: { color: t.series3 },
            areaStyle: { color: rgba(t.series3, 0.4) },
            z: 3,
            silent: true,
          },
        ],
      };
    },
    // ptsKey resume los puntos: evita recrear la opción en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ptsKey, sel, iDesign, hasProt, pMin, pMax, protName, isDC],
  );

  if (!f || r.curve.length === 0) return null;
  const coordOk = f.iz >= iDesign - 1e-9 && (!hasProt || (pMin! <= pMax! + 1e-9 && pMax! <= f.iz + 1e-9));

  const tiles = [
    { k: "id", label: NAMES.id, value: `${n(iDesign)} A`, color: "var(--series-3)", sub: isDC ? "1,25 · N · I_sc CEN" : "Corriente del circuito" },
    ...(hasProt
      ? [
          {
            k: "prot",
            label: isDC ? "Fusible gPV (I_n)" : "Termomagnética I_n",
            value: `${n(pMin!)} – ${n(pMax!)} A`,
            color: "var(--series-2)",
            sub: "Rango admisible para este cable",
          },
        ]
      : []),
    {
      k: "iz",
      label: NAMES.iz,
      value: `${n(f.iz)} A`,
      color: "var(--series-1)",
      sub: `+${n(((f.iz - iDesign) / iDesign) * 100)} % sobre I diseño`,
    },
  ];

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Coordinación por sección del conductor</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            Sección elegida: <b className="text-ink">{sec(f.section)} mm²</b>
          </p>
        </div>
        <div className="flex rounded-lg border border-line bg-field p-0.5 text-[12px]" role="tablist">
          {(["Gráfico", "Tabla"] as const).map((label) => {
            const active = (label === "Tabla") === table;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTable(label === "Tabla")}
                className={`rounded-md px-3 py-1 font-medium transition ${active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        {tiles.map((t, i) => (
          <div key={t.k} className="contents">
            {i > 0 && (
              <div className="grid shrink-0 place-items-center self-center" aria-hidden>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-field text-lg font-bold text-ink-2 ring-1 ring-line">
                  ≤
                </span>
              </div>
            )}
            <div
              className="relative flex-1 overflow-hidden rounded-xl border px-4 py-3"
              style={{ borderColor: `color-mix(in oklab, ${t.color} 45%, transparent)`, background: `color-mix(in oklab, ${t.color} 12%, transparent)` }}
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.color }}>
                {t.label}
              </div>
              <div className="mt-0.5 whitespace-nowrap text-lg font-semibold tabular-nums text-ink sm:text-xl">{t.value}</div>
              <div className="text-[11px] text-muted">{t.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px]">
        <span
          className={`rounded-full px-2.5 py-1 font-semibold ${coordOk ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger-ink"}`}
        >
          {coordOk ? "✓" : "✗"} {isDC ? "I_z ≥ I diseño" : "I diseño ≤ I_n ≤ I_z"}
        </span>
        <span className="text-muted">
          {isDC
            ? "El cable debe admitir la corriente de diseño del tramo de CC."
            : "La termomagnética debe elegirse dentro de la franja naranja: por encima de la corriente de diseño y por debajo de la ampacidad del cable."}
        </span>
      </div>

      {table ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-medium">Sección</th>
                <th className="px-2 text-right font-medium">I diseño</th>
                <th className="px-2 text-right font-medium">Rango I_n</th>
                <th className="px-2 text-right font-medium">I_z</th>
                <th className="px-2 text-right font-medium">ΔU</th>
                <th className="pl-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {pts.map((p, i) => (
                <tr key={p.section} className={`border-b border-line/60 ${i === sel ? "bg-accent/10 font-semibold" : ""}`}>
                  <td className="py-2 pr-2">
                    {sec(p.section)} mm² <span className="text-[11px] font-normal text-muted">({role(i)})</span>
                  </td>
                  <td className="px-2 text-right">{n(iDesign)} A</td>
                  <td className="px-2 text-right">{p.iz >= iDesign ? `${n(iDesign, 1)}–${n(p.iz, 1)} A` : "—"}</td>
                  <td className="px-2 text-right">{n(p.iz)} A</td>
                  <td className="px-2 text-right">{n(p.duPct, 2)} %</td>
                  <td className={`pl-2 ${p.ok ? "text-ok" : "text-danger"}`}>{p.ok ? "Cumple" : p.fail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4">
          <EChart build={build} height={360} ariaLabel="Gráfico de áreas: I_z, rango de la protección e I diseño por sección" />
        </div>
      )}

      <p className="mt-2 text-[12px] leading-snug text-muted">
        {isDC
          ? "La curva de I_z debe quedar por encima de la corriente de diseño del tramo de CC."
          : "Se muestran la mayor sección que no cumple, la mínima que cumple y la inmediata superior. Banda naranja: rango admisible de I_n para el cable elegido (AEA 90364-4-43)."}
      </p>
    </section>
  );
}
