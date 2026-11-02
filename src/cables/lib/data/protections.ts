// Constantes de protección (electrical_rules_y_datos.md §7).

/** Constante k de la verificación adiabática k²S² ≥ I²t (IEC 60364-4-43). */
export function kFactor(material: "Cu" | "Al", insulation: "PVC" | "XLPE"): number {
  if (material === "Cu") return insulation === "PVC" ? 115 : 143;
  return insulation === "PVC" ? 76 : 94;
}
