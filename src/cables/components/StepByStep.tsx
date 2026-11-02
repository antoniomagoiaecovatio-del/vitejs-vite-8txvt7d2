// «Cálculo paso a paso» de la memoria de cálculo: cada paso muestra la fórmula, los
// números reemplazados, el resultado y el catálogo (archivo y página) de donde sale el dato.
import type { ReactNode } from "react";
import { AL_MIN_SECTION, CIRCUITS, protectionRatings } from "../lib/engine/calc";
import { kFactor } from "../lib/data/protections";
import {
  FACTORS_SOURCE,
  FORMULAS_SOURCE,
  LIMITS_SOURCE,
  MIN_SECTION_SOURCE,
  SC_SOURCE,
  ampacitySource,
  rxSource,
  type Source,
} from "../lib/data/sources";
import type { CalcInputs, CalcResult, FamilyResult } from "../lib/engine/types";

const n = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
const mm = (s: number | null) => (s === null ? "—" : `${n(s, s % 1 ? 1 : 0)} mm²`);

const METHOD_LABEL: Record<string, string> = {
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

function SourceLine({ s, label = "Fuente" }: { s: Source; label?: string }) {
  return (
    <p className="mt-1.5 flex gap-1.5 text-[11.5px] leading-snug text-muted">
      <span aria-hidden className="text-accent-ink">▤</span>
      <span>
        <span className="font-semibold text-ink-2">{label}:</span> {s.doc} — <span className="italic">{s.file}</span>, pág.{" "}
        <span className="font-semibold text-ink-2">{s.page}</span>
        {s.note && <span className="block text-[11px] text-muted/90">{s.note}</span>}
      </span>
    </p>
  );
}

function Formula({ children }: { children: ReactNode }) {
  return (
    <div className="mt-1 overflow-x-auto rounded-md bg-field px-2.5 py-1.5 font-mono text-[12.5px] leading-relaxed tabular-nums text-ink-2">
      {children}
    </div>
  );
}

function Step({ num, title, children, result }: { num: number; title: string; children: ReactNode; result?: ReactNode }) {
  return (
    <li className="flex gap-3 rounded-lg border border-line bg-surface p-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cb-brand text-[11px] font-bold text-white">{num}</span>
      <div className="min-w-0 flex-1 text-[13px] text-ink-2">
        <h5 className="text-[13.5px] font-semibold text-ink">{title}</h5>
        {children}
        {result && <div className="mt-1.5 text-[13px] font-semibold text-ink">→ {result}</div>}
      </div>
    </li>
  );
}

export function StepByStep({ r, res, inputs }: { r: FamilyResult; res: CalcResult; inputs: CalcInputs }) {
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

  let k = 0;
  const num = () => ++k;

  // ---- Paso 1: corriente de diseño
  const step1 = isDC ? (
    <Step num={num()} title="Corriente de diseño" result={<>I_diseño = {n(iDesign)} A (operación N·I_mp = {n(res.ib)} A)</>}>
      <p>El cable debe soportar el 125 % de la corriente de cortocircuito del string (AEA 90364-7-712, 712.433a).</p>
      <Formula>
        I_diseño = 1,25 × N × I_sc = 1,25 × {inputs.dcRole === "string" ? 1 : inputs.nStrings} × {n(inputs.iscStc, 2)} A = {n(iDesign)} A
      </Formula>
      <SourceLine s={FORMULAS_SOURCE} />
    </Step>
  ) : (
    <Step num={num()} title="Corriente de proyecto" result={<>I_B = {n(res.ib)} A{iDesign > res.ib + 1e-9 ? ` · I_diseño = ${n(iDesign)} A` : ""}</>}>
      {inputs.loadMode === "power" ? (
        <Formula>
          {inputs.phase === "mono" ? (
            <>I_B = P ÷ (U · cos φ) = {n(inputs.powerKw * 1000, 0)} W ÷ ({n(inputs.voltage, 0)} V × {n(cos, 2)}) = {n(res.ib)} A</>
          ) : (
            <>
              I_B = P ÷ (√3 · U · cos φ) = {n(inputs.powerKw * 1000, 0)} W ÷ ({n(sqrt3, 3)} × {n(inputs.voltage, 0)} V × {n(cos, 2)}) = {n(res.ib)} A
            </>
          )}
        </Formula>
      ) : (
        <Formula>I_B = {n(res.ib)} A (corriente ingresada)</Formula>
      )}
      {iDesign > res.ib + 1e-9 && (
        <Formula>I_diseño = I_B × factor de servicio {n(inputs.serviceFactor, 2)} = {n(iDesign)} A</Formula>
      )}
      <SourceLine s={FORMULAS_SOURCE} />
    </Step>
  );

  // ---- Paso 2: sección mínima
  const step2 = isDC ? (
    <Step num={num()} title="Sección mínima" result={<>{mm(res.sMin)}</>}>
      <p>El cable solar de este catálogo se fabrica desde 4 mm², por eso es la menor sección que se evalúa en CC.</p>
      <SourceLine s={ampSrc} />
    </Step>
  ) : (
    <Step num={num()} title="Sección mínima reglamentaria" result={<>{mm(res.sMin)}</>}>
      <p>
        Tipo de circuito: <span className="font-medium text-ink">{CIRCUITS[inputs.circuitType].label}</span> → mínimo{" "}
        {mm(CIRCUITS[inputs.circuitType].sMin)}
        {inputs.material === "Al" && <> · aluminio: mínimo {mm(AL_MIN_SECTION)} (criterio de diseño)</>}.
      </p>
      <p className="mt-1.5 text-[11.5px] text-muted">
        <span className="font-semibold text-ink-2">Fuente:</span> {MIN_SECTION_SOURCE}
      </p>
    </Step>
  );

  // ---- Paso 3: método y corriente base
  const step3 = (
    <Step num={num()} title="Método de instalación y corriente admisible base I₀" result={<>I₀ = {n(f.i0, 0)} A para {mm(f.section)}</>}>
      <p>
        Método <span className="font-medium text-ink">{METHOD_LABEL[r.method] ?? r.method}</span> · {r.familyName} ({mat === "Cu" ? "cobre" : "aluminio"}).
      </p>
      <SourceLine s={ampSrc} label="Tabla de I₀" />
    </Step>
  );

  // ---- Paso 4: factores
  const step4 = (
    <Step num={num()} title="Factores de corrección" result={<>f_total = {n(fac.total, 3)}</>}>
      <Formula>
        f_total = fT × fA × fr = {n(fac.fT, 3)} × {n(fac.fA, 2)} × {n(fac.fr, 2)} = {n(fac.total, 3)}
      </Formula>
      <ul className="mt-1.5 space-y-0.5 text-[12px] text-muted">
        <li>
          <span className="font-semibold text-ink-2">fT</span> (temperatura): {fac.fTBasis}
        </li>
        <li>
          <span className="font-semibold text-ink-2">fA</span> (agrupamiento): {fac.fABasis}
        </li>
        <li>
          <span className="font-semibold text-ink-2">fr</span> (resistividad del terreno): {fac.fr === 1 ? "no aplica / base 1,0 K·m/W" : "según el terreno elegido"}
        </li>
      </ul>
      {isDC && r.method.startsWith("PV_") && !/terreno/.test(fac.fTBasis) ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-muted">
          <span className="font-semibold text-ink-2">Fuente de fT:</span> fórmula √[(90 − θ) ÷ (90 − 30)] (IEC 60364-5-52); el catálogo Prysun da I₀ a 30 °C de ambiente
          (PRYAR_Prysun_v05.pdf, pág. 4). fA y fr: {FACTORS_SOURCE.fA.doc}, pág. {FACTORS_SOURCE.fA.page}.
        </p>
      ) : (
        <SourceLine s={FACTORS_SOURCE.fT} label="Fuente de fT, fA y fr" />
      )}
      <p className="mt-1 text-[11px] text-muted">{FACTORS_SOURCE.fA.note}</p>
    </Step>
  );

  // ---- Paso 5: ampacidad
  const step5 = (
    <Step
      num={num()}
      title={`Verificación por ampacidad (con la sección final, ${mm(f.section)})`}
      result={
        <>
          I_z = {n(f.iz)} A {f.iz >= iDesign - 1e-9 ? "≥" : "<"} I_diseño = {n(iDesign)} A {f.iz >= iDesign - 1e-9 ? "✓" : "✗"} · sección por ampacidad {mm(r.sAmp)}
        </>
      }
    >
      <Formula>
        I_z = I₀ × f_total{par > 1 ? " × n" : ""} = {n(f.i0, 0)} A × {n(fac.total, 3)}
        {par > 1 ? ` × ${par}` : ""} = {n(f.iz)} A
      </Formula>
      {par > 1 && <p className="mt-1 text-[12px] text-muted">{par} conductores en paralelo por polo (la corriente se reparte entre ellos).</p>}
    </Step>
  );

  // ---- Paso 6: caída de tensión
  const dcR = f.r;
  const step6 = isDC ? (
    <Step
      num={num()}
      title={`Caída de tensión en CC (con la sección final, ${mm(f.section)})`}
      result={
        <>
          ΔU = {n(f.duPct, 2)} % {f.duPct <= res.duLimitPct + 1e-9 ? "≤" : ">"} límite {n(res.duLimitPct, 1)} % · sección por ΔU {mm(r.sDu)}
        </>
      }
    >
      <Formula>
        ΔU = 2 · L · I_mp · R' ÷ n = 2 × {n(inputs.lengthM / 1000, 3)} km × {n(res.ib)} A × {n(dcR, 3)} Ω/km ÷ {par} = {n(f.duV, 2)} V
      </Formula>
      <Formula>
        ΔU % = ΔU ÷ V_mp × 100 = {n(f.duV, 2)} V ÷ {n(inputs.vmpString, 0)} V × 100 = {n(f.duPct, 2)} %
      </Formula>
      <SourceLine s={rxSrc} label="R' (resistencia a 90 °C)" />
      <SourceLine s={LIMITS_SOURCE} label="Límite de ΔU (AEA 90364-7-712)" />
    </Step>
  ) : (
    <Step
      num={num()}
      title={`Caída de tensión (con la sección final, ${mm(f.section)})`}
      result={
        <>
          ΔU = {n(f.duPct, 2)} % {f.duPct <= res.duLimitPct + 1e-9 ? "≤" : ">"} límite {n(res.duLimitPct, 1)} % ({res.duLimitSource}) · sección por ΔU {mm(r.sDu)}
        </>
      }
    >
      <Formula>
        {inputs.phase === "mono" ? "ΔU = 2" : "ΔU = √3"} · L · I_B · (R'·cos φ + X'·sen φ){par > 1 ? " ÷ n" : ""}
      </Formula>
      <Formula>
        ΔU = {inputs.phase === "mono" ? "2" : n(sqrt3, 3)} × {n(inputs.lengthM / 1000, 3)} km × {n(res.ib)} A × ({n(f.r, 3)} × {n(cos, 2)} + {n(f.x, 3)} × {n(sin, 3)})
        {par > 1 ? ` ÷ ${par}` : ""} = {n(f.duV, 2)} V
      </Formula>
      <Formula>
        ΔU % = ΔU ÷ U × 100 = {n(f.duV, 2)} V ÷ {n(inputs.voltage, 0)} V × 100 = {n(f.duPct, 2)} %
      </Formula>
      <SourceLine s={rxSrc} label={`R' = ${n(f.r, 3)} Ω/km · X' = ${n(f.x, 3)} Ω/km`} />
      <SourceLine s={LIMITS_SOURCE} label="Límites de ΔU" />
    </Step>
  );

  // ---- Paso 7: cortocircuito (solo CA con I″k)
  const kS = kFactor(mat, insulation);
  const showSc = !isDC && inputs.ikKa > 0 && inputs.tScS > 0;
  const step7 = showSc ? (
    <Step num={num()} title="Cortocircuito (esfuerzo térmico)" result={<>sección mínima por cortocircuito {mm(r.sSc)}</>}>
      <Formula>
        k² · S² ≥ I² · t → S ≥ I_k · √t ÷ k = {n(inputs.ikKa, 1)} kA × 1000 × √{n(inputs.tScS, 2)} s ÷ {kS} ={" "}
        {n((inputs.ikKa * 1000 * Math.sqrt(inputs.tScS)) / kS, 1)} mm²
      </Formula>
      <p className="mt-1 text-[12px] text-muted">
        k = {kS} ({insulation === "PVC" ? "aislación PVC, 160 °C" : "aislación XLPE, 250 °C"}, {mat === "Cu" ? "cobre" : "aluminio"}).
      </p>
      <SourceLine s={SC_SOURCE} />
    </Step>
  ) : null;

  // ---- Paso 8: sección final y protección
  const tested = r.curve.filter((c) => c.section <= f.section + 1e-9).slice(-5);
  const step8 = (
    <Step num={num()} title="Sección final" result={<>{par > 1 ? `${par} × ` : ""}{mm(f.section)}{r.userSection ? " (elegida por el usuario)" : ""}</>}>
      <p>
        Se prueban las secciones comerciales en orden creciente y se toma la menor que cumple <span className="font-medium text-ink">todo a la vez</span>: sección
        mínima ({mm(res.sMin)}), ampacidad ({mm(r.sAmp)}), caída de tensión ({mm(r.sDu)}){!isDC && <>, protección ({mm(r.sProt)})</>}
        {showSc && <>, cortocircuito ({mm(r.sSc)})</>}.
      </p>
      <div className="mt-1.5 overflow-x-auto">
        <table className="w-full text-[12px] tabular-nums">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="py-1 pr-3 font-medium">Sección</th>
              <th className="py-1 pr-3 font-medium">I_z</th>
              <th className="py-1 pr-3 font-medium">ΔU</th>
              <th className="py-1 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {tested.map((c) => (
              <tr key={c.section} className="border-t border-line">
                <td className="py-1 pr-3 font-semibold text-ink">{mm(c.section)}</td>
                <td className="py-1 pr-3">{n(c.iz)} A</td>
                <td className="py-1 pr-3">{n(c.duPct, 2)} %</td>
                <td className={`py-1 ${c.ok ? "font-semibold text-ok" : "text-danger-ink"}`}>{c.ok ? "cumple ✓" : `no cumple: ${c.fail}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isDC && (
        <p className="mt-2 text-[12px]">
          <span className="font-semibold text-ink">Protección:</span> debe cumplirse I_diseño ≤ I_n ≤ I_z, es decir {n(iDesign)} A ≤ I_n ≤ {n(f.iz)} A
          {ratings.ratings.length > 0 ? ` (valores normalizados en el rango: ${ratings.ratings.join(" · ")} A)` : ratings.adjustable ? " (interruptor con regulación térmica)" : ""}
          . Además I₂ ≤ 1,45 · I_z (AEA 90364-4-43, 433.1).
        </p>
      )}
    </Step>
  );

  return (
    <div className="rounded-lg border border-line p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Cálculo paso a paso</h4>
      <p className="mt-1 text-[12px] text-muted">
        Cada paso indica la fórmula con los valores de este cálculo y el catálogo (archivo y página del PDF) del que sale el dato.
      </p>
      <ol className="mt-3 space-y-2">
        {step1}
        {step2}
        {step3}
        {step4}
        {step5}
        {step6}
        {step7}
        {step8}
      </ol>
    </div>
  );
}
