// «Cálculo paso a paso» de la memoria de cálculo: cada paso muestra la fórmula, los
// números reemplazados, el resultado y el catálogo (archivo y página) de donde sale el dato.
// Los pasos salen de lib/report/steps.ts (los mismos que usa el informe PDF).
import type { ReactNode } from "react";
import { buildSteps, type StepData, type StepSource } from "../lib/report/steps";
import type { CalcInputs, CalcResult, FamilyResult } from "../lib/engine/types";

function SourceLine({ s }: { s: StepSource }) {
  return (
    <p className="mt-1.5 flex gap-1.5 text-[11.5px] leading-snug text-muted">
      <span aria-hidden className="text-accent-ink">▤</span>
      <span>
        <span className="font-semibold text-ink-2">{s.label}:</span>{" "}
        {s.src ? (
          <>
            {s.src.doc} — <span className="italic">{s.src.file}</span>, pág. <span className="font-semibold text-ink-2">{s.src.page}</span>
            {s.src.note && <span className="block text-[11px] text-muted/90">{s.src.note}</span>}
          </>
        ) : (
          s.text
        )}
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

function Step({ s }: { s: StepData }) {
  return (
    <li className="flex gap-3 rounded-lg border border-line bg-surface p-3">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cb-brand text-[11px] font-bold text-white">{s.num}</span>
      <div className="min-w-0 flex-1 text-[13px] text-ink-2">
        <h5 className="text-[13.5px] font-semibold text-ink">{s.title}</h5>
        {s.paragraphs.map((p, i) => (
          <p key={i} className="mt-1">
            {p}
          </p>
        ))}
        {s.formulas.map((f, i) => (
          <Formula key={i}>{f}</Formula>
        ))}
        {s.bullets.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-[12px] text-muted">
            {s.bullets.map((b, i) => {
              const [head, ...rest] = b.split(": ");
              return (
                <li key={i}>
                  <span className="font-semibold text-ink-2">{head}:</span> {rest.join(": ")}
                </li>
              );
            })}
          </ul>
        )}
        {s.table && (
          <div className="mt-1.5 overflow-x-auto">
            <table className="w-full text-[12px] tabular-nums">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                  {s.table.head.map((h) => (
                    <th key={h} className="py-1 pr-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.table.rows.map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    {row.cells.map((c, j) => (
                      <td
                        key={j}
                        className={`py-1 pr-3 ${j === 0 ? "font-semibold text-ink" : ""} ${j === row.cells.length - 1 ? (row.ok ? "font-semibold text-ok" : "text-danger-ink") : ""}`}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {s.after && <p className="mt-2 text-[12px]">{s.after}</p>}
        {s.sources.map((src, i) => (
          <SourceLine key={i} s={src} />
        ))}
        <div className="mt-1.5 text-[13px] font-semibold text-ink">→ {s.result}</div>
      </div>
    </li>
  );
}

export function StepByStep({ r, res, inputs }: { r: FamilyResult; res: CalcResult; inputs: CalcInputs }) {
  const steps = buildSteps(r, res, inputs);
  return (
    <div className="rounded-lg border border-line p-3">
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Cálculo paso a paso</h4>
      <p className="mt-1 text-[12px] text-muted">
        Cada paso indica la fórmula con los valores de este cálculo y el catálogo (archivo y página del PDF) del que sale el dato.
      </p>
      <ol className="mt-3 space-y-2">
        {steps.map((s) => (
          <Step key={s.num} s={s} />
        ))}
      </ol>
    </div>
  );
}
