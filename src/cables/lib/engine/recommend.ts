// Recomendación de norma, aislación y familia según canalización, local y ambiente
// (electrical_rules_y_datos.md §8, §8.1 y §13).
import type { CalcInputs, FamilyResult, Recommendation } from "./types";

const BURIED = new Set(["cano_enterrado", "enterrado"]);

export function recommend(inp: CalcInputs, results: FamilyResult[]): Recommendation {
  if (inp.side === "DC") {
    return {
      norma: "IRAM 62930 / IEC 62930 / EN 50618 — H1Z2Z2-K",
      insulation: "Elastómero reticulado libre de halógenos (XL-LSOH), 90 °C, doble aislación (Clase II)",
      familyId: "solar",
      reasons: [
        "Obligatorio en los tramos de CC entre módulos e inversor (AEA 712): cables de CA tradicionales no admitidos.",
        "Doble aislación o aislación reforzada exigida por AEA 712.413.2.",
        "Resistente a UV, ozono e hidrólisis para montaje a la intemperie.",
      ],
      admitted: ["Cable solar H1Z2Z2-K (IRAM 62930)"],
    };
  }

  const admitted = results.filter((r) => !r.blocked).map((r) => `${r.familyName} — ${r.norma}`);
  const buried = BURIED.has(inp.routing);
  const outdoor = inp.environment === "intemperie";

  if (inp.location === "publica") {
    return {
      norma:
        inp.routing === "cano"
          ? "IRAM 62266 (con envoltura 0,6/1 kV) o IRAM 62267 (unipolares sin cubierta en caño)"
          : "IRAM 62266 — con envoltura 0,6/1 kV",
      insulation: "XLPE 90 °C con envoltura LSOH (libre de halógenos, baja emisión de humos)",
      familyId: "lsoh",
      reasons: [
        "Local de pública concurrencia: solo cables LSOH (AEA 718 / AEA 92559-3).",
        "Prohibido todo cable con aislación o envoltura de PVC (emisión de HCl y humos opacos).",
        ...(inp.routing === "cano" ? ["Los unipolares IRAM 62267 no están en la base de datos: se dimensiona con cable IRAM 62266."] : []),
      ],
      admitted,
    };
  }

  const norma = buried
    ? "IRAM 2178-1 — con cubierta de protección 0,6/1 kV"
    : inp.routing === "cano"
      ? "IRAM 2178-1 (con envoltura 0,6/1 kV) o IRAM NM 247-3 (unipolares sin cubierta en caño)"
      : "IRAM 2178-1 — con envoltura 0,6/1 kV, no propagante del incendio (IRAM NM IEC 60332-3)";

  const xlpeReasons: string[] = [];
  if (outdoor) {
    xlpeReasons.push("Intemperie: envoltura negra resistente a UV; el XLPE 90 °C tolera mejor el calentamiento solar.");
  }
  if (buried) {
    xlpeReasons.push("Enterrado: el XLPE ofrece mayor ampacidad y mejor comportamiento frente a la humedad.");
  }
  if (!buried && inp.ambientTemp > 40) {
    xlpeReasons.push(`Ambiente de ${inp.ambientTemp} °C: el XLPE (90 °C) pierde menos ampacidad que el PVC (70 °C).`);
  }

  if (xlpeReasons.length) {
    return {
      norma,
      insulation: "XLPE 90 °C con envoltura de PVC",
      familyId: "xlpe",
      reasons: [...xlpeReasons, "El cable PVC/PVC (IRAM 2178-1) también está admitido por norma."],
      admitted,
    };
  }

  // Interior, estándar y ≤ 40 °C: PVC admitido; se elige la menor sección (a igual sección, PVC).
  const valid = results.filter((r) => !r.blocked && r.final && r.familyId !== "lsoh");
  const best = valid.reduce<FamilyResult | null>(
    (b, r) => (b === null || r.final!.section < b.final!.section ? r : b),
    null,
  );
  const xlpeWins = best?.familyId === "xlpe";
  return {
    norma,
    insulation: xlpeWins ? "XLPE 90 °C con envoltura de PVC" : "PVC 70 °C con envoltura de PVC",
    familyId: best?.familyId ?? "pvc",
    reasons: [
      "Interior en local estándar (BD1): PVC y XLPE admitidos (IRAM 2178-1).",
      xlpeWins
        ? "Se recomienda XLPE porque permite una sección menor que el PVC."
        : "Se recomienda PVC: a igual sección es la opción más económica.",
    ],
    admitted,
  };
}
