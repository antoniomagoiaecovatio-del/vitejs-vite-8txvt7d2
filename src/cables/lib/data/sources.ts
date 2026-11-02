// Fuente (catálogo y página) de cada dato que usa el cálculo. Se muestra en la
// «Memoria de cálculo». Las páginas son las del PDF (verificadas contra cada archivo).
import type { AcFamilyId, Formation, Material, MethodKey, PvMethodKey } from "./types";

export interface Source {
  /** Documento y edición. */
  doc: string;
  /** Archivo PDF. */
  file: string;
  /** Página(s) del PDF. */
  page: string;
  /** Aclaración opcional (erratas, valores derivados). */
  note?: string;
}

const CAT20 = { doc: "Prysmian · Sintenax Valio (Ed. 2020)", file: "Catalogo Sintenax_Valio.pdf" };
const CATOLD = { doc: "Prysmian · catálogo general BT, Sintenax Valio (extracto, edición anterior)", file: "Catalogo_cables_BT-sintenax.pdf" };
const RTX = { doc: "Prysmian · Retenax Valio (2026)", file: "PRY2026_Retenax Valio_v2.pdf" };
const AFX = { doc: "Prysmian · Afumex 1000+ (2026)", file: "PRY2026_Afumex 1000+_v2.pdf" };
const PRYAR = { doc: "Prysmian Argentina · cable Prysun (Ed. 2026)", file: "PRYAR_Prysun_v05.pdf" };
const PRYGB = { doc: "Prysmian · hoja técnica Prysun H1Z2Z2-K (EN 50618)", file: "GB00_PRYSUN_H1Z2Z2_K_1KV.pdf" };
const ECODB = { doc: "Ecovatio · base de datos de factores de corrección", file: "Retenax valio + AEA.pdf" };
const INF = { doc: "Ecovatio · informe técnico normativo (AEA 90364-7-712, 92559-3, IEC 60909-0)", file: "ACFrOgCLqMZih….pdf" };

const CATALOG: Record<AcFamilyId, { cat: { doc: string; file: string }; cu: Record<string, string>; al: Record<string, string> }> = {
  pvc: {
    cat: CAT20,
    cu: { rxUniBi: "3", rxTri: "4", bce: "5", fg: "6", d: "7" },
    al: { rxUniBi: "8", rxTri: "9", bce: "10", fg: "11", d: "12" },
  },
  xlpe: {
    cat: RTX,
    cu: { rxUniBi: "3", rxTri: "4", bce: "5", fg: "6", d: "7" },
    al: { rxUniBi: "8", rxTri: "9", bce: "10", fg: "11", d: "12" },
  },
  lsoh: {
    cat: AFX,
    cu: { rxUniBi: "3", rxTri: "4", bce: "5", fg: "6", d: "7" },
    al: {},
  },
};

const methodGroup = (m: MethodKey): "bce" | "fg" | "d" => (/^[FG]_/.test(m) ? "fg" : /^D/.test(m) ? "d" : "bce");

/** Fuente de la corriente admisible I₀ (tabla de catálogo) de la sección mostrada. */
export function ampacitySource(family: AcFamilyId | "solar", material: Material, method: MethodKey | PvMethodKey, section: number): Source {
  if (family === "solar") {
    return { ...PRYAR, page: "4", note: "Capacidad de conducción de corriente, ambiente 30 °C y conductor a 90 °C." };
  }
  const c = CATALOG[family];
  const g = methodGroup(method as MethodKey);
  const page = (material === "Cu" ? c.cu : c.al)[g];
  if (family === "pvc" && material === "Al" && g === "d") {
    return {
      ...CATOLD,
      page: "13 (pág. 64 del catálogo)",
      note: "La tabla de aluminio enterrado del catálogo 2020 es copia de la de XLPE (errata); se usa la del catálogo anterior, con relación Al/Cu coherente.",
    };
  }
  let note: string | undefined;
  if (family === "lsoh" && g === "fg" && section === 300) {
    note = "La fila de 300 mm² del catálogo repite la de XLPE (errata): se usa un valor ajustado y conservador (coincide con el catálogo Marlew serie EF).";
  }
  if (family === "lsoh" && g === "bce") note = "Igual a la de XLPE salvo la fila de 50 mm².";
  return { ...c.cat, page: page ?? "—", note };
}

/** Fuente de R' y X' de la sección mostrada. */
export function rxSource(family: AcFamilyId | "solar", material: Material, formation: Formation, section: number): Source {
  if (family === "solar") {
    return {
      ...PRYGB,
      page: "1",
      note: "R₂₀ según IEC 60228 clase 5 estañado (confirmado por el catálogo en 4 y 6 mm²), corregida a 90 °C × 1,28.",
    };
  }
  const c = CATALOG[family];
  const t = material === "Cu" ? c.cu : c.al;
  const page = formation === "tri" ? t.rxTri : t.rxUniBi;
  let note: string | undefined;
  if (formation === "uni" && material === "Cu" && section < 4 && family !== "lsoh") {
    note =
      "Este catálogo no tabula unipolares menores a 4 mm². R' = la del cable multipolar de la misma aislación (igual a la del unipolar desde 4 mm²); X' = la del unipolar de 1,5/2,5 mm² de Afumex 1000+ (PRY2026_Afumex 1000+_v2.pdf, pág. 3).";
  } else if (formation === "uni") {
    note = "X' calculada para 3 unipolares en plano separados un diámetro.";
  }
  return { ...c.cat, page: page ?? "—", note };
}

export const FACTORS_SOURCE: { fT: Source; fA: Source; fr: Source } = {
  fT: { ...ECODB, page: "4–5", note: "Coincide con IEC 60364-5-52, tablas B.52.14 y B.52.15 (base AEA: 40 °C en aire, 25 °C en terreno)." },
  fA: { ...ECODB, page: "4–5", note: "Cañerías y bandejas. Enterrados: IEC 60364-5-52, tablas B.52.18 y B.52.19 (valor de referencia)." },
  fr: { ...ECODB, page: "4–5", note: "Base AEA: 1,0 K·m/W (aplica solo a cables enterrados)." },
};

export const FORMULAS_SOURCE: Source = { ...INF, page: "3–4" };
export const LIMITS_SOURCE: Source = { ...INF, page: "5" };
export const SC_SOURCE: Source = { ...INF, page: "5", note: "Esfuerzo térmico k²S² ≥ I²t, IEC 60364-4-43 / IEC 60909-0." };
export const MIN_SECTION_SOURCE =
  "AEA 90364-7-771, tabla 771.13.I (valor de referencia: confirmar con la edición vigente del reglamento).";
