// Cable solar H1Z2Z2-K — Cu estañado clase 5, 1,5 kV CC.
// Valores de referencia: catálogo PRY-AR (ver docs/electrical_rules_y_datos.md).
// Ampacidades a 30 °C de ambiente con conductor a 90 °C.
import type { PvFamily } from "./types";
import { columns } from "./table";

// R₂₀ IEC 60228 clase 5 estañado (confirmado por PRY-GB en 4 y 6 mm²) × 1,28 → 90 °C.
const R20: Record<number, number> = {
  4: 5.09,
  6: 3.39,
  10: 1.95,
  16: 1.24,
  25: 0.795,
  35: 0.565,
  50: 0.393,
  70: 0.277,
  95: 0.21,
  120: 0.164,
  150: 0.132,
  185: 0.108,
  240: 0.0817,
  300: 0.0654,
};

const r90 = Object.fromEntries(
  Object.entries(R20).map(([s, r]) => [Number(s), r * (1 + 0.004 * (90 - 20))]),
);

const ampacity = columns(["PV_AIR", "PV_SURF1", "PV_SURF2"] as const, [
  [4, 57, 54, 45],
  [6, 72, 69, 58],
  [10, 98, 96, 80],
  [16, 132, 130, 107],
  [25, 183, 174, 138],
  [35, 227, 215, 171],
  [50, 287, 273, 209],
  [70, 361, 344, 269],
  [95, 433, 411, 328],
  [120, 508, 483, 382],
  [150, 590, 560, 441],
  [185, 671, 638, 506],
  [240, 808, 767, 599],
  [300, 913, 866, 693],
]);

export const cableSolar: PvFamily = {
  id: "solar",
  name: "Cable solar H1Z2Z2-K",
  norma: "IRAM 62930 / IEC 62930 / EN 50618 (1,5 kV CC)",
  covering: "Aislación y envoltura XL-LSOH 90 °C, doble aislación (Clase II), resistente a UV · Cu estañado clase 5",
  thetaMax: 90,
  thetaSc: 250,
  r90,
  ampacity,
  source: "PRY-AR",
};
