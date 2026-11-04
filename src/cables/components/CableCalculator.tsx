

import { useMemo, useState } from "react";
import { calculate } from "../lib/engine/calc";
import { DEFAULT_INPUTS } from "../lib/engine/defaults";
import type { CalcInputs } from "../lib/engine/types";
import { CostComparison } from "./CostComparison";
import { InputPanel } from "./InputPanel";
import { ResultsPanel } from "./ResultsPanel";

type Tab = "dim" | "costos";

export function CableCalculator() {
  const [inputs, setInputs] = useState<CalcInputs>(DEFAULT_INPUTS);
  const [tab, setTab] = useState<Tab>("dim");
  const set = <K extends keyof CalcInputs>(key: K, value: CalcInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));
  const res = useMemo(() => calculate(inputs), [inputs]);
  const costsAvailable = inputs.side === "AC";

  return (
    <div className="mx-auto grid w-full max-w-[1760px] gap-5 px-4 py-5 lg:grid-cols-[400px_1fr] lg:px-6">
      <aside className="lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1">
        <InputPanel inputs={inputs} set={set} />
      </aside>
      <main aria-live="polite" className="min-w-0">
        <div className="mb-4 flex rounded-xl border border-line bg-surface p-1 shadow-sm" role="tablist" aria-label="Vistas">
          {(
            [
              { id: "dim", label: "Dimensionamiento" },
              { id: "costos", label: "Costos Cu vs Al" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${
                tab === t.id ? "bg-cb-brand text-white shadow-sm" : "text-ink-2 hover:bg-field"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "dim" ? (
          <ResultsPanel res={res} inputs={inputs} onPickFamily={(f) => set("family", f)} set={set} />
        ) : costsAvailable ? (
          <CostComparison inputs={inputs} />
        ) : (
          <section className="rounded-2xl border border-line bg-surface p-5 text-sm text-ink-2 shadow-sm">
            La comparación cobre / aluminio aplica a circuitos de corriente alterna. En corriente continua FV se usa cable
            solar H1Z2Z2-K de cobre estañado.
          </section>
        )}
      </main>
    </div>
  );
}
