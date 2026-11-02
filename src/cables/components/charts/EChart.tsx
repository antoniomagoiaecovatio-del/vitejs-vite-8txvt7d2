

import { useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, GaugeChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { SVGRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  GaugeChart,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  SVGRenderer,
]);

/** Colores del tema leídos de las variables CSS (se actualizan al cambiar claro/oscuro). */
export interface ChartTheme {
  series1: string;
  series2: string;
  series3: string;
  ink: string;
  ink2: string;
  muted: string;
  line: string;
  surface: string;
  field: string;
  ok: string;
  warn: string;
  danger: string;
  font: string;
}

function readTheme(): ChartTheme {
  const cs = getComputedStyle(document.querySelector(".cables-root") ?? document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  return {
    series1: v("--series-1"),
    series2: v("--series-2"),
    series3: v("--series-3"),
    ink: v("--ink"),
    ink2: v("--ink-2"),
    muted: v("--muted"),
    line: v("--line"),
    surface: v("--surface"),
    field: v("--field"),
    ok: v("--ok"),
    warn: v("--warn"),
    danger: v("--danger"),
    font: getComputedStyle(document.body).fontFamily,
  };
}

function useChartTheme(): ChartTheme | null {
  const [theme, setTheme] = useState<ChartTheme | null>(null);
  useEffect(() => {
    const update = () => setTheme(readTheme());
    update();
    return () => {};
  }, []);
  return theme;
}

/**
 * Gráfico Apache ECharts (renderer SVG, modular).
 * `build` recibe los colores del tema y devuelve la opción de ECharts.
 */
export function EChart({
  build,
  height,
  ariaLabel,
}: {
  build: (t: ChartTheme) => echarts.EChartsCoreOption;
  height: number;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const theme = useChartTheme();

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current, undefined, { renderer: "svg" });
    chart.current = c;
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (!chart.current || !theme) return;
    chart.current.setOption(build(theme), { notMerge: true });
  }, [build, theme]);

  return <div ref={ref} role="img" aria-label={ariaLabel} style={{ width: "100%", height }} />;
}
