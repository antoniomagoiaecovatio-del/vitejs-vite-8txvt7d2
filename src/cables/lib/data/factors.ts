// Factores de corrección: Iz = I₀ · fT · fA · fr (electrical_rules_y_datos.md §5).

/** fT al aire, base AEA 40 °C (ECO-DB, verificado contra IEC). */
export const FT_AIR: Record<"PVC" | "XLPE", Record<number, number>> = {
  PVC: { 10: 1.41, 15: 1.35, 20: 1.29, 25: 1.22, 30: 1.15, 35: 1.08, 40: 1, 45: 0.91, 50: 0.82, 55: 0.71, 60: 0.58 },
  XLPE: {
    10: 1.26, 15: 1.22, 20: 1.18, 25: 1.14, 30: 1.1, 35: 1.05, 40: 1,
    45: 0.95, 50: 0.89, 55: 0.84, 60: 0.77, 65: 0.71, 70: 0.63,
  },
};

/** fT en terreno, base AEA 25 °C. */
export const FT_GROUND: Record<"PVC" | "XLPE", Record<number, number>> = {
  PVC: { 10: 1.15, 15: 1.1, 20: 1.05, 25: 1, 30: 0.94, 35: 0.88, 40: 0.82 },
  XLPE: { 10: 1.11, 15: 1.07, 20: 1.04, 25: 1, 30: 0.96, 35: 0.92, 40: 0.88 },
};

/** fT al aire del cable solar H1Z2Z2-K, base 30 °C (catálogo de referencia PRY-AR p.4). */
export const FT_SOLAR_AIR: Record<number, number> = {
  0: 1.22, 10: 1.15, 20: 1.08, 30: 1, 40: 0.91, 50: 0.82, 60: 0.71, 70: 0.58,
};

/**
 * Interpolación lineal en una tabla de temperatura.
 * Devuelve null si θ está fuera del rango tabulado (dato no disponible).
 */
export function interpolate(table: Record<number, number>, theta: number): number | null {
  const pts = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (theta < pts[0] || theta > pts[pts.length - 1]) return null;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    if (theta >= a && theta <= b) {
      const t = (theta - a) / (b - a);
      return table[a] + t * (table[b] - table[a]);
    }
  }
  return table[pts[pts.length - 1]];
}

/**
 * Factor de temperatura con el criterio del motor:
 * - θ dentro de la tabla → interpolación lineal;
 * - θ por debajo del mínimo tabulado → se usa el valor del mínimo (conservador: a menor θ, mayor factor real);
 * - θ por encima del máximo → null (el cable no admite esa temperatura).
 */
export function tempFactor(table: Record<number, number>, theta: number): { value: number | null; clamped: boolean } {
  const pts = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (theta < pts[0]) return { value: table[pts[0]], clamped: true };
  return { value: interpolate(table, theta), clamped: false };
}

export type GroupingTable =
  | "conduit"
  | "traySolid"
  | "trayPerforated"
  | "trayLadder"
  | "buriedDirect"
  | "buriedDirect1d"
  | "buriedDirect125"
  | "buriedDirect250"
  | "buriedDirect500"
  | "buriedDuct"
  | "buriedDuct250"
  | "buriedDuct500"
  | "buriedDuct1000"
  | "uniTrefoilPerf"
  | "uniTrefoilLadder"
  | "uniFlatPerf"
  | "uniFlatLadder";

interface GroupTable {
  label: string;
  /** Pares [n.º de circuitos, factor]. Para n intermedio se toma el del siguiente n tabulado (conservador). */
  points: ReadonlyArray<readonly [number, number]>;
  /** true si el último valor vale para «n o más» circuitos. */
  openEnded: boolean;
  /** Tabla de multipolares a usar como cota cuando la de unipolares no alcanza (> 3 circuitos). */
  fallback?: GroupingTable;
  source: string;
}

/**
 * Factores de agrupamiento fA (electrical_rules_y_datos.md §5.3–§5.5 y §13.10).
 * Las tablas de unipolares (IEC 60364-5-52, tabla B.52.21, una bandeja) están normalizadas a 1 circuito,
 * porque las I₀ de los métodos F y G ya corresponden a un circuito sobre bandeja.
 */
export const FA_TABLES: Record<GroupingTable, GroupTable> = {
  conduit: {
    label: "cañería cerrada / cables en haz",
    points: [[1, 1], [2, 0.8], [3, 0.7], [4, 0.65], [5, 0.6], [6, 0.57], [7, 0.54], [8, 0.52], [9, 0.5], [12, 0.45], [16, 0.41], [20, 0.38]],
    openEnded: true,
    source: "AEA (1–5 circuitos) · IEC B.52.17 (6–20)",
  },
  // IEC 60364-5-52 tabla B.52.17 (adoptada por la AEA 90364-5-52), una capa, cables en contacto.
  // Sin reducción adicional por encima de 9 circuitos.
  traySolid: {
    label: "bandeja ciega / sobre pared",
    points: [[1, 1], [2, 0.85], [3, 0.79], [4, 0.75], [5, 0.73], [6, 0.72], [7, 0.72], [8, 0.71], [9, 0.7]],
    openEnded: true,
    source: "IEC 60364-5-52 B.52.17, fila 2 (AEA 90364-5-52)",
  },
  trayPerforated: {
    label: "bandeja perforada, cables en contacto",
    points: [[1, 1], [2, 0.88], [3, 0.82], [4, 0.77], [5, 0.75], [6, 0.73], [7, 0.73], [8, 0.72], [9, 0.72]],
    openEnded: true,
    source: "IEC 60364-5-52 B.52.17, fila 4 (AEA 90364-5-52)",
  },
  trayLadder: {
    label: "bandeja escalera / canasta, cables en contacto",
    points: [[1, 1], [2, 0.87], [3, 0.82], [4, 0.8], [5, 0.8], [6, 0.79], [7, 0.79], [8, 0.78], [9, 0.78]],
    openEnded: true,
    source: "IEC 60364-5-52 B.52.17, fila 5 (AEA 90364-5-52)",
  },
  buriedDirect: {
    label: "directamente enterrados, en contacto",
    points: [[1, 1], [2, 0.75], [3, 0.65], [4, 0.6], [5, 0.55], [6, 0.5]],
    openEnded: false,
    source: "IEC B.52.18 (referencia)",
  },
  buriedDirect1d: {
    label: "directamente enterrados, separados 1 diámetro",
    points: [[1, 1], [2, 0.8], [3, 0.7], [4, 0.6], [5, 0.55], [6, 0.55]],
    openEnded: false,
    source: "IEC B.52.18 (referencia)",
  },
  buriedDirect125: {
    label: "directamente enterrados, separados 0,125 m",
    points: [[1, 1], [2, 0.85], [3, 0.75], [4, 0.7], [5, 0.65], [6, 0.6]],
    openEnded: false,
    source: "IEC B.52.18 (referencia)",
  },
  buriedDirect250: {
    label: "directamente enterrados, separados 0,25 m",
    points: [[1, 1], [2, 0.9], [3, 0.8], [4, 0.75], [5, 0.7], [6, 0.7]],
    openEnded: false,
    source: "IEC B.52.18 (referencia)",
  },
  buriedDirect500: {
    label: "directamente enterrados, separados 0,5 m",
    points: [[1, 1], [2, 0.9], [3, 0.85], [4, 0.8], [5, 0.8], [6, 0.8]],
    openEnded: false,
    source: "IEC B.52.18 (referencia)",
  },
  buriedDuct: {
    label: "caños enterrados, en contacto",
    points: [[1, 1], [2, 0.85], [3, 0.75], [4, 0.7], [5, 0.65], [6, 0.6]],
    openEnded: false,
    source: "IEC B.52.19 (referencia)",
  },
  buriedDuct250: {
    label: "caños enterrados, separados 0,25 m",
    points: [[1, 1], [2, 0.9], [3, 0.85], [4, 0.8], [5, 0.8], [6, 0.8]],
    openEnded: false,
    source: "IEC B.52.19 (referencia)",
  },
  buriedDuct500: {
    label: "caños enterrados, separados 0,5 m",
    points: [[1, 1], [2, 0.95], [3, 0.9], [4, 0.85], [5, 0.85], [6, 0.8]],
    openEnded: false,
    source: "IEC B.52.19 (referencia)",
  },
  buriedDuct1000: {
    label: "caños enterrados, separados 1 m",
    points: [[1, 1], [2, 0.95], [3, 0.95], [4, 0.9], [5, 0.9], [6, 0.9]],
    openEnded: false,
    source: "IEC B.52.19 (referencia)",
  },
  uniTrefoilPerf: {
    label: "ternas en trébol, bandeja perforada, separadas ≥ 2·D",
    points: [[1, 1], [2, 0.98], [3, 0.96]],
    openEnded: false,
    fallback: "trayPerforated",
    source: "IEC B.52.21 (referencia)",
  },
  uniTrefoilLadder: {
    label: "ternas en trébol, bandeja escalera, separadas ≥ 2·D",
    points: [[1, 1], [2, 1], [3, 1]],
    openEnded: false,
    fallback: "trayLadder",
    source: "IEC B.52.21 (referencia)",
  },
  uniFlatPerf: {
    label: "unipolares en plano, bandeja perforada",
    points: [[1, 1], [2, 0.929], [3, 0.888]],
    openEnded: false,
    fallback: "trayPerforated",
    source: "IEC B.52.21 (referencia; 0,98 / 0,91 / 0,87 normalizado a 1 circuito)",
  },
  uniFlatLadder: {
    label: "unipolares en plano, bandeja escalera",
    points: [[1, 1], [2, 0.97], [3, 0.96]],
    openEnded: false,
    fallback: "trayLadder",
    source: "IEC B.52.21 (referencia)",
  },
};

export function groupingLabel(table: GroupingTable): string {
  return FA_TABLES[table].label;
}

/**
 * fA para n circuitos agrupados.
 * - saturated: n supera la tabla y no hay regla para más circuitos (verificar).
 * - usedFallback: la tabla de unipolares no alcanza y se tomó el menor valor con la de multipolares.
 */
export function groupingFactor(
  table: GroupingTable,
  n: number,
): { value: number; saturated: boolean; usedFallback: boolean; source: string } {
  const t: GroupTable = FA_TABLES[table];
  const nn = Math.max(1, Math.round(n));
  const hit = t.points.find(([k]) => k >= nn);
  const last = t.points[t.points.length - 1];
  if (hit) return { value: hit[1], saturated: false, usedFallback: false, source: t.source };
  if (t.fallback) {
    const fb = groupingFactor(t.fallback, nn);
    return {
      value: Math.min(last[1], fb.value),
      saturated: fb.saturated,
      usedFallback: true,
      source: `${t.source}; > ${last[0]} circuitos: ${FA_TABLES[t.fallback].source}`,
    };
  }
  return { value: last[1], saturated: !t.openEnded, usedFallback: false, source: t.source };
}

/**
 * fr por resistividad térmica del terreno, rebasado a la base AEA de 1,0 K·m/W (las I₀ de catálogo son a 1,0 K·m/W).
 * Fuente: IEC 60364-5-52 tabla B.52.16 (base 2,5 K·m/W): directamente enterrado 1,62 / 1,50 / 1,28 / 1,12 / 1,00 / 0,90
 * y en caño enterrado 1,20 / 1,18 / 1,10 / 1,05 / 1,00 / 0,96 para 0,7 / 1 / 1,5 / 2 / 2,5 / 3 K·m/W.
 * Rebase: fr(ρ) = k(ρ) / k(1,0). 1,2 K·m/W por interpolación lineal entre 1,0 y 1,5.
 */
export const FR_OPTIONS: { rho: number; label: string; direct: number; duct: number }[] = [
  { rho: 0.7, label: "0,7 K·m/W — muy húmedo / saturado", direct: 1.08, duct: 1.017 },
  { rho: 1.0, label: "1,0 K·m/W — estándar (húmedo normal)", direct: 1.0, duct: 1.0 },
  { rho: 1.2, label: "1,2 K·m/W — arcilloso seco", direct: 0.941, duct: 0.973 },
  { rho: 1.5, label: "1,5 K·m/W — arenoso seco / compacto", direct: 0.853, duct: 0.932 },
  { rho: 2.0, label: "2,0 K·m/W — seco, baja conductividad", direct: 0.747, duct: 0.89 },
  { rho: 2.5, label: "2,5 K·m/W — pedregoso / cascajo seco", direct: 0.667, duct: 0.847 },
  { rho: 3.0, label: "3,0 K·m/W — rocoso / escoria seca", direct: 0.6, duct: 0.814 },
];

/** fr para la resistividad elegida: `duct` = cables en caño enterrado (método D1). */
export function frFor(rho: number, duct = false): number {
  const o = FR_OPTIONS.find((x) => x.rho === rho);
  return o ? (duct ? o.duct : o.direct) : 1;
}
