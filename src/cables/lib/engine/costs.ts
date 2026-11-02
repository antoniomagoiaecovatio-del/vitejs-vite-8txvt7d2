// Comparación económica cobre / aluminio por tramos (electrical_rules_y_datos.md §14).
import type { AcFamilyId, Material } from "../data/types";
import { calculate } from "./calc";
import type { CalcInputs, Routing } from "./types";

export interface Tramo {
  id: string;
  name: string;
  lengthM: number;
  routing: Routing;
}

/** Precios unitarios por sección (moneda del usuario). */
export interface SectionPrices {
  cableCu?: number;
  cableAl?: number;
  termCu?: number;
  /** Terminal bimetálico Al-Cu. */
  termAl?: number;
  /** Campos cuyo valor es estimado (interpolado o extrapolado a partir de la tabla de referencia). */
  estimated?: Partial<Record<"cableCu" | "cableAl" | "termCu" | "termAl", boolean>>;
}
export type PriceTable = Record<string, SectionPrices>;

export interface CostOptions {
  tramos: Tramo[];
  /** 3 = sin neutro (3F), 4 = con neutro (3F + N). En monofásica se usan 2. */
  poles: 3 | 4;
  /** Familia de aislación usada para ambos materiales (debe existir en Cu y en Al). */
  family: AcFamilyId;
  prices: PriceTable;
}

export interface TramoSizing {
  tramo: Tramo;
  material: Material;
  /** Sección por conductor (mm²); null si no hay solución. */
  section: number | null;
  iz: number | null;
  duPct: number | null;
  duLimit: number;
  /** Conductores por tramo = polos × conductores en paralelo. */
  conductors: number;
  /** Terminales = 2 extremos × conductores. */
  terminals: number;
  cableCost: number | null;
  terminalCost: number | null;
  missingPrices: string[];
  error: string | null;
}

export interface Scenario {
  key: string;
  materials: Material[];
  parts: TramoSizing[];
  cableCost: number;
  terminalCost: number;
  total: number;
  feasible: boolean;
  complete: boolean;
}

export interface CostResult {
  sizings: Record<string, Record<Material, TramoSizing>>;
  scenarios: Scenario[];
  cheapest: Scenario | null;
  sectionsNeeded: { section: number; materials: Material[] }[];
  duLimitTotal: number;
  notes: string[];
}

export const secKey = (s: number) => String(s);

/** Dimensiona un tramo en un material, con su parte del límite de ΔU (proporcional a la longitud). */
function sizeTramo(base: CalcInputs, t: Tramo, material: Material, opt: CostOptions, duShare: number): TramoSizing {
  const phases = base.phase === "mono" ? 2 : opt.poles;
  const inp: CalcInputs = {
    ...base,
    side: "AC",
    material,
    family: opt.family,
    routing: t.routing,
    lengthM: t.lengthM,
    withNeutral: opt.poles === 4,
    duLimitOverride: duShare,
    sectionChoice: 0,
  };
  const r = calculate(inp);
  // Conductores = polos × paralelo (resuelto por tramo si el paralelo es automático).
  const conductors = phases * r.parallel;
  const x = r.results.find((f) => f.familyId === opt.family);
  const out: TramoSizing = {
    tramo: t,
    material,
    section: null,
    iz: null,
    duPct: null,
    duLimit: duShare,
    conductors,
    terminals: 2 * conductors,
    cableCost: null,
    terminalCost: null,
    missingPrices: [],
    error: null,
  };
  if (!x) {
    out.error = material === "Al" ? "Aislación sin versión en aluminio" : "Sin datos para esta aislación";
    return out;
  }
  if (!x.final || x.blocked) {
    out.error =
      x.alerts.find((a) => a.level === "error")?.message ??
      r.globalAlerts.find((a) => a.level === "error")?.message ??
      "Sin sección que cumpla";
    return out;
  }
  out.section = x.final.section;
  out.iz = x.final.iz;
  out.duPct = x.final.duPct;
  const p = opt.prices[secKey(out.section)] ?? {};
  const cablePrice = material === "Cu" ? p.cableCu : p.cableAl;
  const termPrice = material === "Cu" ? p.termCu : p.termAl;
  if (!(cablePrice! > 0)) out.missingPrices.push(material === "Cu" ? "cable Cu" : "cable Al");
  if (!(termPrice! > 0)) out.missingPrices.push(material === "Cu" ? "terminal Cu" : "terminal bimetálico");
  out.cableCost = t.lengthM * conductors * (cablePrice ?? 0);
  out.terminalCost = out.terminals * (termPrice ?? 0);
  return out;
}

export function compareCosts(base: CalcInputs, opt: CostOptions): CostResult {
  const tramos = opt.tramos.filter((t) => t.lengthM > 0);
  const totalL = tramos.reduce((s, t) => s + t.lengthM, 0);
  // Límite total de ΔU del circuito (reglamentario o de proyecto), repartido entre tramos según su longitud.
  const duLimitTotal = calculate({ ...base, side: "AC" }).duLimitPct;
  const sizings: CostResult["sizings"] = {};
  for (const t of tramos) {
    const share = totalL > 0 ? (duLimitTotal * t.lengthM) / totalL : duLimitTotal;
    sizings[t.id] = {
      Cu: sizeTramo(base, t, "Cu", opt, share),
      Al: sizeTramo(base, t, "Al", opt, share),
    };
  }

  // Todas las combinaciones de material por tramo.
  const scenarios: Scenario[] = [];
  const combos = 1 << tramos.length;
  for (let m = 0; m < combos; m++) {
    const materials = tramos.map((_, i) => ((m >> i) & 1 ? "Al" : "Cu") as Material);
    const parts = tramos.map((t, i) => sizings[t.id][materials[i]]);
    const feasible = parts.every((p) => p.section !== null);
    const complete = feasible && parts.every((p) => p.missingPrices.length === 0);
    const cableCost = parts.reduce((s, p) => s + (p.cableCost ?? 0), 0);
    const terminalCost = parts.reduce((s, p) => s + (p.terminalCost ?? 0), 0);
    scenarios.push({
      key: materials.join("/"),
      materials,
      parts,
      cableCost,
      terminalCost,
      total: cableCost + terminalCost,
      feasible,
      complete,
    });
  }
  scenarios.sort((a, b) => Number(b.feasible) - Number(a.feasible) || a.total - b.total);
  const priced = scenarios.filter((s) => s.feasible && s.complete);
  const cheapest = priced.length ? priced.reduce((a, b) => (b.total < a.total ? b : a)) : null;

  const need = new Map<number, Set<Material>>();
  for (const t of tramos) {
    for (const mat of ["Cu", "Al"] as Material[]) {
      const s = sizings[t.id][mat].section;
      if (s !== null) (need.get(s) ?? need.set(s, new Set()).get(s)!).add(mat);
    }
  }
  const sectionsNeeded = [...need.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([section, mats]) => ({ section, materials: [...mats] }));

  const notes = [
    `El límite de caída de tensión del circuito (${duLimitTotal.toLocaleString("es-AR")} %) se reparte entre los tramos en proporción a su longitud, de modo que la suma nunca lo supera.`,
    "Cada tramo se dimensiona con el mismo motor que la pestaña principal (ampacidad, factores de corrección, sección mínima y cortocircuito).",
    "Terminales: 2 por conductor (uno en cada extremo). En aluminio se consideran terminales bimetálicos Al-Cu.",
  ];
  return { sizings, scenarios, cheapest, sectionsNeeded, duLimitTotal, notes };
}
