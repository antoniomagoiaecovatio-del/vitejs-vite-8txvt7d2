// Tipos de la base de datos técnica.
// Fuente de todos los valores: electrical_rules_y_datos.md (FASE 1).

export type Material = "Cu" | "Al";

/** Formación del cable: unipolar, bipolar o tri/tetrapolar. */
export type Formation = "uni" | "bi" | "tri";

/**
 * Claves de método de instalación (AEA 90364-7-771 / IEC 60364-5-52).
 * Sufijo: 2c/3c = multipolar con 2/3 conductores cargados; 2u/3u = unipolares.
 */
export type MethodKey =
  | "B2_2c"
  | "B2_3c"
  | "C_2c"
  | "C_3c"
  | "E_2c"
  | "E_3c"
  | "F_2u"
  | "F_3u_trebol"
  | "F_3u_plano"
  | "G_3u_horiz"
  | "G_3u_vert"
  | "D1_2c"
  | "D1_3c"
  | "D2_3u"
  | "D2_2c"
  | "D2_3c";

/** Claves de instalación del cable solar H1Z2Z2-K (catálogo de referencia PRY-AR p.4). */
export type PvMethodKey = "PV_AIR" | "PV_SURF1" | "PV_SURF2";

/** Mapa sección (mm²) → valor. */
export type BySection = Record<number, number>;

/** Mapa sección (mm²) → [R' Ω/km, X' Ω/km]. */
export type RxTable = Record<number, [number, number]>;

export type AcFamilyId = "pvc" | "xlpe" | "lsoh";
export type FamilyId = AcFamilyId | "solar";

export interface DataNote {
  /** Sección a la que aplica la nota (undefined = toda la tabla). */
  section?: number;
  text: string;
}

export interface AcFamily {
  id: AcFamilyId;
  /** Denominación genérica (sin marca). */
  name: string;
  norma: string;
  /** Recubrimiento: aislación y envoltura. */
  covering: string;
  insulation: "PVC" | "XLPE";
  /** Material de la envoltura exterior. */
  jacket: "PVC" | "LSOH";
  halogenFree: boolean;
  hasJacket: boolean;
  /** Temperatura máxima de servicio (°C) — a la que está dado R'. */
  thetaMax: number;
  thetaSc: number;
  materials: Material[];
  /** R'/X' por formación. `tetra` (opcional): tetrapolar 3F+N cuando el catálogo da una X' distinta del tripolar. */
  rx: Partial<Record<Material, Partial<Record<Formation | "tetra", RxTable>>>>;
  ampacity: Partial<Record<Material, Partial<Record<MethodKey, BySection>>>>;
  /** Notas de calidad de dato por material y método (erratas, ajustes). */
  ampacityNotes?: Partial<Record<Material, Partial<Record<MethodKey, DataNote[]>>>>;
  source: string;
}

export interface PvFamily {
  id: "solar";
  name: string;
  norma: string;
  covering: string;
  thetaMax: number;
  thetaSc: number;
  /** R a 90 °C (Ω/km) — IEC 60228 clase 5 estañado × 1,28 (§3.6). */
  r90: BySection;
  ampacity: Record<PvMethodKey, BySection>;
  source: string;
}
