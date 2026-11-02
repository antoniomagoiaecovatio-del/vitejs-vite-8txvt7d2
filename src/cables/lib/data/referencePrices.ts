// Precios de referencia en USD tomados de la tabla de compras de Ecovatio
// («Tabla_precios_cables_terminales_USD.xlsx», 1 USD = ARS 1.400). Sin marcas ni proveedores.
//
// Criterios de selección (electrical_rules_y_datos.md §14.1):
// - Cable Cu: solo unipolares 0,6/1 kV XLPE para potencia (subterráneo). Los «unipolares IRAM»
//   450/750 V (cable de cañería, IRAM NM 247-3) no son aptos para bandeja/enterrado y no se usan.
// - Cable Al: unipolares 0,6/1 kV XLPE. Se excluyen los cables de 13,2 kV (media tensión).
// - Terminales Cu: mediana de las variantes de ojal por sección.
// - Terminales bimetálicos Al-Cu: se excluye el de 25 mm² (valor atípico marcado «Revisar»).

export type PriceKind = "cableCu" | "cableAl" | "termCu" | "termAl";

export const REFERENCE_PRICES_USD: Record<PriceKind, Record<number, number>> = {
  cableCu: { 70: 11.9, 120: 20.3 },
  cableAl: { 70: 2.41, 120: 3.29, 185: 5.17, 240: 7.0486 },
  termCu: {
    1.5: 0.1421, 2.5: 0.1497, 4: 0.2131, 6: 0.251, 10: 0.3128, 16: 0.4205, 25: 0.5272, 35: 0.6189,
    50: 1.1125, 70: 1.6854, 95: 3.1679, 120: 3.3637, 150: 4.3287,
  },
  termAl: { 35: 1.7044, 50: 2.4902, 70: 2.7271, 95: 4.623, 120: 4.6959, 150: 8.2945, 185: 7.9308, 240: 10.3784 },
};

export const REFERENCE_SOURCE =
  "Tabla de precios de compra en USD (1 USD = ARS 1.400). Cable: unipolar 0,6/1 kV XLPE. Terminales Cu de compresión y bimetálicos Al-Cu.";

/** Ajuste lineal por mínimos cuadrados P = a + b·S. */
function linearFit(pts: [number, number][]): { a: number; b: number } {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
  const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  const b = sxx > 0 ? sxy / sxx : 0;
  return { a: my - b * mx, b };
}

/**
 * Precio de referencia para una sección.
 * - Sección con precio real → «real».
 * - Entre dos secciones con precio → interpolación lineal («estimado»).
 * - Fuera del rango:
 *   · cables: recta de ajuste de todos los precios reales («estimado»);
 *   · terminales por debajo del mínimo: precio de la menor sección (conservador);
 *   · terminales por encima del máximo: extrapolación con los dos últimos puntos.
 */
export function referencePrice(kind: PriceKind, section: number): { value: number; estimated: boolean } | null {
  const table = REFERENCE_PRICES_USD[kind];
  const pts = Object.entries(table)
    .map(([s, v]) => [Number(s), v] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  if (!pts.length) return null;
  if (table[section] !== undefined) return { value: table[section], estimated: false };
  const lo = [...pts].reverse().find((p) => p[0] < section);
  const hi = pts.find((p) => p[0] > section);
  if (lo && hi) {
    const t = (section - lo[0]) / (hi[0] - lo[0]);
    return { value: lo[1] + t * (hi[1] - lo[1]), estimated: true };
  }
  const isCable = kind === "cableCu" || kind === "cableAl";
  if (isCable) {
    const { a, b } = linearFit(pts);
    return { value: Math.max(a + b * section, 0.05), estimated: true };
  }
  if (!lo) return { value: pts[0][1], estimated: true };
  const [p1, p2] = pts.slice(-2);
  const slope = (p2[1] - p1[1]) / (p2[0] - p1[0]);
  return { value: Math.max(p2[1] + slope * (section - p2[0]), p2[1]), estimated: true };
}
