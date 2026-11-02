

import { StepByStep } from "./StepByStep";
import { AL_MIN_SECTION } from "../lib/engine/calc";
import { CoordinationChart } from "./CoordinationChart";
import { IndicatorsCard } from "./IndicatorsCard";
import type {
  Alert,
  CalcInputs,
  CalcResult,
  FamilyChoice,
  FamilyResult,
  Recommendation,
} from "../lib/engine/types";

const n = (v: number, d = 1) => v.toLocaleString("es-AR", { minimumFractionDigits: d, maximumFractionDigits: d });
type SetInput = <K extends keyof CalcInputs>(key: K, value: CalcInputs[K]) => void;

const mm = (s: number | null) => (s === null ? "—" : `${n(s, s % 1 ? 1 : 0)} mm²`);

const LEVEL_STYLE: Record<Alert["level"], { box: string; tag: string; label: string }> = {
  error: { box: "border-danger/40 bg-danger/8 text-danger-ink", tag: "bg-danger text-white", label: "Error" },
  warning: { box: "border-warn/40 bg-warn/10 text-warn-ink", tag: "bg-warn text-black", label: "Atención" },
  info: { box: "border-line bg-field text-ink-2", tag: "bg-ink-2/15 text-ink-2", label: "Norma" },
};

function AlertList({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return null;
  const order = { error: 0, warning: 1, info: 2 };
  const sorted = [...alerts].sort((a, b) => order[a.level] - order[b.level]);
  return (
    <ul className="space-y-2">
      {sorted.map((a, i) => {
        const s = LEVEL_STYLE[a.level];
        return (
          <li key={`${a.code}-${i}`} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[13px] leading-snug ${s.box}`}>
            <span className={`mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.tag}`}>
              {s.label}
            </span>
            <span>
              {a.message} <span className="whitespace-nowrap text-[11px] opacity-60">[{a.code}]</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Descripción de la columna de catálogo usada para I₀. */
const METHOD_LABEL: Record<string, string> = {
  B2_2c: "B2, caño, 2 cargados",
  B2_3c: "B2, caño, 3 cargados",
  C_2c: "C, bandeja ciega, 2 cargados",
  C_3c: "C, bandeja ciega, 3 cargados",
  E_2c: "E, bandeja perforada, multipolar 2 cargados",
  E_3c: "E, bandeja perforada, multipolar 3 cargados",
  F_2u: "F, 2 unipolares en contacto",
  F_3u_trebol: "F, 3 unipolares en trébol",
  F_3u_plano: "F, 3 unipolares en plano",
  G_3u_horiz: "G, 3 unipolares separados, horizontal",
  G_3u_vert: "G, 3 unipolares separados, vertical",
  D1_2c: "D1, caño enterrado, 2 cargados",
  D1_3c: "D1, caño enterrado, 3 cargados",
  D2_3u: "D2, 3 unipolares enterrados",
  D2_2c: "D2, enterrado, 2 cargados",
  D2_3c: "D2, enterrado, 3 cargados",
  PV_AIR: "cable solar al aire",
  PV_SURF1: "cable solar sobre superficie",
  PV_SURF2: "cable solar, 2 en contacto sobre superficie",
};

/** Criterio que define la sección mostrada. */
function governingCriterion(r: FamilyResult, inputs: CalcInputs): string {
  if (r.userSection) return `elección del usuario (mínima por cálculo: ${mm(r.sCalc)})`;
  const tableLimited = /^[FG]_/.test(r.method);
  const criteria: [string, number | null][] = [
    ...(tableLimited ? ([["sección mínima admitida por la AEA para unipolares en bandeja (no por la corriente)", r.sTableMin]] as [string, number | null][]) : []),
    ["ampacidad", r.sAmp],
    ["caída de tensión", r.sDu],
    ["coordinación con la protección (I_n normalizada entre I diseño e I_z)", r.sProt],
    ["cortocircuito", r.sSc],
    [
      inputs.side === "AC" && inputs.material === "Al" && r.sMin >= AL_MIN_SECTION
        ? `sección mínima adoptada para aluminio (${AL_MIN_SECTION} mm²), no por la corriente`
        : "sección mínima reglamentaria",
      r.sMin,
    ],
  ];
  return criteria.reduce((best, c) => ((c[1] ?? 0) > (best[1] ?? 0) ? c : best))[0];
}

/** Resultado: sección, aislación, norma y especificación de la protección. */
function ResultCard({ r, inputs, set }: { r: FamilyResult; inputs: CalcInputs; set: SetInput }) {
  const f = r.final!;
  const isDC = inputs.side === "DC";
  const selCls =
    "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/60 [&>option]:text-ink";
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-md">
      <div
        className="px-5 py-5 text-white"
        style={{ background: "linear-gradient(135deg, var(--brand) 0%, color-mix(in oklab, var(--brand) 78%, #2a78d6) 100%)" }}
      >
        <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/70">Resultado</div>
        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="text-[11px] uppercase tracking-wide text-white/60">Sección de cable recomendada</div>
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-5xl font-bold tracking-tight tabular-nums">
                {inputs.parallel > 1 && <span className="text-white/70">{inputs.parallel} × </span>}
                {mm(f.section)}
              </span>
              <span className="text-sm text-white/75">definida por {governingCriterion(r, inputs)}</span>
            </div>
            <div className="mt-0.5 text-[13px] text-white/85">{r.cableLabel}</div>
            {r.factors && (
              <div className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md bg-white/10 px-2.5 py-1.5 text-[12px] tabular-nums text-white/90">
                <span>
                  I₀ = {n(f.i0, 0)} A <span className="text-white/60">({METHOD_LABEL[r.method] ?? r.method})</span>
                </span>
                <span className="text-white/50">×</span>
                <span>fT {n(r.factors.fT, 2)}</span>
                <span className="text-white/50">×</span>
                <span>fA {n(r.factors.fA, 2)}</span>
                {r.factors.fr !== 1 && (
                  <>
                    <span className="text-white/50">×</span>
                    <span>fr {n(r.factors.fr, 2)}</span>
                  </>
                )}
                {inputs.parallel > 1 && (
                  <>
                    <span className="text-white/50">×</span>
                    <span>{inputs.parallel} en paralelo</span>
                  </>
                )}
                <span className="text-white/50">=</span>
                <span className="font-semibold">I_z {n(f.iz, 1)} A</span>
              </div>
            )}
          </div>
          {r.sectionOptions.length > 1 && (
            <label className="block min-w-[220px] text-[11px] font-medium uppercase tracking-wide text-white/70">
              Recalcular con sección mayor
              <select
                className={`${selCls} mt-1`}
                value={r.userSection ? String(f.section) : "0"}
                onChange={(e) => set("sectionChoice", Number(e.target.value))}
              >
                <option value="0">Mínima por cálculo — {mm(r.sCalc)}</option>
                {r.sectionOptions
                  .filter((s) => s !== r.sCalc)
                  .map((s) => (
                    <option key={s} value={s}>
                      {mm(s)}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </div>
      </div>

      <dl className="divide-y divide-line text-[13.5px]">
        <div className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr]">
          <dt className="flex items-center gap-2 font-medium text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-ink" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            Aislación recomendada
          </dt>
          <dd className="font-semibold text-ink">{r.insulation}</dd>
        </div>
        <div className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr]">
          <dt className="flex items-center gap-2 font-medium text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-ink" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M7 3h7l5 5v13H7V3Zm7 0v5h5M10 13h6M10 17h6" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
            Norma que debe cumplir
          </dt>
          <dd className="font-semibold text-ink">{r.norma}</dd>
        </div>
        <div className="grid gap-1 px-5 py-3 sm:grid-cols-[220px_1fr]">
          <dt className="flex items-center gap-2 font-medium text-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent-ink" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" strokeLinejoin="round" />
            </svg>
            {isDC ? "Protección" : "Protección termomagnética"}
          </dt>
          <dd>
            <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,210px)_1fr]">
              {r.protection?.specs.map((sp) => (
                <div key={sp.label} className="contents">
                  <dt className="text-ink-2">{sp.label}</dt>
                  <dd className="font-medium text-ink">{sp.value}</dd>
                </div>
              ))}
            </dl>
            {r.protection?.notes.map((t, i) => (
              <p key={i} className="mt-1.5 text-[12px] text-muted">
                {t}
              </p>
            ))}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Metric({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-lg font-semibold tabular-nums text-ink">{value}</span>
        {ok !== undefined && (
          <span className={`text-xs font-semibold ${ok ? "text-ok" : "text-danger"}`}>{ok ? "✓" : "✗"}</span>
        )}
      </div>
      {sub && <div className="text-[11px] leading-tight text-muted">{sub}</div>}
    </div>
  );
}

function Metrics({ r, res, inputs }: { r: FamilyResult; res: CalcResult; inputs: CalcInputs }) {
  const f = r.final!;
  const isDC = inputs.side === "DC";
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric
        label={isDC ? "I diseño (1,25·N·Isc)" : res.iRequired > res.ib + 1e-9 ? "I diseño" : "Corriente I_B"}
        value={`${n(res.iRequired)} A`}
        sub={isDC ? `Operación N·Imp = ${n(res.ib)} A` : undefined}
      />
      <Metric
        label="I_z corregida"
        value={`${n(f.iz)} A`}
        sub={`I₀ = ${n(f.i0, 0)} A × ${n(r.factors!.total, 3)}${inputs.parallel > 1 ? ` × ${inputs.parallel}` : ""}`}
        ok={f.iz >= res.iRequired - 1e-9}
      />
      <Metric label="Sección por ampacidad" value={mm(r.sAmp)} />
      <Metric label="Sección por ΔU" value={mm(r.sDu)} />
      <Metric
        label="Caída de tensión"
        value={`${n(f.duPct, 2)} %`}
        sub={`${n(f.duV, 2)} V · límite ${n(res.duLimitPct, 1)} % (${res.duLimitSource})`}
        ok={f.duPct <= res.duLimitPct + 1e-9}
      />
      <Metric
        label={isDC ? "R' a 90 °C" : "R' / X'"}
        value={isDC ? `${n(f.r, 3)} Ω/km` : `${n(f.r, 3)} / ${n(f.x, 3)}`}
        sub={isDC ? "IEC 60228 cl. 5 estañado" : "Ω/km (catálogo de referencia)"}
      />
      {!isDC && inputs.ikKa > 0 && <Metric label="Sección por cortocircuito" value={mm(r.sSc)} />}
    </div>
  );
}

function FactorsCard({ r }: { r: FamilyResult }) {
  const f = r.factors;
  if (!f) return null;
  return (
    <div className="rounded-lg border border-line p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Factores de corrección · I_z = I₀ · fT · fA · fr
      </h4>
      <dl className="mt-2 grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-1.5 text-[13px]">
        <dt className="font-medium text-ink">fT</dt>
        <dd className="text-muted">{f.fTBasis}</dd>
        <dd className="text-right font-semibold tabular-nums">{n(f.fT, 3)}</dd>
        <dt className="font-medium text-ink">fA</dt>
        <dd className="text-muted">{f.fABasis}</dd>
        <dd className="text-right font-semibold tabular-nums">{n(f.fA, 2)}</dd>
        <dt className="font-medium text-ink">fr</dt>
        <dd className="text-muted">resistividad térmica del terreno</dd>
        <dd className="text-right font-semibold tabular-nums">{n(f.fr, 2)}</dd>
        <dt className="border-t border-line pt-1.5 font-semibold text-ink">Total</dt>
        <dd className="border-t border-line pt-1.5 text-muted">método {r.method.replace(/_/g, " ")}</dd>
        <dd className="border-t border-line pt-1.5 text-right font-bold tabular-nums">{n(f.total, 3)}</dd>
      </dl>
    </div>
  );
}

function RecommendationReasons({ rec }: { rec: Recommendation }) {
  return (
    <div className="rounded-lg border border-line p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Por qué esa aislación y esa norma
      </h4>
      <ul className="mt-2 space-y-1 text-[13px] text-ink-2">
        {rec.reasons.map((t, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-accent-ink">›</span>
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {rec.admitted.length > 0 && <p className="mt-2 text-[11px] text-muted">Admitidos: {rec.admitted.join(" · ")}</p>}
    </div>
  );
}

function Comparison({ res, onPick, current }: { res: CalcResult; onPick: (f: FamilyChoice) => void; current: FamilyChoice }) {
  if (res.results.length < 2) return null;
  return (
    <div className="rounded-lg border border-line p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Comparativa por tipo de cable</h4>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="py-1.5 pr-2 font-medium">Tipo de cable</th>
              <th className="px-2 font-medium">S ampac.</th>
              <th className="px-2 font-medium">S ΔU</th>
              <th className="px-2 font-medium">S final</th>
              <th className="px-2 text-right font-medium">ΔU</th>
              <th className="px-2 text-right font-medium">I_z</th>
              <th className="pl-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {res.results.map((r) => {
              const rec = res.recommended?.familyId === r.familyId;
              const selected = current === r.familyId || (current === "auto" && rec);
              return (
                <tr
                  key={r.familyId}
                  onClick={() => onPick(r.familyId)}
                  className={`cursor-pointer border-b border-line/60 last:border-0 hover:bg-field ${selected ? "bg-accent/10" : ""}`}
                >
                  <td className="py-2 pr-2">
                    <div className="font-medium text-ink">{r.familyName}</div>
                    <div className="text-[11px] text-muted">{r.norma}</div>
                  </td>
                  <td className="px-2 tabular-nums">{mm(r.sAmp)}</td>
                  <td className="px-2 tabular-nums">{mm(r.sDu)}</td>
                  <td className="px-2 font-semibold tabular-nums">{r.final ? mm(r.final.section) : "—"}</td>
                  <td className="px-2 text-right tabular-nums">{r.final ? `${n(r.final.duPct, 2)} %` : "—"}</td>
                  <td className="px-2 text-right tabular-nums">{r.final ? `${n(r.final.iz, 0)} A` : "—"}</td>
                  <td className="pl-2">
                    {r.blocked ? (
                      <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[11px] font-semibold text-danger-ink">No admitido</span>
                    ) : rec ? (
                      <span className="rounded bg-ok/15 px-1.5 py-0.5 text-[11px] font-semibold text-ok">Recomendado</span>
                    ) : (
                      <span className="rounded bg-field px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">Cumple</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-muted">Tocá una fila para ver el resultado con ese tipo de cable.</p>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="rounded-lg border border-warn/50 bg-warn/10 px-3 py-2 text-[13px] leading-snug text-warn-ink">
      <span className="mr-2 rounded bg-warn px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black">Importante</span>
      Resultado de predimensionamiento: verifique manualmente el cálculo y compárelo con el datasheet del proveedor
      del cable antes de adoptarlo.
    </p>
  );
}

function Collapsible({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <details className="group rounded-xl border border-line bg-surface shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        <span>
          {title}
          {count !== undefined && <span className="ml-1.5 rounded bg-field px-1.5 py-0.5 text-[10px] text-ink-2">{count}</span>}
        </span>
        <span className="text-base transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="space-y-3 border-t border-line p-4">{children}</div>
    </details>
  );
}

export function ResultsPanel({
  res,
  inputs,
  onPickFamily,
  set,
}: {
  res: CalcResult;
  inputs: CalcInputs;
  onPickFamily: (f: FamilyChoice) => void;
  set: SetInput;
}) {
  // Con paralelo automático, se muestra la cantidad resuelta por el motor.
  inputs = { ...inputs, parallel: res.parallel };
  const r = res.shown;
  const alerts = [...res.globalAlerts, ...(r?.alerts ?? [])];
  const important = alerts.filter((a) => a.level !== "info");
  const norms = alerts.filter((a) => a.level === "info");
  const ok = r && r.final && !r.blocked ? r : null;

  return (
    <div className="space-y-4">
      {ok ? (
        <ResultCard r={ok} inputs={inputs} set={set} />
      ) : (
        <section className="rounded-xl border border-danger/40 bg-danger/8 p-5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-danger-ink">Sin solución admisible</div>
          <p className="mt-1 text-sm text-ink">
            {r?.final && r.blocked
              ? `${r.familyName} dimensiona ${mm(r.final.section)}, pero no está admitido por la normativa para estas condiciones.`
              : "Revisá los errores indicados abajo y corregí los datos de entrada o las condiciones de instalación."}
          </p>
        </section>
      )}

      <Disclaimer />

      <AlertList alerts={important} />

      {ok && ok.dataNotes.length > 0 && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-[13px] text-warn-ink">
          <span className="mr-2 rounded bg-warn px-1.5 py-0.5 text-[10px] font-semibold uppercase text-black">Dato provisorio</span>
          {ok.dataNotes.join(" ")}
        </p>
      )}

      {ok && (
        <IndicatorsCard
          duPct={ok.final!.duPct}
          duLimit={res.duLimitPct}
          duSource={res.duLimitSource}
          iDesign={res.iRequired}
          iz={ok.final!.iz}
        />
      )}

      {ok && <CoordinationChart r={ok} iDesign={res.iRequired} isDC={inputs.side === "DC"} />}

      {ok && (
        <Collapsible title="Memoria de cálculo">
          <StepByStep r={ok} res={res} inputs={inputs} />
          <Metrics r={ok} res={res} inputs={inputs} />
          <FactorsCard r={ok} />
          {res.recommendation && <RecommendationReasons rec={res.recommendation} />}
          <Comparison res={res} onPick={onPickFamily} current={inputs.family} />
        </Collapsible>
      )}

      {norms.length > 0 && (
        <Collapsible title="Requisitos normativos de la instalación" count={norms.length}>
          <AlertList alerts={norms} />
        </Collapsible>
      )}
    </div>
  );
}
