

import { useCallback } from "react";
import type * as echarts from "echarts/core";
import { EChart, type ChartTheme } from "./charts/EChart";
import { rgba } from "./charts/color";

const n = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });

function gauge(
  t: ChartTheme,
  value: number,
  max: number,
  bands: [number, string][],
  unit: string,
  decimals: number,
): echarts.EChartsCoreOption {
  const color = bands.find(([limit]) => value <= limit)?.[1] ?? bands[bands.length - 1][1];
  return {
    animationDuration: 700,
    series: [
      {
        type: "gauge",
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max,
        radius: "96%",
        center: ["50%", "58%"],
        pointer: { show: false },
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color } },
        axisLine: { roundCap: true, lineStyle: { width: 14, color: [[1, rgba(t.muted, 0.15)]] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: false,
          offsetCenter: [0, "4%"],
          fontSize: 26,
          fontWeight: 700,
          fontFamily: t.font,
          color: t.ink,
          formatter: (v: number) => `${n(v, decimals)}${unit}`,
        },
        data: [{ value: Math.min(value, max) }],
      },
    ],
  };
}

/** Indicadores del cable elegido: caída de tensión frente al límite y utilización I diseño / I_z. */
export function IndicatorsCard({
  duPct,
  duLimit,
  duSource,
  iDesign,
  iz,
}: {
  duPct: number;
  duLimit: number;
  duSource: string;
  iDesign: number;
  iz: number;
}) {
  const util = (iDesign / iz) * 100;
  const buildDu = useCallback(
    (t: ChartTheme) =>
      gauge(t, duPct, Math.max(duLimit * 1.5, duPct * 1.1), [[duLimit * 0.8, t.ok], [duLimit, t.warn], [Infinity, t.danger]], " %", 2),
    [duPct, duLimit],
  );
  const buildUtil = useCallback(
    (t: ChartTheme) => gauge(t, util, 110, [[85, t.ok], [100, t.warn], [Infinity, t.danger]], " %", 0),
    [util],
  );

  const cards = [
    {
      title: "Caída de tensión",
      build: buildDu,
      foot: `Límite ${n(duLimit, 1)} % · ${duSource}`,
      state: duPct <= duLimit ? (duPct <= duLimit * 0.8 ? "Holgada" : "Cerca del límite") : "Supera el límite",
      tone: duPct <= duLimit * 0.8 ? "ok" : duPct <= duLimit ? "warn" : "danger",
    },
    {
      title: "Utilización del cable",
      build: buildUtil,
      foot: `I diseño / I_z = ${n(iDesign)} / ${n(iz)} A`,
      state: util <= 85 ? "Con margen" : util <= 100 ? "Margen reducido" : "Sobrecargado",
      tone: util <= 85 ? "ok" : util <= 100 ? "warn" : "danger",
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <div key={c.title} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">{c.title}</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                c.tone === "ok" ? "bg-ok/15 text-ok" : c.tone === "warn" ? "bg-warn/20 text-warn-ink" : "bg-danger/15 text-danger-ink"
              }`}
            >
              {c.state}
            </span>
          </div>
          <EChart build={c.build} height={150} ariaLabel={`${c.title}: indicador`} />
          <p className="-mt-2 text-center text-[12px] text-muted">{c.foot}</p>
        </div>
      ))}
    </section>
  );
}
