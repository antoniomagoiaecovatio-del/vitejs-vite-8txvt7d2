// Motor de cálculo: ampacidad + caída de tensión + sección mínima + protecciones + cortocircuito.
// Implementa electrical_rules_y_datos.md (§5, §6, §7, §9 y §13).
import { cableLsoh } from "../data/lsoh";
import {
  FT_AIR,
  FT_GROUND,
  FT_SOLAR_AIR,
  type GroupingTable,
  frFor,
  groupingFactor,
  groupingLabel,
  tempFactor,
} from "../data/factors";
import { cableSolar } from "../data/solar";
import { kFactor } from "../data/protections";
import { cableXlpe } from "../data/xlpe";
import { cablePvc } from "../data/pvc";
import type { AcFamily, BySection, Formation, MethodKey, PvMethodKey } from "../data/types";
import { recommend } from "./recommend";
import { acFamilyAlerts, globalAlerts } from "./rules";
import type {
  Alert,
  CalcInputs,
  CalcResult,
  CircuitType,
  Factors,
  FamilyResult,
  ProtectionResult,
  SectionEval,
} from "./types";

export const AC_FAMILIES: AcFamily[] = [cablePvc, cableXlpe, cableLsoh];

/**
 * Parámetros por tipo de circuito de CA.
 * ΔU: INF p.5 (AEA 771 / AEA 92559-3). Sección mínima: AEA 90364-7-771 tabla 771.13.I [REFERENCIA, §13].
 */
export const CIRCUITS: Record<CircuitType, { label: string; du: number; duSource: string; sMin: number }> = {
  iluminacion: { label: "Circuito terminal de iluminación", du: 3, duSource: "AEA 771 — iluminación", sMin: 1.5 },
  tomacorrientes: { label: "Circuito terminal de tomacorrientes", du: 5, duSource: "AEA 771 — usos generales", sMin: 2.5 },
  fuerza: { label: "Fuerza motriz / uso específico", du: 5, duSource: "AEA 771 — fuerza motriz", sMin: 2.5 },
  seccional: { label: "Línea seccional / alimentador", du: 5, duSource: "AEA 771 — usos generales", sMin: 2.5 },
  principal: { label: "Línea principal", du: 5, duSource: "AEA 771 — usos generales", sMin: 4 },
  inversor: { label: "Salida de inversor al PCR", du: 3, duSource: "AEA 92559-3 — PCR", sMin: 2.5 },
};

/** Sección mínima de cables de CC FV: la menor sección del catálogo solar de referencia (PRY-AR). */
const DC_MIN_SECTION = 4;
/**
 * Sección mínima de aluminio (criterio de diseño). La AEA 90364-5-52 admite Al desde 16 mm²,
 * pero por debajo de 25 mm² no se usa en la práctica (terminales bimetálicos, conexionado).
 */
export const AL_MIN_SECTION = 25;
/** Sección máxima por conductor en modo automático: por encima se pasa a conductores en paralelo (bornes y terminales). */
export const MAX_SECTION_PER_CONDUCTOR = 300;
export const MAX_PARALLEL = 8;

const fmt = (v: number, d = 1) => v.toLocaleString("es-AR", { maximumFractionDigits: d, minimumFractionDigits: d });

// ---------------------------------------------------------------------------
// Corrientes
// ---------------------------------------------------------------------------

export function projectCurrent(inp: CalcInputs): { ib: number; iRequired: number } {
  if (inp.side === "DC") {
    const n = inp.dcRole === "string" ? 1 : Math.max(1, inp.nStrings);
    return { ib: n * inp.impStc, iRequired: 1.25 * n * inp.iscStc };
  }
  let ib: number;
  if (inp.loadMode === "current") ib = inp.current;
  else {
    const p = inp.powerKw * 1000;
    ib = inp.phase === "mono" ? p / (inp.voltage * inp.cosPhi) : p / (Math.sqrt(3) * inp.voltage * inp.cosPhi);
  }
  const factor = inp.circuitType === "inversor" ? Math.max(1, inp.serviceFactor) : 1;
  return { ib, iRequired: ib * factor };
}

// ---------------------------------------------------------------------------
// Método de instalación = canalización + formación
// ---------------------------------------------------------------------------

export interface MethodInfo {
  method: MethodKey;
  formation: Formation;
  grouping: GroupingTable | "none";
  buried: boolean;
  /** Nota cuando la combinación no está tabulada y se usa una columna conservadora. */
  note?: string;
}

/**
 * Tabla de agrupamiento para enterrados según la separación entre circuitos (IEC B.52.18 / B.52.19).
 * Una separación que no existe en la tabla del método se toma como «en contacto» (conservador).
 */
export function buriedGrouping(inp: CalcInputs, duct: boolean): GroupingTable {
  const sp = inp.buriedSpacing;
  if (duct) {
    if (sp === "0.25") return "buriedDuct250";
    if (sp === "0.5") return "buriedDuct500";
    if (sp === "1.0") return "buriedDuct1000";
    return "buriedDuct";
  }
  if (sp === "1d") return "buriedDirect1d";
  if (sp === "0.125") return "buriedDirect125";
  if (sp === "0.25") return "buriedDirect250";
  if (sp === "0.5") return "buriedDirect500";
  return "buriedDirect";
}

export function acMethod(inp: CalcInputs): MethodInfo {
  const mono = inp.phase === "mono";
  const multiF: Formation = mono ? "bi" : "tri";
  // Multipolares en bandeja: en contacto (tabla AEA) o espaciados (sin reducción, AEA).
  const tray = (ladder: boolean): GroupingTable | "none" =>
    inp.spaced ? "none" : ladder ? "trayLadder" : "trayPerforated";
  // Unipolares en bandeja: tabla IEC B.52.21 según disposición.
  const uniTray = (ladder: boolean, trefoil: boolean): GroupingTable => {
    if (trefoil) {
      // Ternas en trébol separadas ≥ 2·D: tabla de trébol; en contacto entre sí: tabla de multipolares (conservador).
      if (inp.spaced) return ladder ? "uniTrefoilLadder" : "uniTrefoilPerf";
      return ladder ? "trayLadder" : "trayPerforated";
    }
    return ladder ? "uniFlatLadder" : "uniFlatPerf";
  };

  if (inp.cableForm === "multi") {
    switch (inp.routing) {
      case "cano":
        return { method: mono ? "B2_2c" : "B2_3c", formation: multiF, grouping: "conduit", buried: false };
      case "bandeja_ciega":
        return { method: mono ? "C_2c" : "C_3c", formation: multiF, grouping: "traySolid", buried: false };
      case "bandeja_perforada":
      case "bandeja_escalera":
        return {
          method: mono ? "E_2c" : "E_3c",
          formation: multiF,
          grouping: tray(inp.routing === "bandeja_escalera"),
          buried: false,
        };
      case "cano_enterrado":
        return { method: mono ? "D1_2c" : "D1_3c", formation: multiF, grouping: buriedGrouping(inp, true), buried: true };
      case "enterrado":
        return { method: mono ? "D2_2c" : "D2_3c", formation: multiF, grouping: buriedGrouping(inp, false), buried: true };
    }
  }

  // Unipolares
  switch (inp.routing) {
    case "cano":
      return {
        method: mono ? "B2_2c" : "B2_3c",
        formation: "uni",
        grouping: "conduit",
        buried: false,
        note: "Unipolares en caño (método B1) no están tabulados en el catálogo: se usa la columna B2 (multipolar), del lado seguro.",
      };
    case "bandeja_ciega":
      // El catálogo incluye explícitamente «cables unipolares en contacto» en el método C.
      return { method: mono ? "C_2c" : "C_3c", formation: "uni", grouping: "traySolid", buried: false };
    case "bandeja_perforada":
    case "bandeja_escalera": {
      const ladder = inp.routing === "bandeja_escalera";
      const a = inp.uniArrangement;
      if (a === "trebol" || a === "plano") {
        return {
          method: mono ? "F_2u" : a === "trebol" ? "F_3u_trebol" : "F_3u_plano",
          formation: "uni",
          grouping: uniTray(ladder, a === "trebol"),
          buried: false,
        };
      }
      if (mono) {
        return {
          method: "F_2u",
          formation: "uni",
          grouping: uniTray(ladder, false),
          buried: false,
          note: "Dos unipolares separados no están tabulados: se usa la columna F (en contacto), del lado seguro.",
        };
      }
      return {
        method: a === "sep_horiz" ? "G_3u_horiz" : "G_3u_vert",
        formation: "uni",
        grouping: uniTray(ladder, false),
        buried: false,
      };
    }
    case "cano_enterrado":
      return {
        method: mono ? "D1_2c" : "D1_3c",
        formation: "uni",
        grouping: buriedGrouping(inp, true),
        buried: true,
        note: "Unipolares en caño enterrado no están tabulados en el catálogo: se usa la columna D1 (multipolar), del lado seguro.",
      };
    case "enterrado": {
      const notes: string[] = [];
      if (mono) notes.push("Dos unipolares directamente enterrados no están tabulados: se usa la columna de 3 unipolares en contacto, del lado seguro.");
      if (inp.buriedArrangement === "plano_sep") {
        notes.push("Unipolares enterrados separados 1 diámetro no están tabulados en el catálogo: se usa la columna de unipolares en contacto, del lado seguro.");
      }
      return {
        method: "D2_3u",
        formation: "uni",
        grouping: buriedGrouping(inp, false),
        buried: true,
        note: notes.length ? notes.join(" ") : undefined,
      };
    }
  }
}

function computeFactors(
  inp: CalcInputs,
  grouping: GroupingTable | "none",
  buried: boolean,
  fTTable: Record<number, number>,
  fTBasis: string,
  alerts: Alert[],
): Factors | null {
  // Temperatura efectiva: terreno para enterrados; aire + incremento por radiación solar para el resto.
  const solar = buried ? 0 : Math.max(0, inp.solarDelta);
  const theta = buried ? inp.groundTemp : inp.ambientTemp + solar;
  const ft = tempFactor(fTTable, theta);
  if (ft.value === null) {
    alerts.push({
      level: "error",
      code: "FT-RANGO",
      message: `Temperatura ${buried ? "del terreno" : "de cálculo"} de ${fmt(theta, 0)} °C${solar ? ` (ambiente + ${fmt(solar, 0)} °C por radiación solar)` : ""} supera el máximo tabulado para ${fTBasis}: el cable no admite esa temperatura.`,
    });
    return null;
  }
  if (ft.clamped) {
    alerts.push({
      level: "info",
      code: "FT-MIN",
      message: `Temperatura de ${fmt(theta, 0)} °C por debajo de la tabla: se aplicó el factor de la menor temperatura tabulada (conservador).`,
    });
  }
  // Los conductores en paralelo cuentan como circuitos adicionales en el agrupamiento.
  const nEff = Math.max(1, inp.circuits) + Math.max(1, inp.parallel) - 1;
  let fA = 1;
  let fABasis = `cables espaciados (sin reducción) · ${nEff} circuito(s)`;
  if (grouping !== "none") {
    const g = groupingFactor(grouping, nEff);
    fA = g.value;
    fABasis = `${groupingLabel(grouping)} · ${nEff} circuito(s) · ${g.source}`;
    if (g.saturated) {
      alerts.push({
        level: "warning",
        code: "FA-RANGO",
        message: `Agrupamiento de ${nEff} circuitos supera la tabla (${groupingLabel(grouping)}): se aplicó el último valor tabulado (${fmt(fA, 2)}). Verificar.`,
      });
    }
    if (g.usedFallback) {
      alerts.push({
        level: "info",
        code: "FA-UNI",
        message: `La tabla de unipolares (IEC B.52.21) llega a 3 circuitos: para ${nEff} se tomó el menor valor con la tabla de multipolares (conservador).`,
      });
    }
  }
  const fr = buried ? frFor(inp.soilRho, inp.routing === "cano_enterrado") : 1;
  return {
    fT: ft.value,
    fA,
    fr,
    total: ft.value * fA * fr,
    fTBasis: `${fTBasis} · θ de cálculo ${fmt(theta, 0)} °C${solar ? ` (incluye +${fmt(solar, 0)} °C por radiación solar)` : ""}`,
    fABasis,
  };
}

// ---------------------------------------------------------------------------
// Protecciones: solo especificaciones (sin selección de calibres comerciales)
// ---------------------------------------------------------------------------

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";

/** Formato científico legible: 1,00 × 10⁸. */
function sci(v: number): string {
  const e = Math.floor(Math.log10(v));
  const exp = String(e)
    .split("")
    .map((c) => (c === "-" ? "⁻" : SUP[Number(c)]))
    .join("");
  return `${fmt(v / 10 ** e, 2)} × 10${exp}`;
}

/**
 * Especificación de la protección termomagnética del circuito de CA (AEA 90364-4-43 / IEC 60364-4-43):
 * I_diseño ≤ I_n ≤ I_z, I₂ ≤ 1,45·I_z, poder de corte ≥ I″k y energía pasante I²t ≤ k²S².
 */
/** Corrientes asignadas preferentes de interruptores IEC 60898-1 / IRAM 2169 (hasta 125 A). */
export const MCB_RATINGS = [6, 8, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];

/**
 * ¿Existe una protección normalizada con I_diseño ≤ I_n ≤ I_z?
 * - Hasta 125 A: debe haber una corriente asignada preferente de IEC 60898-1 dentro del rango.
 * - Por encima de 125 A: interruptor IEC 60947-2 con regulación térmica I_r ajustable (cualquier valor del rango).
 */
export function protectionRatings(lo: number, hi: number): { ok: boolean; ratings: number[]; adjustable: boolean } {
  const ratings = MCB_RATINGS.filter((r) => r >= lo - 1e-9 && r <= hi + 1e-9);
  const adjustable = hi > 125 && lo <= hi + 1e-9;
  return { ok: ratings.length > 0 || adjustable, ratings, adjustable };
}

function acProtectionSpec(inp: CalcInputs, iDesign: number, ev: SectionEval, k: number): ProtectionResult {
  const n = Math.max(1, inp.parallel);
  const poles =
    inp.phase === "mono" ? "2 polos (fase + neutro)" : inp.withNeutral ? "4 polos (3 fases + neutro)" : "3 polos";
  const ue = inp.phase === "mono" ? `≥ ${fmt(inp.voltage, 0)} V CA` : `≥ ${fmt(inp.voltage, 0)} V CA (entre fases)`;
  const i2t = (k * ev.section * n) ** 2;
  const pr = protectionRatings(iDesign, ev.iz);
  const std =
    ev.iz <= 125
      ? "IEC 60898-1 / IRAM 2169 (hasta 125 A) o IEC 60947-2"
      : iDesign > 125
        ? "IEC 60947-2"
        : "IEC 60898-1 / IRAM 2169 (si I_n ≤ 125 A) o IEC 60947-2";
  const specs = [
    { label: "Tipo", value: "Interruptor automático termomagnético" },
    {
      label: "Corriente nominal (I_n) o regulación térmica (I_r)",
      value: `Entre ${fmt(iDesign)} A y ${fmt(ev.iz)} A (I_diseño ≤ I_n ≤ I_z)`,
    },
    {
      label: "Valores normalizados en el rango",
      value:
        [
          pr.ratings.length ? `I_n = ${pr.ratings.map((r) => `${r} A`).join(" · ")} (IEC 60898-1)` : "",
          pr.adjustable ? `I_r regulable entre ${fmt(Math.max(iDesign, 125))} A y ${fmt(ev.iz)} A (IEC 60947-2)` : "",
        ]
          .filter(Boolean)
          .join(" · o ") || "Ninguno: aumentar la sección",
    },
    { label: "Condición de sobrecarga", value: `I₂ ≤ 1,45·I_z = ${fmt(1.45 * ev.iz)} A` },
    { label: "Polos", value: poles },
    { label: "Tensión nominal de empleo", value: ue },
    {
      label: "Poder de corte",
      value:
        inp.ikKa > 0
          ? `≥ ${fmt(inp.ikKa)} kA (I″k máx. en el punto de instalación)`
          : "≥ I″k máx. en el punto de instalación (no ingresada)",
    },
    { label: "Energía específica pasante", value: `I²t ≤ k²·S² = ${sci(i2t)} A²s (k = ${k})` },
    { label: "Norma del interruptor", value: std },
  ];
  const notes: string[] = [];
  if (n > 1) notes.push(`Protección común para los ${n} conductores en paralelo por polo; I_z incluye los ${n} conductores.`);
  if (inp.circuitType === "inversor") notes.push("Verificar además el rango de protección de salida que admite el fabricante del inversor.");
  return {
    ok: ev.iz >= iDesign - 1e-9 && pr.ok,
    rangeMin: iDesign,
    rangeMax: ev.iz,
    summary: `Termomagnética de ${poles.split(" (")[0]}, I_n entre ${fmt(iDesign)} A y ${fmt(ev.iz)} A`,
    specs,
    notes,
  };
}

function dcProtectionSpec(inp: CalcInputs, ev: SectionEval): ProtectionResult {
  const omit = {
    label: "Protección de sobrecarga del cable",
    value: `No requerida (AEA 90364-7-712.433a): I_z = ${fmt(ev.iz)} A ≥ 1,25·${inp.dcRole === "string" ? "" : "N·"}I_sc CEN`,
  };
  const seccion = { label: "Seccionamiento", value: "Interruptor-seccionador de CC según AEA 90364-7-712" };
  const np = Math.max(1, inp.stringsAtCombiner);
  if (inp.dcRole === "principal" || np <= 2) {
    return {
      ok: true,
      rangeMin: null,
      rangeMax: null,
      summary: "Sin protección de sobrecarga (AEA 712.433a)",
      specs: [
        omit,
        ...(inp.dcRole === "string"
          ? [{ label: "Fusible de cadena", value: `No requerido con ${np} cadena(s) en paralelo (IEC 62548, referencia)` }]
          : []),
        seccion,
      ],
      notes: [],
    };
  }
  const lower = 1.5 * inp.iscStc;
  let upper = Math.min(2.4 * inp.iscStc, ev.iz);
  if (inp.moduleMaxFuse > 0) upper = Math.min(upper, inp.moduleMaxFuse);
  const ok = lower <= upper + 1e-9;
  return {
    ok,
    rangeMin: ok ? lower : null,
    rangeMax: ok ? upper : null,
    summary: ok ? `Fusible gPV, I_n entre ${fmt(lower)} A y ${fmt(upper)} A` : "Sin rango admisible para el fusible gPV",
    specs: [
      omit,
      { label: "Fusible de cadena", value: "gPV (IEC 60269-6) en polo + y polo −" },
      {
        label: "Corriente nominal del fusible",
        value: ok
          ? `Entre 1,5·I_sc = ${fmt(lower)} A y ${fmt(upper)} A (IEC 62548, referencia)`
          : `No existe rango: 1,5·I_sc = ${fmt(lower)} A supera el máximo admisible (${fmt(upper)} A). Revisar el fusible máximo del módulo.`,
      },
      { label: "Tensión nominal", value: "≥ tensión máxima de la cadena (V_oc a la temperatura mínima)" },
      seccion,
    ],
    notes: [],
  };
}

// ---------------------------------------------------------------------------
// Dimensionamiento por familia
// ---------------------------------------------------------------------------

function sortedSections(...tables: BySection[]): number[] {
  const keys = Object.keys(tables[0]).map(Number);
  return keys.filter((s) => tables.every((t) => t[s] !== undefined)).sort((a, b) => a - b);
}

function acCableLabel(inp: CalcInputs, formation: Formation, s: number): string {
  const sTxt = fmt(s, s % 1 ? 1 : 0);
  const mat = inp.material === "Al" ? "Al" : "Cu";
  const n = Math.max(1, inp.parallel);
  const pre = n > 1 ? `${n} ternas en paralelo de ` : "";
  const tri = inp.phase === "tri";
  const neutral = !tri || inp.withNeutral;
  if (formation === "uni") {
    const k = tri ? (neutral ? 4 : 3) : 2;
    const what = tri ? (neutral ? "3 fases + neutro" : "3 fases, sin neutro") : "fase + neutro";
    return `${pre}${k} unipolares 1 × ${sTxt} mm² ${mat} (${what})`;
  }
  if (formation === "bi") return `${pre}Bipolar 2 × ${sTxt} mm² ${mat} (fase + neutro)`;
  return neutral
    ? `${pre}Tetrapolar 3 × ${sTxt} + 1 × ${sTxt} mm² ${mat} (3 fases + neutro)`
    : `${pre}Tripolar 3 × ${sTxt} mm² ${mat} (3 fases, sin neutro)`;
}

function emptyResult(
  id: FamilyResult["familyId"],
  name: string,
  norma: string,
  insulation: string,
  method: FamilyResult["method"],
  formation: Formation,
  sMin: number,
  alerts: Alert[],
): FamilyResult {
  return {
    familyId: id,
    familyName: name,
    norma,
    insulation,
    alerts,
    blocked: alerts.some((a) => a.level === "error"),
    method,
    formation,
    factors: null,
    sMin,
    sCalc: null,
    userSection: false,
    sectionOptions: [],
    sTableMin: null,
    sAmp: null,
    sDu: null,
    sSc: null,
    sProt: null,
    final: null,
    curve: [],
    cableLabel: "",
    protection: null,
    dataNotes: [],
  };
}

function sizeAcFamily(
  inp: CalcInputs,
  fam: AcFamily,
  mi: MethodInfo,
  ib: number,
  iDesign: number,
  duLimit: number,
  sMin: number,
): FamilyResult | null {
  if (!fam.materials.includes(inp.material)) return null;

  const insulation = fam.covering;
  const base = emptyResult(fam.id, fam.name, fam.norma, insulation, mi.method, mi.formation, sMin, acFamilyAlerts(inp, fam));
  const alerts = base.alerts;

  const rxFam = fam.rx[inp.material];
  // Multipolar 3F+N: X' del tetrapolar si el catálogo la da por separado.
  const rx = (mi.formation === "tri" && inp.phase === "tri" && inp.withNeutral && rxFam?.tetra) || rxFam?.[mi.formation];
  const amp = fam.ampacity[inp.material]?.[mi.method];
  if (!rx || !amp) {
    alerts.push({ level: "error", code: "SIN-DATOS", message: `${fam.name}: sin datos de catálogo para esta formación y método.` });
    base.blocked = true;
    return base;
  }

  const fTTable = mi.buried ? FT_GROUND[fam.insulation] : FT_AIR[fam.insulation];
  const fTBasis = mi.buried ? `${fam.insulation} en terreno (base 25 °C)` : `${fam.insulation} al aire (base 40 °C)`;
  const factors = computeFactors(inp, mi.grouping, mi.buried, fTTable, fTBasis, alerts);
  base.factors = factors;
  if (!factors) {
    base.blocked = true;
    return base;
  }

  const n = Math.max(1, inp.parallel);
  const cos = inp.cosPhi;
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  const kPh = inp.phase === "mono" ? 2 : Math.sqrt(3);
  const k = kFactor(inp.material, fam.insulation);
  const sMinSc = inp.ikKa > 0 && inp.tScS > 0 ? (inp.ikKa * 1000 * Math.sqrt(inp.tScS)) / k : null;

  const evals: SectionEval[] = sortedSections(rx as unknown as BySection, amp).map((s) => {
    const [r, x] = rx[s];
    const i0 = amp[s];
    const iz = i0 * factors.total * n;
    const duV = (kPh * (inp.lengthM / 1000) * ib * (r * cos + x * sin)) / n;
    return { section: s, r, x, i0, iz, duV, duPct: (duV / inp.voltage) * 100 };
  });

  base.sTableMin = evals[0]?.section ?? null;
  const okMin = (e: SectionEval) => e.section >= sMin - 1e-9;
  const okAmp = (e: SectionEval) => e.iz >= iDesign - 1e-9;
  const okDu = (e: SectionEval) => e.duPct <= duLimit + 1e-9;
  const okSc = (e: SectionEval) => sMinSc === null || e.section * n >= sMinSc - 1e-9;
  // Coordinación: debe existir una protección normalizada con I_diseño ≤ I_n ≤ I_z (AEA 90364-4-43, 433.1).
  const okProt = (e: SectionEval) => protectionRatings(iDesign, e.iz).ok;
  base.curve = evals.map((e) => {
    const fail = !okAmp(e)
      ? "I_z menor que I diseño"
      : !okProt(e)
        ? "sin I_n normalizada entre I diseño e I_z"
        : !okDu(e)
        ? `ΔU ${fmt(e.duPct, 2)} % supera el límite`
        : !okMin(e)
          ? inp.material === "Al" && e.section < AL_MIN_SECTION
            ? `aluminio: sección mínima ${AL_MIN_SECTION} mm²`
            : "menor que la sección mínima reglamentaria"
          : !okSc(e)
            ? "no verifica el esfuerzo térmico de cortocircuito"
            : null;
    return { section: e.section, iz: e.iz, duPct: e.duPct, ok: fail === null, fail };
  });

  base.sAmp = evals.find(okAmp)?.section ?? null;
  base.sDu = evals.find(okDu)?.section ?? null;
  base.sSc = sMinSc === null ? null : (evals.find(okSc)?.section ?? null);
  base.sProt = evals.find((e) => okAmp(e) && okProt(e))?.section ?? null;
  const minimal = evals.find((e) => okMin(e) && okAmp(e) && okProt(e) && okDu(e) && okSc(e)) ?? null;
  base.sCalc = minimal?.section ?? null;
  // Elección del usuario: cualquier sección comercial mayor que la mínima de cálculo.
  let final = minimal;
  if (minimal) {
    base.sectionOptions = evals.filter((e) => e.section >= minimal.section).map((e) => e.section);
    if (inp.sectionChoice > 0 && inp.sectionChoice !== minimal.section) {
      const chosen = evals.find((e) => e.section === inp.sectionChoice);
      if (chosen && base.sectionOptions.includes(chosen.section)) {
        final = chosen;
        base.userSection = true;
      } else {
        alerts.push({
          level: "warning",
          code: "SECCION-USR",
          message: `La sección elegida (${fmt(inp.sectionChoice, inp.sectionChoice % 1 ? 1 : 0)} mm²) no cumple para ${fam.name}: se muestra la mínima de cálculo (${fmt(minimal.section, minimal.section % 1 ? 1 : 0)} mm²).`,
        });
      }
    }
  }
  base.final = final;

  if (!final) {
    alerts.push({
      level: "error",
      code: "SIN-SECCION",
      message: `${fam.name}: ninguna sección comercial cumple todos los criterios. Aumentar conductores en paralelo o revisar la canalización.`,
    });
    base.blocked = true;
    return base;
  }

  if (final.section === base.sTableMin && (base.sAmp ?? 0) <= final.section && mi.formation === "uni" && /^[FG]_/.test(mi.method)) {
    alerts.push({
      level: "warning",
      code: "WRN-04",
      message: `Unipolares en bandeja: la AEA 90364-7-771 no contempla secciones menores a ${fmt(final.section, 0)} mm² (el pandeo de la bandeja puede dañar el cable), por eso resulta ${fmt(final.section, 0)} mm² aunque la corriente admitiría una sección menor. Para esta corriente corresponde cable multipolar.`,
    });
  }
  base.cableLabel = acCableLabel(inp, mi.formation, final.section);
  if (inp.phase === "tri" && inp.withNeutral && final.section > (inp.material === "Cu" ? 16 : 25)) {
    alerts.push({
      level: "info",
      code: "NEUTRO",
      message: `Neutro de igual sección que las fases. Puede reducirse (mín. ${inp.material === "Cu" ? 16 : 25} mm²) solo con cargas equilibradas, baja distorsión armónica y neutro protegido (AEA 90364-5-52, 524.2 — verificar).`,
    });
  }
  // Sección que cumple todo salvo la coordinación: si es menor que la final, el cable se aumentó por la protección.
  base.protection = acProtectionSpec(inp, iDesign, final, k);
  if (mi.note) base.dataNotes.push(mi.note);
  const notes = fam.ampacityNotes?.[inp.material]?.[mi.method] ?? [];
  base.dataNotes.push(
    ...notes.filter((nt) => nt.section === undefined || nt.section === final.section).map((nt) => nt.text),
  );
  return base;
}

function sizeSolar(inp: CalcInputs, iOp: number, iReq: number, duLimit: number): FamilyResult {
  const buried = inp.dcInstallation === "PV_BURIED";
  // Enterrado: sin dato del fabricante → columna «dos en contacto sobre superficie» (decisión FASE 1, §10).
  const method: PvMethodKey = buried ? "PV_SURF2" : (inp.dcInstallation as PvMethodKey);
  const base = emptyResult("solar", cableSolar.name, cableSolar.norma, cableSolar.covering, method, "uni", DC_MIN_SECTION, []);
  const alerts = base.alerts;

  const grouping: GroupingTable | "none" = buried ? buriedGrouping(inp, true) : inp.spaced ? "none" : "trayPerforated";
  const factors = computeFactors(
    inp,
    grouping,
    buried,
    buried ? FT_GROUND.XLPE : FT_SOLAR_AIR,
    buried ? "XLPE en terreno (base 25 °C)" : "cable solar al aire (base 30 °C)",
    alerts,
  );
  base.factors = factors;
  if (!factors) {
    base.blocked = true;
    return base;
  }

  const n = Math.max(1, inp.parallel);
  const amp = cableSolar.ampacity[method];
  const evals: SectionEval[] = sortedSections(cableSolar.r90, amp).map((s) => {
    const r = cableSolar.r90[s];
    const i0 = amp[s];
    const iz = i0 * factors.total * n;
    const duV = (2 * (inp.lengthM / 1000) * iOp * r) / n;
    return { section: s, r, x: 0, i0, iz, duV, duPct: (duV / inp.vmpString) * 100 };
  });

  base.curve = evals.map((e) => {
    const fail =
      e.iz < iReq - 1e-9 ? "I_z menor que I diseño" : e.duPct > duLimit + 1e-9 ? `ΔU ${fmt(e.duPct, 2)} % supera el límite` : null;
    return { section: e.section, iz: e.iz, duPct: e.duPct, ok: fail === null, fail };
  });
  base.sAmp = evals.find((e) => e.iz >= iReq - 1e-9)?.section ?? null;
  base.sDu = evals.find((e) => e.duPct <= duLimit + 1e-9)?.section ?? null;
  const minimal = evals.find((e) => e.iz >= iReq - 1e-9 && e.duPct <= duLimit + 1e-9) ?? null;
  base.sCalc = minimal?.section ?? null;
  let final = minimal;
  if (minimal) {
    base.sectionOptions = evals.filter((e) => e.section >= minimal.section).map((e) => e.section);
    const chosen = evals.find((e) => e.section === inp.sectionChoice);
    if (inp.sectionChoice > 0 && chosen && chosen.section > minimal.section) {
      final = chosen;
      base.userSection = true;
    }
  }
  base.final = final;
  if (!final) {
    alerts.push({
      level: "error",
      code: "SIN-SECCION",
      message: "Ninguna sección de cable solar cumple ampacidad y caída de tensión. Aumentar conductores en paralelo o reducir la longitud.",
    });
    base.blocked = true;
    return base;
  }

  base.cableLabel = `${n > 1 ? `${n} × ` : ""}2 unipolares 1 × ${fmt(final.section, 0)} mm² Cu estañado (polo + y polo −)`;
  base.protection = dcProtectionSpec(inp, final);
  if (buried) {
    base.dataNotes.push(
      "Sin dato del fabricante para enterrado — verificar. Se usó la columna «dos cables en contacto sobre superficie» corregida por terreno.",
    );
  }
  if (duLimit > 1 && final.duPct > 1) {
    alerts.push({
      level: "warning",
      code: "WRN-05",
      message: `ΔU = ${fmt(final.duPct, 2)} %: supera el 1 % recomendado (AEA 712), dentro del máximo de 1,5 %.`,
    });
  }
  return base;
}

// ---------------------------------------------------------------------------
// Entrada principal
// ---------------------------------------------------------------------------

function duLimitFor(inp: CalcInputs): { limit: number; source: string; normative: number } {
  const normative = inp.side === "DC" ? inp.dcLimitPct : CIRCUITS[inp.circuitType].du;
  const source = inp.side === "DC" ? "AEA 712" : CIRCUITS[inp.circuitType].duSource;
  if (inp.duLimitOverride > 0) {
    return { limit: Math.min(inp.duLimitOverride, normative), source: "límite de proyecto", normative };
  }
  return { limit: normative, source, normative };
}

/**
 * Cálculo completo. Con `parallel = 0` (automático) elige la menor cantidad de conductores por polo con la que
 * la sección resultante no supera MAX_SECTION_PER_CONDUCTOR; si ninguna lo logra, la menor cantidad que cumple.
 * El agrupamiento de los conductores en paralelo ya se contempla en computeFactors (cada uno cuenta como circuito).
 */
export function calculate(inp: CalcInputs): CalcResult {
  if (inp.parallel > 0) return calculateFixed(inp, false);
  let fallback: number | null = null;
  let chosen: number | null = null;
  for (let n = 1; n <= MAX_PARALLEL && chosen === null; n++) {
    // La cantidad se decide con la sección mínima de cálculo; la elección manual de sección se aplica después.
    const r = calculateFixed({ ...inp, parallel: n, sectionChoice: 0 }, true);
    // Errores de entrada (no dependen del paralelo): se informan sin seguir probando.
    if (r.globalAlerts.some((a) => a.level === "error" && a.code !== "SIN-FAMILIA")) {
      return calculateFixed({ ...inp, parallel: n }, true);
    }
    const s = r.shown?.final?.section;
    if (s == null) continue;
    fallback ??= n;
    if (s <= MAX_SECTION_PER_CONDUCTOR) chosen = n;
  }
  const n = chosen ?? fallback ?? MAX_PARALLEL;
  const res = calculateFixed({ ...inp, parallel: n }, true);
  if (fallback === null) {
    const e = res.globalAlerts.find((a) => a.code === "SIN-FAMILIA");
    if (e) {
      e.message = `Ninguna sección cumple ni con ${MAX_PARALLEL} conductores en paralelo por fase. Dividir la instalación en más circuitos, cambiar la canalización (por ejemplo, bandeja perforada o enterrado en lugar de caño) o revisar los datos.`;
    }
  }
  if (n > 1 && res.shown?.final) {
    res.globalAlerts.push({
      level: "warning",
      code: "PARALELO",
      message: `Se adoptan ${n} conductores por fase en paralelo: con ${n - 1 === 1 ? "uno solo" : `${n - 1}`} la sección superaría ${MAX_SECTION_PER_CONDUCTOR} mm² o ninguna sección cumpliría. Los conductores en paralelo deben tener igual material, sección, longitud y recorrido, y conectarse en los mismos bornes (AEA 90364-5-52 / IEC 60364-5-52, 523.7). Ya se aplicó el factor de agrupamiento entre ternas.`,
    });
  }
  return res;
}

function calculateFixed(inp: CalcInputs, auto: boolean): CalcResult {
  const { ib, iRequired } = projectCurrent(inp);
  const du = duLimitFor(inp);
  const sMin =
    inp.side === "DC"
      ? DC_MIN_SECTION
      : Math.max(CIRCUITS[inp.circuitType].sMin, inp.material === "Al" ? AL_MIN_SECTION : 0);
  const gAlerts = globalAlerts(inp, ib);
  if (inp.duLimitOverride > du.normative) {
    gAlerts.push({
      level: "warning",
      code: "DU-PROY",
      message: `El límite de ΔU de proyecto (${fmt(inp.duLimitOverride, 1)} %) supera el reglamentario (${fmt(du.normative, 1)} %): se aplica el reglamentario.`,
    });
  }
  const result: CalcResult = {
    ib,
    iRequired,
    duLimitPct: du.limit,
    duLimitSource: du.source,
    sMin,
    globalAlerts: gAlerts,
    results: [],
    recommendation: null,
    recommended: null,
    shown: null,
    parallel: Math.max(1, inp.parallel),
    parallelAuto: auto,
  };
  if (gAlerts.some((a) => a.level === "error")) return result;

  if (inp.side === "DC") {
    result.recommendation = recommend(inp, []);
    if (inp.family !== "solar" && inp.family !== "auto") return result; // ERR-05 ya informado
    const r = sizeSolar(inp, ib, iRequired, du.limit);
    result.results = [r];
    result.recommended = r.blocked ? null : r;
    result.shown = r;
    return result;
  }

  const mi = acMethod(inp);
  result.results = AC_FAMILIES.map((f) => sizeAcFamily(inp, f, mi, ib, iRequired, du.limit, sMin)).filter(
    (r): r is FamilyResult => r !== null,
  );
  result.recommendation = recommend(inp, result.results);
  const valid = result.results.filter((r) => !r.blocked && r.final);
  const preferred = valid.find((r) => r.familyId === result.recommendation?.familyId);
  // Si la familia preferida por norma/ambiente no tiene solución, se toma la de menor sección.
  result.recommended =
    preferred ??
    valid.reduce<FamilyResult | null>(
      (best, r) => (best === null || r.final!.section < best.final!.section ? r : best),
      null,
    );
  result.shown =
    inp.family === "auto" ? result.recommended : (result.results.find((r) => r.familyId === inp.family) ?? null);

  if (inp.family !== "auto" && inp.family !== "solar" && !result.shown) {
    gAlerts.push({
      level: "error",
      code: "MATERIAL",
      message: `${AC_FAMILIES.find((f) => f.id === inp.family)?.name} no se fabrica en ${inp.material === "Al" ? "aluminio" : "cobre"}.`,
    });
  }
  if (inp.family === "auto" && !result.recommended && result.results.length > 0) {
    gAlerts.push({
      level: "error",
      code: "SIN-FAMILIA",
      message: "Ninguna familia de cable admitida cumple las condiciones. Revise las alertas de cada familia.",
    });
  }
  return result;
}
