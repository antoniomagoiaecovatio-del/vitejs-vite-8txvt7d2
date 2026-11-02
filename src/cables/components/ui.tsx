

import { useId, useState, type ReactNode } from "react";

export function Card({
  title,
  children,
  aside,
  step,
}: {
  title: string;
  children: ReactNode;
  aside?: ReactNode;
  step?: number;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
          {step !== undefined && (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-cb-brand text-[11px] font-bold text-white">
              {step}
            </span>
          )}
          {title}
        </h2>
        {aside}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Label({ htmlFor, children, hint }: { htmlFor?: string; children: ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink-2">
      {children}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-field px-3 py-2 text-sm text-ink tabular-nums outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

const parse = (s: string) => {
  const n = Number(s.replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
};

/** Campo numérico: admite coma decimal y conserva lo tipeado mientras se edita. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  step,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  hint?: string;
  step?: number;
  min?: number;
}) {
  const id = useId();
  const [text, setText] = useState(String(value).replace(".", ","));
  const [prevValue, setPrevValue] = useState(value);
  // Si el valor cambia desde afuera (p. ej. al cambiar de fase), resincroniza el texto.
  if (value !== prevValue) {
    setPrevValue(value);
    if (parse(text) !== value) setText(String(value).replace(".", ","));
  }
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          className={`${inputCls} ${unit ? "pr-12" : ""}`}
          value={text}
          step={step}
          min={min}
          onChange={(e) => {
            setText(e.target.value);
            const n = parse(e.target.value);
            onChange(Number.isNaN(n) ? 0 : n);
          }}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function SelectField<T extends string | number>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <Label htmlFor={id} hint={hint}>
        {label}
      </Label>
      <select
        id={id}
        className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2378808c%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.75rem_center] bg-no-repeat pr-8`}
        value={String(value)}
        onChange={(e) => {
          const opt = options.find((o) => String(o.value) === e.target.value);
          if (opt) onChange(opt.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div>
      {label && <Label>{label}</Label>}
      <div className="flex rounded-lg border border-line bg-field p-0.5" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                active ? "bg-cb-brand text-white shadow-sm" : "text-ink-2 hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-line accent-[var(--accent)]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
