// Pasos del cálculo en forma de datos (texto plano): los usan la «Memoria de cálculo» de la
// pantalla y el informe PDF, así ambos dicen exactamente lo mismo.
import { AL_MIN_SECTION, CIRCUITS, protectionRatings } from "../engine/calc";
import { kFactor } from "../data/protections";
import {
  FACTORS_SOURCE,
  FORMULAS_SOURCE,
  LIMITS_SOURCE,
  MIN_SECTION_SOURCE,
  SC_SOURCE,
  ampacitySource,
  rxSource,
  type Source,
} from "../data/sources";
import type { CalcInputs, CalcResult, FamilyResult } from "../engine/types";

export const n = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
export const mm = (s: number | null) => (s === null ? "—" : `${n(s, s % 1 ? 1 : 0)} mm²`);

export const METHOD_LABEL: Record<string, string> = {
  B2_2c: "B2 · cables en caño a la vista o embutido, 2 conductores cargados",
  B2_3c: "B2 · cables en caño a la vista o embutido, 3 conductores cargados",
  C_2c: "C · bandeja ciega o sobre pared, 2 conductores cargados",
  C_3c: "C · bandeja ciega o sobre pared, 3 conductores cargados",
  E_2c: "E · bandeja perforada o escalera, multipolar de 2 conductores cargados",
  E_3c: "E · bandeja perforada o escalera, multipolar de 3 conductores cargados",
  F_2u: "F · bandeja perforada, 2 unipolares en contacto",
  F_3u_trebol: "F · bandeja perforada, 3 unipolares en trébol",
  F_3u_plano: "F · bandeja perforada, 3 unipolares en plano",
  G_3u_horiz: "G · bandeja perforada, 3 unipolares separados (horizontal)",
  G_3u_vert: "G · bandeja perforada, 3 unipolares separados (vertical)",
  D1_2c: "D1 · caño enterrado, 2 conductores cargados",
  D1_3c: "D1 · caño enterrado, 3 conductores cargados",
  D2_3u: "D2 · 3 unipolares directamente enterrados",
  D2_2c: "D2 · directamente enterrado, 2 conductores cargados",
  D2_3c: "D2 · directamente enterrado, 3 conductores cargados",
  PV_AIR: "cable solar en suspensión al aire",
  PV_SURF1: "cable solar único sobre una superficie",
  PV_SURF2: "dos cables solares cargados en contacto sobre una superficie",
};

export interface StepSource {
  label: string;
  src?: Source;
  /** Texto libre cuando la fuente no es un catálogo con página. */
  text?: string;
}

export interface StepData {
  num: number;
  title: string;
  paragraphs: string[];
  formulas: string[];
  bullets: string[];
  sources: StepSource[];
  table?: { head: string[]; rows: { cells: string[]; ok: boolean }[] };
  /** Párrafo posterior a la tabla (protección). */
  after?: string;
  result: string;
}

export function buildSteps(r: FamilyResult, res: CalcResult, inputs: CalcInputs): StepData[] {
  const f = r.final!;
  const fac = r.factors!;
  const isDC = inputs.side === "DC";
  const par = Math.max(1, inputs.parallel);
  const insulation: "PVC" | "XLPE" = r.familyId === "pvc" ? "PVC" : "XLPE";
  const mat = isDC ? "Cu" : inputs.material;
  const cos = inputs.cosPhi;
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos));
  const sqrt3 = Math.sqrt(3);
  const ampSrc = ampacitySource(r.familyId, mat, r.method, f.section);
  const rxSrc = rxSource(r.familyId, mat, r.formation, f.section);
  const iDesign = res.iRequired;
  const ratings = protectionRatings(iDesign, f.iz);
  const steps: StepData[] = [];
  const add = (s: Partial<StepData> & { title: string; result: string }) =>
    steps.push({ num: steps.length + 1, paragraphs: [], formulas: [], bullets: [], sources: [], ...s });

  // 1 · Corriente de diseño
  if (isDC) {
    add({
      title: "Corriente de diseño",
      paragraphs: ["El cable debe soportar el 125 % de la corriente de cortocircuito del string (AEA 90364-7-712, 712.433a)."],
      formulas: [
        `I_diseño = 1,25 × N × I_sc = 1,25 × ${inputs.dcRole === "string" ? 1 : inputs.nStrings} × ${n(inputs.iscStc, 2)} A = ${n(iDesign)} A`,
      ],
      sources: [{ label: "Fuente", src: FORMULAS_SOURCE }],
      result: `I_diseño = ${n(iDesign)} A (operación N·I_mp = ${n(res.ib)} A)`,
    });
  } else {
    const formulas: string[] = [];
    if (inputs.loadMode === "power") {
      formulas.push(
        inputs.phase === "mono"
          ? `I_B = P ÷ (U · cos φ) = ${n(inputs.powerKw * 1000, 0)} W ÷ (${n(inputs.voltage, 0)} V × ${n(cos, 2)}) = ${n(res.ib)} A`
          : `I_B = P ÷ (√3 · U · cos φ) = ${n(inputs.powerKw * 1000, 0)} W ÷ (${n(sqrt3, 3)} × ${n(inputs.voltage, 0)} V × ${n(cos, 2)}) = ${n(res.ib)} A`,
      );
    } else {
      formulas.push(`I_B = ${n(res.ib)} A (corriente ingresada)`);
    }
    if (iDesign > res.ib + 1e-9) formulas.push(`I_diseño = I_B × factor de servicio ${n(inputs.serviceFactor, 2)} = ${n(iDesign)} A`);
    add({
      title: "Corriente de proyecto",
      formulas,
      sources: [{ label: "Fuente", src: FORMULAS_SOURCE }],
      result: `I_B = ${n(res.ib)} A${iDesign > res.ib + 1e-9 ? ` · I_diseño = ${n(iDesign)} A` : ""}`,
    });
  }

  // 2 · Sección mínima
  if (isDC) {
    add({
      title: "Sección mínima",
      paragraphs: ["El cable solar de este catálogo se fabrica desde 4 mm², por eso es la menor sección que se evalúa en CC."],
      sources: [{ label: "Fuente", src: ampSrc }],
      result: mm(res.sMin),
    });
  } else {
    add({
      title: "Sección mínima reglamentaria",
      paragraphs: [
        `Tipo de circuito: ${CIRCUITS[inputs.circuitType].label} → mínimo ${mm(CIRCUITS[inputs.circuitType].sMin)}${
          inputs.material === "Al" ? ` · aluminio: mínimo ${mm(AL_MIN_SECTION)} (criterio de diseño)` : ""
        }.`,
      ],
      sources: [{ label: "Fuente", text: MIN_SECTION_SOURCE }],
      result: mm(res.sMin),
    });
  }

  // 3 · Método e I₀
  add({
    title: "Método de instalación y corriente admisible base I₀",
    paragraphs: [`Método ${METHOD_LABEL[r.method] ?? r.method} · ${r.familyName} (${mat === "Cu" ? "cobre" : "aluminio"}).`],
    sources: [{ label: "Tabla de I₀", src: ampSrc }],
    result: `I₀ = ${n(f.i0, 0)} A para ${mm(f.section)}`,
  });

  // 4 · Factores
  const solarT = isDC && r.method.startsWith("PV_") && !/terreno/.test(fac.fTBasis);
  add({
    title: "Factores de corrección",
    formulas: [`f_total = fT × fA × fr = ${n(fac.fT, 3)} × ${n(fac.fA, 2)} × ${n(fac.fr, 2)} = ${n(fac.total, 3)}`],
    bullets: [
      `fT (temperatura): ${fac.fTBasis}`,
      `fA (agrupamiento): ${fac.fABasis}`,
      `fr (resistividad del terreno): ${fac.fr === 1 ? "no aplica / base 1,0 K·m/W" : "según el terreno elegido"}`,
    ],
    sources: solarT
      ? [
          {
            label: "Fuente de fT",
            text: "fórmula √[(90 − θ) ÷ (90 − 30)] (IEC 60364-5-52); el catálogo Prysun da I₀ a 30 °C de ambiente (PRYAR_Prysun_v05.pdf, pág. 4).",
          },
          { label: "Fuente de fA y fr", src: FACTORS_SOURCE.fA },
        ]
      : [
          { label: "Fuente de fT, fA y fr", src: FACTORS_SOURCE.fT },
          { label: "Agrupamiento y terreno", text: FACTORS_SOURCE.fA.note },
        ],
    result: `f_total = ${n(fac.total, 3)}`,
  });

  // 5 · Ampacidad
  const okAmp = f.iz >= iDesign - 1e-9;
  add({
    title: `Verificación por ampacidad (con la sección final, ${mm(f.section)})`,
    formulas: [`I_z = I₀ × f_total${par > 1 ? " × n" : ""} = ${n(f.i0, 0)} A × ${n(fac.total, 3)}${par > 1 ? ` × ${par}` : ""} = ${n(f.iz)} A`],
    paragraphs: par > 1 ? [`${par} conductores en paralelo por polo (la corriente se reparte entre ellos).`] : [],
    result: `I_z = ${n(f.iz)} A ${okAmp ? "≥" : "<"} I_diseño = ${n(iDesign)} A ${okAmp ? "✓" : "✗"} · sección por ampacidad ${mm(r.sAmp)}`,
  });

  // 6 · Caída de tensión
  const okDu = f.duPct <= res.duLimitPct + 1e-9;
  if (isDC) {
    add({
      title: `Caída de tensión en CC (con la sección final, ${mm(f.section)})`,
      formulas: [
        `ΔU = 2 · L · I_mp · R' ÷ n = 2 × ${n(inputs.lengthM / 1000, 3)} km × ${n(res.ib)} A × ${n(f.r, 3)} Ω/km ÷ ${par} = ${n(f.duV, 2)} V`,
        `ΔU % = ΔU ÷ V_mp × 100 = ${n(f.duV, 2)} V ÷ ${n(inputs.vmpString, 0)} V × 100 = ${n(f.duPct, 2)} %`,
      ],
      sources: [
        { label: "R' (resistencia a 90 °C)", src: rxSrc },
        { label: "Límite de ΔU (AEA 90364-7-712)", src: LIMITS_SOURCE },
      ],
      result: `ΔU = ${n(f.duPct, 2)} % ${okDu ? "≤" : ">"} límite ${n(res.duLimitPct, 1)} % · sección por ΔU ${mm(r.sDu)}`,
    });
  } else {
    add({
      title: `Caída de tensión (con la sección final, ${mm(f.section)})`,
      formulas: [
        `${inputs.phase === "mono" ? "ΔU = 2" : "ΔU = √3"} · L · I_B · (R'·cos φ + X'·sen φ)${par > 1 ? " ÷ n" : ""}`,
        `ΔU = ${inputs.phase === "mono" ? "2" : n(sqrt3, 3)} × ${n(inputs.lengthM / 1000, 3)} km × ${n(res.ib)} A × (${n(f.r, 3)} × ${n(cos, 2)} + ${n(f.x, 3)} × ${n(sin, 3)})${
          par > 1 ? ` ÷ ${par}` : ""
        } = ${n(f.duV, 2)} V`,
        `ΔU % = ΔU ÷ U × 100 = ${n(f.duV, 2)} V ÷ ${n(inputs.voltage, 0)} V × 100 = ${n(f.duPct, 2)} %`,
      ],
      sources: [
        { label: `R' = ${n(f.r, 3)} Ω/km · X' = ${n(f.x, 3)} Ω/km`, src: rxSrc },
        { label: "Límites de ΔU", src: LIMITS_SOURCE },
      ],
      result: `ΔU = ${n(f.duPct, 2)} % ${okDu ? "≤" : ">"} límite ${n(res.duLimitPct, 1)} % (${res.duLimitSource}) · sección por ΔU ${mm(r.sDu)}`,
    });
  }

  // 7 · Cortocircuito
  const kS = kFactor(mat, insulation);
  const showSc = !isDC && inputs.ikKa > 0 && inputs.tScS > 0;
  if (showSc) {
    add({
      title: "Cortocircuito (esfuerzo térmico)",
      formulas: [
        `k² · S² ≥ I² · t → S ≥ I_k · √t ÷ k = ${n(inputs.ikKa, 1)} kA × 1000 × √${n(inputs.tScS, 2)} s ÷ ${kS} = ${n((inputs.ikKa * 1000 * Math.sqrt(inputs.tScS)) / kS, 1)} mm²`,
      ],
      paragraphs: [`k = ${kS} (${insulation === "PVC" ? "aislación PVC, 160 °C" : "aislación XLPE, 250 °C"}, ${mat === "Cu" ? "cobre" : "aluminio"}).`],
      sources: [{ label: "Fuente", src: SC_SOURCE }],
      result: `sección mínima por cortocircuito ${mm(r.sSc)}`,
    });
  }

  // 8 · Sección final
  const tested = r.curve.filter((c) => c.section <= f.section + 1e-9).slice(-5);
  const rangeTxt = ratings.ratings.length > 0 ? ` (valores normalizados en el rango: ${ratings.ratings.join(" · ")} A)` : ratings.adjustable ? " (interruptor con regulación térmica)" : "";
  add({
    title: "Sección final",
    paragraphs: [
      `Se prueban las secciones comerciales en orden creciente y se toma la menor que cumple todo a la vez: sección mínima (${mm(res.sMin)}), ampacidad (${mm(r.sAmp)}), caída de tensión (${mm(r.sDu)})${
        isDC ? "" : `, protección (${mm(r.sProt)})`
      }${showSc ? `, cortocircuito (${mm(r.sSc)})` : ""}.`,
    ],
    table: {
      head: ["Sección", "I_z", "ΔU", "Resultado"],
      rows: tested.map((c) => ({
        cells: [mm(c.section), `${n(c.iz)} A`, `${n(c.duPct, 2)} %`, c.ok ? "cumple ✓" : `no cumple: ${c.fail}`],
        ok: c.ok,
      })),
    },
    after: isDC
      ? undefined
      : `Protección: debe cumplirse I_diseño ≤ I_n ≤ I_z, es decir ${n(iDesign)} A ≤ I_n ≤ ${n(f.iz)} A${rangeTxt}. Además I₂ ≤ 1,45 · I_z (AEA 90364-4-43, 433.1).`,
    result: `${par > 1 ? `${par} × ` : ""}${mm(f.section)}${r.userSection ? " (elegida por el usuario)" : ""}`,
  });

  return steps;
}
