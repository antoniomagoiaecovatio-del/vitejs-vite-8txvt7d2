

import { useCallback, useEffect, useMemo, useState } from "react";
import type * as echarts from "echarts/core";
import { compareCosts, secKey, type PriceTable, type SectionPrices, type Tramo } from "../lib/engine/costs";
import type { AcFamilyId, Material } from "../lib/data/types";
import type { CalcInputs, Routing } from "../lib/engine/types";
import { REFERENCE_SOURCE, referencePrice, type PriceKind } from "../lib/data/referencePrices";
import { EChart, type ChartTheme } from "./charts/EChart";
import { rgba } from "./charts/color";

const n = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const money = (v: number) => `$ ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const mm = (s: number | null) => (s === null ? "—" : `${n(s, s % 1 ? 1 : 0)} mm²`);

const ROUTINGS: { value: Routing; label: string }[] = [
  { value: "cano", label: "Caño embutido o a la vista" },
  { value: "bandeja_perforada", label: "Bandeja perforada" },
  { value: "bandeja_escalera", label: "Bandeja escalera / canasta" },
  { value: "bandeja_ciega", label: "Bandeja no perforada / pared" },
  { value: "cano_enterrado", label: "Caño enterrado" },
  { value: "enterrado", label: "Directamente enterrado" },
];

const PRICES_KEY = "cost-prices-v1";
const MAT_LABEL: Record<Material, string> = { Cu: "Cobre", Al: "Aluminio" };

const inputCls =
  "w-full rounded-lg border border-line bg-field px-2.5 py-1.5 text-sm text-ink tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

function PriceInput({
  value,
  onChange,
  disabled,
  estimated,
}: {
  value?: number;
  onChange: (v?: number) => void;
  disabled?: boolean;
  estimated?: boolean;
}) {
  const [text, setText] = useState(value ? String(+value.toFixed(4)).replace(".", ",") : "");
  return (
    <input
      inputMode="decimal"
      disabled={disabled}
      placeholder={disabled ? "—" : "0,00"}
      title={estimated ? "Precio estimado (interpolado a partir de la tabla de referencia)" : undefined}
      className={`${inputCls} text-right disabled:opacity-40 ${estimated ? "border-dashed italic text-warn-ink" : ""}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const v = Number(e.target.value.replace(",", ".").trim());
        onChange(Number.isFinite(v) && v > 0 ? v : undefined);
      }}
    />
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[12.5px] text-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Pestaña de comparación económica cobre / aluminio por tramos. */
export function CostComparison({ inputs }: { inputs: CalcInputs }) {
  const [tramos, setTramos] = useState<Tramo[]>([
    { id: "t1", name: "Inversor → Termomagnética / compacta", lengthM: 20, routing: "bandeja_perforada" },
    { id: "t2", name: "Termomagnética → Inyección", lengthM: 80, routing: "enterrado" },
  ]);
  const [poles, setPoles] = useState<3 | 4>(inputs.withNeutral ? 4 : 3);
  const [family, setFamily] = useState<AcFamilyId>(inputs.family === "pvc" ? "pvc" : "xlpe");
  const [prices, setPrices] = useState<PriceTable>(() => {
    try {
      return JSON.parse(localStorage.getItem(PRICES_KEY) ?? "{}") as PriceTable;
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
    } catch {
      /* almacenamiento no disponible: los precios valen solo para esta sesión */
    }
  }, [prices]);

  // Cambia al cargar precios de referencia para remontar los campos con los valores nuevos.
  const [priceVersion, setPriceVersion] = useState(0);
  const res = useMemo(
    () => compareCosts(inputs, { tramos, poles, family, prices }),
    [inputs, tramos, poles, family, prices],
  );

  /** Completa los precios de las secciones necesarias con la tabla de referencia (USD). */
  const loadReference = (overwrite: boolean) => {
    setPrices((prev) => {
      const next: PriceTable = { ...prev };
      for (const { section, materials } of res.sectionsNeeded) {
        const k = secKey(section);
        const row: SectionPrices = { ...next[k], estimated: { ...next[k]?.estimated } };
        const fields: PriceKind[] = [
          ...(materials.includes("Cu") ? (["cableCu", "termCu"] as PriceKind[]) : []),
          ...(materials.includes("Al") ? (["cableAl", "termAl"] as PriceKind[]) : []),
        ];
        for (const f of fields) {
          if (!overwrite && row[f]) continue;
          const ref = referencePrice(f, section);
          if (!ref) continue;
          row[f] = +ref.value.toFixed(4);
          row.estimated![f] = ref.estimated;
        }
        next[k] = row;
      }
      return next;
    });
    setPriceVersion((v) => v + 1);
  };

  const updTramo = (id: string, patch: Partial<Tramo>) =>
    setTramos((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const setPrice = (section: number, field: PriceKind, v?: number) =>
    setPrices((p) => {
      const row = p[secKey(section)] ?? {};
      // Un precio cargado a mano deja de ser estimado.
      return { ...p, [secKey(section)]: { ...row, [field]: v, estimated: { ...row.estimated, [field]: false } } };
    });

  const cuCu = res.scenarios.find((s) => s.materials.every((m) => m === "Cu"));
  const ranked = res.scenarios.filter((s) => s.feasible);
  const anyMissing = ranked.some((s) => !s.complete);

  const build = useCallback(
    (t: ChartTheme): echarts.EChartsCoreOption => {
      const rows = [...ranked].reverse();
      return {
        animationDuration: 500,
        textStyle: { fontFamily: t.font },
        grid: { left: 8, right: 90, top: 34, bottom: 8, containLabel: true },
        legend: {
          top: 0,
          left: 0,
          icon: "roundRect",
          itemWidth: 12,
          itemHeight: 12,
          textStyle: { color: t.ink2, fontSize: 12, fontFamily: t.font },
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: t.surface,
          borderColor: t.line,
          textStyle: { color: t.ink, fontSize: 12, fontFamily: t.font },
          valueFormatter: (v: number) => money(v),
        },
        xAxis: {
          type: "value",
          axisLabel: { color: t.muted, fontSize: 11, formatter: (v: number) => `$ ${v.toLocaleString("es-AR")}` },
          splitLine: { lineStyle: { color: t.line, type: "dashed" } },
        },
        yAxis: {
          type: "category",
          data: rows.map((s) => s.materials.map((m) => m).join(" · ")),
          axisLabel: { color: t.ink, fontWeight: 600, fontSize: 12, fontFamily: t.font },
          axisLine: { lineStyle: { color: t.line } },
          axisTick: { show: false },
        },
        series: [
          {
            name: "Cable",
            type: "bar",
            stack: "total",
            barWidth: 22,
            data: rows.map((s) => +s.cableCost.toFixed(2)),
            itemStyle: { color: rgba(t.series1, 0.85), borderRadius: [4, 0, 0, 4] },
          },
          {
            name: "Terminales",
            type: "bar",
            stack: "total",
            data: rows.map((s) => ({
              value: +s.terminalCost.toFixed(2),
              label: {
                show: true,
                position: "right",
                formatter: () => money(s.total),
                color: s === res.cheapest ? t.ok : t.ink2,
                fontWeight: 700,
                fontSize: 12,
              },
            })),
            itemStyle: { color: rgba(t.series2, 0.85), borderRadius: [0, 4, 4, 0] },
          },
        ],
      };
    },
    [ranked, res.cheapest],
  );

  return (
    <div className="space-y-4">
      <Card
        title="Tramos del circuito"
        subtitle="Cada tramo se dimensiona en cobre y en aluminio con los datos eléctricos del panel izquierdo (corriente, tensión, ambiente, agrupamiento)."
      >
        <div className="space-y-2">
          {tramos.map((t, i) => (
            <div key={t.id} className="grid items-end gap-2 rounded-xl border border-line bg-field/50 p-3 sm:grid-cols-[1fr_110px_1fr_auto]">
              <label className="block text-[11px] font-medium text-muted">
                Tramo {i + 1}
                <input className={`${inputCls} mt-1`} value={t.name} onChange={(e) => updTramo(t.id, { name: e.target.value })} />
              </label>
              <label className="block text-[11px] font-medium text-muted">
                Longitud (m)
                <input
                  inputMode="decimal"
                  className={`${inputCls} mt-1 text-right`}
                  defaultValue={String(t.lengthM).replace(".", ",")}
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(",", "."));
                    updTramo(t.id, { lengthM: Number.isFinite(v) ? v : 0 });
                  }}
                />
              </label>
              <label className="block text-[11px] font-medium text-muted">
                Canalización
                <select
                  className={`${inputCls} mt-1`}
                  value={t.routing}
                  onChange={(e) => updTramo(t.id, { routing: e.target.value as Routing })}
                >
                  {ROUTINGS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={tramos.length <= 1}
                onClick={() => setTramos((ts) => ts.filter((x) => x.id !== t.id))}
                className="h-9 rounded-lg border border-line px-3 text-[12px] text-muted hover:text-danger disabled:opacity-40"
                aria-label={`Quitar tramo ${i + 1}`}
              >
                Quitar
              </button>
            </div>
          ))}
          {tramos.length < 3 && (
            <button
              type="button"
              onClick={() =>
                setTramos((ts) => [...ts, { id: `t${Date.now()}`, name: `Tramo ${ts.length + 1}`, lengthM: 10, routing: "bandeja_perforada" }])
              }
              className="rounded-lg border border-dashed border-line px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-field"
            >
              + Agregar tramo
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-ink-2">Polos por terna</div>
            <div className="flex rounded-lg border border-line bg-field p-0.5">
              {([3, 4] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPoles(p)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                    poles === p ? "bg-cb-brand text-white shadow-sm" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {p === 3 ? "3 (sin neutro)" : "4 (con neutro)"}
                </button>
              ))}
            </div>
            {inputs.phase === "mono" && (
              <p className="mt-1 text-[11px] text-muted">Circuito monofásico: se consideran 2 conductores (fase + neutro).</p>
            )}
          </div>
          <label className="block text-xs font-medium text-ink-2">
            Aislación (disponible en Cu y Al)
            <select className={`${inputCls} mt-1`} value={family} onChange={(e) => setFamily(e.target.value as AcFamilyId)}>
              <option value="xlpe">XLPE 90 °C / envoltura PVC — IRAM 2178-1</option>
              <option value="pvc">PVC 70 °C / envoltura PVC — IRAM 2178-1</option>
            </select>
          </label>
        </div>
      </Card>

      <Card title="Sección por tramo y material" subtitle={`Límite total de ΔU: ${n(res.duLimitTotal, 1)} %, repartido según la longitud.`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-medium">Tramo</th>
                <th className="px-2 font-medium">Material</th>
                <th className="px-2 font-medium">Sección</th>
                <th className="px-2 text-right font-medium">I_z</th>
                <th className="px-2 text-right font-medium">ΔU (límite)</th>
                <th className="px-2 text-right font-medium">Conductores</th>
                <th className="pl-2 text-right font-medium">Terminales</th>
              </tr>
            </thead>
            <tbody>
              {tramos
                .filter((t) => res.sizings[t.id])
                .flatMap((t) =>
                  (["Cu", "Al"] as Material[]).map((m, k) => {
                    const z = res.sizings[t.id][m];
                    return (
                      <tr key={`${t.id}-${m}`} className={`border-b border-line/60 ${k === 1 ? "" : ""}`}>
                        <td className="py-2 pr-2 font-medium text-ink">{k === 0 ? `${t.name} (${n(t.lengthM, 0)} m)` : ""}</td>
                        <td className="px-2">{MAT_LABEL[m]}</td>
                        <td className="px-2 font-semibold">{z.section !== null ? mm(z.section) : <span className="text-danger">{z.error}</span>}</td>
                        <td className="px-2 text-right">{z.iz !== null ? `${n(z.iz)} A` : "—"}</td>
                        <td className="px-2 text-right">{z.duPct !== null ? `${n(z.duPct, 2)} % (${n(z.duLimit, 2)} %)` : "—"}</td>
                        <td className="px-2 text-right">{z.conductors}</td>
                        <td className="pl-2 text-right">{m === "Al" ? `${z.terminals} bimetálicos` : `${z.terminals} de Cu`}</td>
                      </tr>
                    );
                  }),
                )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="Precios unitarios"
        subtitle="Cargá los precios de tu proveedor para las secciones que resultan del cálculo, o usá la tabla de referencia. Se guardan en este navegador."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadReference(false)}
            className="rounded-lg bg-cb-brand px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm hover:opacity-90"
          >
            Completar con precios de referencia (USD)
          </button>
          <button
            type="button"
            onClick={() => loadReference(true)}
            className="rounded-lg border border-line px-3 py-1.5 text-[12px] font-medium text-ink-2 hover:bg-field"
          >
            Reemplazar todo con referencia
          </button>
          <span className="text-[11px] text-muted">
            Los valores <span className="italic text-warn-ink">en cursiva con borde punteado</span> son estimados (interpolados).
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-medium">Sección</th>
                <th className="px-2 font-medium">Cable Cu ($/m)</th>
                <th className="px-2 font-medium">Cable Al ($/m)</th>
                <th className="px-2 font-medium">Terminal Cu ($/u)</th>
                <th className="pl-2 font-medium">Terminal bimetálico ($/u)</th>
              </tr>
            </thead>
            <tbody>
              {res.sectionsNeeded.map(({ section, materials }) => {
                const p = prices[secKey(section)] ?? {};
                const cu = materials.includes("Cu");
                const al = materials.includes("Al");
                return (
                  <tr key={`${section}-${priceVersion}`} className="border-b border-line/60">
                    <td className="py-1.5 pr-2 font-semibold text-ink">{mm(section)}</td>
                    <td className="px-2 py-1.5">
                      <PriceInput value={p.cableCu} estimated={p.estimated?.cableCu} disabled={!cu} onChange={(v) => setPrice(section, "cableCu", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <PriceInput value={p.cableAl} estimated={p.estimated?.cableAl} disabled={!al} onChange={(v) => setPrice(section, "cableAl", v)} />
                    </td>
                    <td className="px-2 py-1.5">
                      <PriceInput value={p.termCu} estimated={p.estimated?.termCu} disabled={!cu} onChange={(v) => setPrice(section, "termCu", v)} />
                    </td>
                    <td className="py-1.5 pl-2">
                      <PriceInput value={p.termAl} estimated={p.estimated?.termAl} disabled={!al} onChange={(v) => setPrice(section, "termAl", v)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Precio del cable por metro de conductor unipolar. Terminales: 2 por conductor (uno en cada extremo). Referencia:{" "}
          {REFERENCE_SOURCE}
        </p>
      </Card>

      <Card title="Comparación de escenarios" subtitle="Todas las combinaciones de material por tramo, ordenadas de menor a mayor costo.">
        {anyMissing && (
          <p className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[12.5px] text-warn-ink">
            Faltan precios para algunas secciones: los totales de esos escenarios están incompletos y no se consideran para
            elegir el más económico.
          </p>
        )}
        {res.cheapest && cuCu && (
          <div className="mb-4 rounded-xl border border-ok/40 bg-ok/10 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-ok">Opción más económica</div>
            <div className="mt-0.5 text-lg font-semibold text-ink">
              {res.cheapest.parts.map((p) => `${p.tramo.name}: ${MAT_LABEL[p.material]} ${mm(p.section)}`).join(" · ")}
            </div>
            <div className="text-[13px] text-ink-2">
              Total {money(res.cheapest.total)}
              {cuCu.complete && res.cheapest !== cuCu && cuCu.total > 0 && (
                <>
                  {" "}
                  — ahorro de {money(cuCu.total - res.cheapest.total)} ({n(((cuCu.total - res.cheapest.total) / cuCu.total) * 100, 1)} %)
                  frente a todo cobre
                </>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[13px] tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                {tramos.map((t) => (
                  <th key={t.id} className="py-2 pr-2 font-medium">
                    {t.name}
                  </th>
                ))}
                <th className="px-2 text-right font-medium">Cable</th>
                <th className="px-2 text-right font-medium">Terminales</th>
                <th className="pl-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {res.scenarios.map((s) => {
                const best = s === res.cheapest;
                return (
                  <tr key={s.key} className={`border-b border-line/60 ${best ? "bg-ok/10 font-semibold" : ""} ${s.feasible ? "" : "opacity-50"}`}>
                    {s.parts.map((p) => (
                      <td key={p.tramo.id} className="py-2 pr-2">
                        <span
                          className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            p.material === "Cu" ? "bg-[#b87333]/20 text-[#9a5b22]" : "bg-[#8a9bb0]/25 text-ink-2"
                          }`}
                        >
                          {p.material}
                        </span>
                        {p.section !== null ? mm(p.section) : "sin solución"}
                      </td>
                    ))}
                    <td className="px-2 text-right">{s.feasible ? money(s.cableCost) : "—"}</td>
                    <td className="px-2 text-right">{s.feasible ? money(s.terminalCost) : "—"}</td>
                    <td className="pl-2 text-right">
                      {s.feasible ? money(s.total) : "—"}
                      {s.feasible && !s.complete && <span className="ml-1 text-[11px] text-warn-ink">(incompleto)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {ranked.length > 0 && ranked.some((s) => s.total > 0) && (
          <div className="mt-4">
            <EChart build={build} height={Math.max(160, 56 + ranked.length * 44)} ariaLabel="Costo por escenario: cable y terminales" />
          </div>
        )}

        <ul className="mt-3 space-y-1 text-[12px] text-muted">
          {res.notes.map((t, i) => (
            <li key={i}>• {t}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
