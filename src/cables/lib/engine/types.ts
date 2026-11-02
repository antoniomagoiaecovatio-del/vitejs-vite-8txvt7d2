import type { AcFamilyId, Formation, Material, MethodKey, PvMethodKey } from "../data/types";

export type Side = "AC" | "DC";
export type Phase = "mono" | "tri";

/** Tipo de circuito de CA → límite de ΔU, sección mínima y factor de diseño. */
export type CircuitType = "iluminacion" | "tomacorrientes" | "fuerza" | "seccional" | "principal" | "inversor";

/** Canalización de CA (el método AEA se deduce de canalización + formación). */
export type Routing =
  | "cano"
  | "bandeja_ciega"
  | "bandeja_perforada"
  | "bandeja_escalera"
  | "cano_enterrado"
  | "enterrado";

export type CableForm = "multi" | "uni";

/** Disposición de unipolares en bandeja perforada / escalera. */
export type UniArrangement = "trebol" | "plano" | "sep_horiz" | "sep_vert";

/** Disposición de unipolares directamente enterrados. */
export type BuriedArrangement = "trebol" | "plano" | "plano_sep";

/** Separación entre circuitos enterrados (define la tabla de agrupamiento IEC B.52.18 / B.52.19). */
export type BuriedSpacing = "contacto" | "1d" | "0.125" | "0.25" | "0.5" | "1.0";

export type DcInstallation = PvMethodKey | "PV_BURIED";

export type ConduitType = "rigido" | "corrugado_autoext" | "metalico" | "corrugado_naranja";

export type FamilyChoice = "auto" | AcFamilyId | "solar";

export interface CalcInputs {
  side: Side;

  // --- CA ---
  phase: Phase;
  /** Trifásica: instalación con neutro (3F+N) o sin neutro (3F). */
  withNeutral: boolean;
  voltage: number;
  loadMode: "power" | "current";
  powerKw: number;
  current: number;
  cosPhi: number;
  circuitType: CircuitType;
  /** Factor de servicio continuo aplicado a la corriente de diseño (salida de inversor). 1 = I máx. del manual. */
  serviceFactor: number;
  routing: Routing;
  cableForm: CableForm;
  uniArrangement: UniArrangement;
  buriedArrangement: BuriedArrangement;
  buriedSpacing: BuriedSpacing;
  material: Material;

  // --- CC fotovoltaica ---
  dcRole: "string" | "principal";
  iscStc: number;
  impStc: number;
  vmpString: number;
  nStrings: number;
  /** Cadenas en paralelo en la misma entrada (evaluación de fusibles gPV). */
  stringsAtCombiner: number;
  /** Máx. fusible serie declarado por el fabricante del módulo (A), 0 = sin dato. */
  moduleMaxFuse: number;
  dcLimitPct: 1 | 1.5;
  dcInstallation: DcInstallation;

  // --- Comunes ---
  lengthM: number;
  /** Límite de ΔU propio del proyecto (%), 0 = usar el reglamentario. */
  duLimitOverride: number;
  family: FamilyChoice;
  /** Conductores en paralelo por polo: 0 = automático (el programa elige), 1…8 = fijo. */
  parallel: number;
  circuits: number;
  spaced: boolean;
  ambientTemp: number;
  /** Incremento de temperatura por radiación solar directa (°C), solo instalaciones al aire. */
  solarDelta: number;
  groundTemp: number;
  soilRho: number;
  conduit: ConduitType;
  location: "estandar" | "publica";
  environment: "interior" | "intemperie";

  /** Sección elegida por el usuario (mm²); 0 = la mínima que cumple el cálculo. */
  sectionChoice: number;

  // --- Cortocircuito (CA) ---
  ikKa: number;
  tScS: number;
}

export type AlertLevel = "error" | "warning" | "info";

export interface Alert {
  level: AlertLevel;
  code: string;
  message: string;
}

export interface SectionEval {
  section: number;
  r: number;
  x: number;
  i0: number;
  iz: number;
  duV: number;
  duPct: number;
}

export interface Factors {
  fT: number;
  fA: number;
  fr: number;
  total: number;
  fTBasis: string;
  fABasis: string;
}

export interface ProtectionResult {
  /** true si existe un rango admisible para la protección. */
  ok: boolean;
  /** Rango admisible de la corriente nominal de la protección (A); null si no corresponde. */
  rangeMin: number | null;
  rangeMax: number | null;
  summary: string;
  /** Especificaciones que debe cumplir la protección (sin marca ni calibre comercial). */
  specs: { label: string; value: string }[];
  notes: string[];
}

export interface FamilyResult {
  familyId: AcFamilyId | "solar";
  familyName: string;
  norma: string;
  insulation: string;
  alerts: Alert[];
  blocked: boolean;
  method: MethodKey | PvMethodKey;
  formation: Formation;
  factors: Factors | null;
  sMin: number;
  /** Menor sección que cumple todos los criterios (antes de la elección del usuario). */
  sCalc: number | null;
  /** true si la sección mostrada la eligió el usuario (mayor que sCalc). */
  userSection: boolean;
  /** Secciones comerciales que el usuario puede elegir (≥ sCalc). */
  sectionOptions: number[];
  /** Menor sección tabulada en el catálogo para el método elegido. */
  sTableMin: number | null;
  sAmp: number | null;
  sDu: number | null;
  sSc: number | null;
  /** Menor sección con I_z ≥ I diseño y una I_n normalizada entre ambas (solo CA). */
  sProt: number | null;
  final: SectionEval | null;
  /**
   * Cada sección comercial evaluada (gráfico): I_z corregida, ΔU y si cumple todos los criterios;
   * `fail` indica el primer criterio que no cumple.
   */
  curve: { section: number; iz: number; duPct: number; ok: boolean; fail: string | null }[];
  /** Formación y sección, p. ej. «Tetrapolar 3 × 70 + 1 × 70 mm² (N) · Cu». */
  cableLabel: string;
  protection: ProtectionResult | null;
  dataNotes: string[];
}

export interface Recommendation {
  /** Norma / tipo de cable exigido por la canalización y el local. */
  norma: string;
  insulation: string;
  familyId: AcFamilyId | "solar" | null;
  reasons: string[];
  admitted: string[];
}

export interface CalcResult {
  /** Corriente de proyecto I_B (CA) o corriente de operación N·Imp (CC). */
  ib: number;
  /** Corriente que debe cumplir Iz y la protección: I_B·factor en CA, 1,25·N·Isc en CC. */
  iRequired: number;
  duLimitPct: number;
  duLimitSource: string;
  sMin: number;
  globalAlerts: Alert[];
  results: FamilyResult[];
  recommendation: Recommendation | null;
  recommended: FamilyResult | null;
  shown: FamilyResult | null;
  /** Conductores en paralelo por polo usados en el cálculo (resuelto si la entrada es automática). */
  parallel: number;
  parallelAuto: boolean;
}
