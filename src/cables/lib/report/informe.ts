// Informe del cálculo de conductores (HTML listo para imprimir / guardar como PDF).
// Mismo estilo visual que el informe de estimación de obras del panel.
import { CIRCUITS } from "../engine/calc";
import { isBuried, usesConduit } from "../engine/rules";
import type { Alert, CalcInputs, CalcResult, FamilyResult } from "../engine/types";
import { buildSteps, mm, n, type StepSource } from "./steps";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const ROUTING: Record<string, string> = {
  cano: "Caño embutido o a la vista",
  bandeja_perforada: "Bandeja perforada",
  bandeja_escalera: "Bandeja escalera / canasta",
  bandeja_ciega: "Bandeja no perforada / sobre pared",
  cano_enterrado: "Caño enterrado",
  enterrado: "Directamente enterrado",
};
const DC_INSTALL: Record<string, string> = {
  PV_SURF2: "Sobre superficie, + y − en contacto (string típico)",
  PV_SURF1: "Sobre superficie, cable único",
  PV_AIR: "Al aire, suspendido",
  PV_BURIED: "En caño enterrado (dato provisorio)",
};
const CONDUIT: Record<string, string> = {
  rigido: "Sintético rígido autoextinguible",
  corrugado_autoext: "Corrugado autoextinguible",
  metalico: "Metálico",
  corrugado_naranja: "Corrugado liviano naranja",
};
const UNI_ARR: Record<string, string> = {
  trebol: "en contacto, en trébol",
  plano: "en contacto, en plano",
  sep_horiz: "separados un diámetro, horizontal",
  sep_vert: "separados un diámetro, vertical",
  plano_sep: "en plano, separados 1 diámetro",
};
const FAMILY: Record<string, string> = {
  auto: "Automático (según norma y ambiente)",
  pvc: "PVC / PVC — IRAM 2178-1",
  xlpe: "XLPE / PVC — IRAM 2178-1",
  lsoh: "XLPE / LSOH — IRAM 62266",
};

function datosEntrada(res: CalcResult, i: CalcInputs): [string, [string, string][]][] {
  const isDC = i.side === "DC";
  if (isDC) {
    return [
      [
        "Sistema",
        [
          ["Tipo de sistema", "Corriente continua (FV)"],
          ["Cable", i.dcRole === "string" ? "Cable de cadena (string)" : `Cable principal de CC (${i.nStrings} strings)`],
          ["Instalación", DC_INSTALL[i.dcInstallation] ?? i.dcInstallation],
        ],
      ],
      [
        "Datos del string",
        [
          ["I_sc (STC)", `${n(i.iscStc, 2)} A`],
          ["I_mp (STC)", `${n(i.impStc, 2)} A`],
          ["V_mp del string", `${n(i.vmpString, 0)} V`],
          ["Strings en paralelo (cable principal)", String(i.nStrings)],
          ["Strings por entrada del combiner", String(i.stringsAtCombiner)],
          ["Fusible máx. del módulo", i.moduleMaxFuse > 0 ? `${n(i.moduleMaxFuse, 0)} A` : "sin dato"],
        ],
      ],
      [
        "Tramo y condiciones",
        [
          ["Longitud del tramo (ida)", `${n(i.lengthM, 0)} m`],
          ["ΔU máximo", `${n(res.duLimitPct, 1)} %`],
          ["Conductores en paralelo", res.parallel > 1 ? `${res.parallel} por polo${res.parallelAuto ? " (automático)" : ""}` : "1 (sin paralelo)"],
          ["Temperatura ambiente", `${n(i.ambientTemp, 0)} °C${i.solarDelta ? ` (+${n(i.solarDelta, 0)} °C por radiación solar)` : ""}`],
          ["Ambiente", i.environment === "intemperie" ? "Intemperie" : "Interior"],
        ],
      ],
    ];
  }
  const buried = isBuried(i);
  const grupos: [string, [string, string][]][] = [
    [
      "Sistema",
      [
        ["Tipo de sistema", "Corriente alterna (BT)"],
        ["Fases", i.phase === "mono" ? "Monofásica" : "Trifásica"],
        ["Tensión", `${n(i.voltage, 0)} V${i.phase === "tri" ? " (entre líneas)" : ""}`],
        ...(i.phase === "tri" ? ([["Conductor neutro", i.withNeutral ? "Con neutro (3F + N)" : "Sin neutro (3F)"]] as [string, string][]) : []),
        ["Material del conductor", i.material === "Cu" ? "Cobre" : "Aluminio"],
        ["Tipo de cable pedido", FAMILY[i.family] ?? i.family],
      ],
    ],
    [
      "Carga",
      [
        ["Tipo de circuito", `${CIRCUITS[i.circuitType].label} (ΔU ≤ ${CIRCUITS[i.circuitType].du} %)`],
        i.loadMode === "power" ? ["Potencia activa", `${n(i.powerKw, 2)} kW`] : ["Corriente I_B", `${n(i.current, 2)} A`],
        ["cos φ", n(i.cosPhi, 2)],
        ...(i.circuitType === "inversor" ? ([["Factor de servicio", n(i.serviceFactor, 2)]] as [string, string][]) : []),
      ],
    ],
    [
      "Canalización",
      [
        ["Tipo de canalización", ROUTING[i.routing] ?? i.routing],
        [
          "Formación del cable",
          i.cableForm === "multi"
            ? "Multipolar"
            : `Unipolares${
                /bandeja_(perforada|escalera)/.test(i.routing)
                  ? ` ${UNI_ARR[i.uniArrangement] ?? ""}`
                  : i.routing === "enterrado"
                    ? ` ${UNI_ARR[i.buriedArrangement] ?? ""}`
                    : ""
              }`,
        ],
        ["Longitud del tramo (ida)", `${n(i.lengthM, 0)} m`],
        ["ΔU máximo", i.duLimitOverride > 0 ? `${n(i.duLimitOverride, 1)} % (del proyecto)` : `${n(res.duLimitPct, 1)} % (reglamentario)`],
        ...(usesConduit(i) ? ([["Tipo de caño", CONDUIT[i.conduit] ?? i.conduit]] as [string, string][]) : []),
        ["Circuitos agrupados", String(i.circuits)],
        ["Conductores en paralelo", res.parallel > 1 ? `${res.parallel} por polo${res.parallelAuto ? " (automático)" : ""}` : "1 (sin paralelo)"],
      ],
    ],
    [
      "Condiciones de instalación",
      [
        ...(buried
          ? ([
              ["Temperatura del terreno", `${n(i.groundTemp, 0)} °C`],
              ["Resistividad térmica del terreno", `${n(i.soilRho, 1)} K·m/W`],
            ] as [string, string][])
          : ([["Temperatura ambiente", `${n(i.ambientTemp, 0)} °C`]] as [string, string][])),
        ["Local", i.location === "publica" ? "Pública concurrencia (BD2–4)" : "Estándar (BD1)"],
        ["Ambiente", i.environment === "intemperie" ? "Intemperie" : "Interior"],
      ],
    ],
  ];
  if (i.ikKa > 0) {
    grupos.push(["Cortocircuito", [["I″k máx. en el tablero", `${n(i.ikKa, 1)} kA`], ["Tiempo de despeje", `${n(i.tScS, 2)} s`]]]);
  }
  return grupos;
}

/** Gráfico de barras I_z por sección probada, con la línea de I_diseño. */
function graficoSvg(r: FamilyResult, iDesign: number): string {
  const f = r.final!;
  const filas = r.curve.filter((c) => c.section <= f.section + 1e-9).slice(-5);
  const next = r.curve.find((c) => c.section > f.section + 1e-9);
  if (next) filas.push(next);
  if (!filas.length) return "";
  const W = 520, H = 170, L = 38, B = 30, T = 14, R = 10;
  const max = Math.max(...filas.map((c) => c.iz), iDesign) * 1.12;
  const bw = (W - L - R) / filas.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  const barras = filas
    .map((c, k) => {
      const x = L + k * bw + bw * 0.18;
      const w = bw * 0.64;
      const col = c.section === f.section ? "#78b409" : c.ok ? "#b6dd7c" : "#e9a3a3";
      return `<rect x="${x.toFixed(1)}" y="${y(c.iz).toFixed(1)}" width="${w.toFixed(1)}" height="${(H - B - y(c.iz)).toFixed(1)}" rx="3" fill="${col}"/>
      <text x="${(x + w / 2).toFixed(1)}" y="${(y(c.iz) - 3).toFixed(1)}" font-size="8" text-anchor="middle" fill="#173f44">${n(c.iz, 0)} A</text>
      <text x="${(x + w / 2).toFixed(1)}" y="${H - B + 12}" font-size="8.5" text-anchor="middle" fill="#243238" font-weight="${c.section === f.section ? 700 : 400}">${n(c.section, c.section % 1 ? 1 : 0)} mm²</text>`;
    })
    .join("");
  const ref = `<line x1="${L}" x2="${W - R}" y1="${y(iDesign).toFixed(1)}" y2="${y(iDesign).toFixed(1)}" stroke="#d9534f" stroke-width="1.2" stroke-dasharray="5 3"/>
      <text x="${W - R}" y="${(y(iDesign) - 3).toFixed(1)}" font-size="8" text-anchor="end" fill="#b0302c">I diseño = ${n(iDesign)} A</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-height:215px" role="img" aria-label="Corriente admisible por sección">
      <line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#cfdcdb"/><line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#cfdcdb"/>
      <text x="${L - 4}" y="${T + 4}" font-size="8" text-anchor="end" fill="#647572">${n(max, 0)}</text>
      <text x="${L - 4}" y="${H - B}" font-size="8" text-anchor="end" fill="#647572">0</text>
      ${barras}${ref}</svg>`;
}

const alertaHtml = (a: Alert) =>
  `<li class="al ${a.level}"><span class="tag">${a.level === "error" ? "Error" : a.level === "warning" ? "Atención" : "Norma"}</span>${esc(a.message)} <span class="cod">[${esc(a.code)}]</span></li>`;

export interface DatosInforme {
  proyecto: string;
  elaboro: string;
}

export function construirHtmlInformeCables(res: CalcResult, inputs: CalcInputs, datos: DatosInforme): string {
  const r = res.shown!;
  const f = r.final!;
  const iDesign = res.iRequired;
  const isDC = inputs.side === "DC";
  const par = Math.max(1, res.parallel);
  const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  const steps = buildSteps(r, res, { ...inputs, parallel: res.parallel });
  const okAmp = f.iz >= iDesign - 1e-9;
  const okDu = f.duPct <= res.duLimitPct + 1e-9;

  // Fuentes únicas citadas en los pasos
  const vistos = new Map<string, StepSource>();
  steps.forEach((s) =>
    s.sources.forEach((src) => {
      if (src.src) vistos.set(`${src.src.file}|${src.src.page}`, src);
    }),
  );
  const fuentes = [...vistos.values()]
    .map(
      (s) =>
        `<li><b>${esc(s.src!.doc)}</b> — <i>${esc(s.src!.file)}</i>, pág. <b>${esc(s.src!.page)}</b>${s.src!.note ? `<br /><span class="n">${esc(s.src!.note)}</span>` : ""}</li>`,
    )
    .join("");

  const alerts = [...res.globalAlerts, ...(r.alerts ?? [])];
  const importantes = alerts.filter((a) => a.level !== "info");
  const normas = alerts.filter((a) => a.level === "info");

  const entradas = datosEntrada(res, { ...inputs, parallel: res.parallel })
    .map(
      ([titulo, filas]) => `
      <div class="grupo"><div class="g-t">${esc(titulo)}</div>
        ${filas.map(([l, v]) => `<div class="fila-d"><span class="l">${esc(l)}</span><span class="v">${esc(v)}</span></div>`).join("")}
      </div>`,
    )
    .join("");

  const pasosHtml = steps
    .map(
      (s) => `
      <div class="paso">
        <div class="p-n">${s.num}</div>
        <div class="p-c">
          <div class="p-t">${esc(s.title)}</div>
          ${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
          ${s.formulas.map((x) => `<div class="fx">${esc(x)}</div>`).join("")}
          ${s.bullets.length ? `<ul class="bl">${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
          ${
            s.table
              ? `<table class="tp"><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
                  .map((row) => `<tr class="${row.ok ? "ok" : "no"}">${row.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
                  .join("")}</tbody></table>`
              : ""
          }
          ${s.after ? `<p>${esc(s.after)}</p>` : ""}
          ${s.sources
            .map(
              (src) =>
                `<div class="src">▤ <b>${esc(src.label)}:</b> ${
                  src.src
                    ? `${esc(src.src.doc)} — <i>${esc(src.src.file)}</i>, pág. <b>${esc(src.src.page)}</b>${src.src.note ? ` · ${esc(src.src.note)}` : ""}`
                    : esc(src.text)
                }</div>`,
            )
            .join("")}
          <div class="p-r">→ ${esc(s.result)}</div>
        </div>
      </div>`,
    )
    .join("");

  const comparativa =
    res.results.length > 1
      ? `<section class="sec">
      <div class="sec-t">Comparativa por tipo de cable</div>
      <table class="tabla">
        <thead><tr><th>Tipo de cable</th><th>S ampac.</th><th>S ΔU</th><th>S final</th><th>ΔU</th><th>I_z</th><th>Estado</th></tr></thead>
        <tbody>${res.results
          .map((x) => {
            const rec = res.recommended?.familyId === x.familyId;
            return `<tr class="${rec ? "rec" : ""}"><td><b>${esc(x.familyName)}</b><br /><span class="n">${esc(x.norma)}</span></td>
            <td>${mm(x.sAmp)}</td><td>${mm(x.sDu)}</td><td><b>${x.final ? mm(x.final.section) : "—"}</b></td>
            <td>${x.final ? `${n(x.final.duPct, 2)} %` : "—"}</td><td>${x.final ? `${n(x.final.iz, 0)} A` : "—"}</td>
            <td>${x.blocked ? "No admitido" : rec ? "<b>Recomendado</b>" : "Cumple"}</td></tr>`;
          })
          .join("")}</tbody>
      </table></section>`
      : "";

  const recomendacion = res.recommendation
    ? `<section class="sec">
      <div class="sec-t">Por qué esa aislación y esa norma</div>
      <div class="bloque"><ul class="bl">${res.recommendation.reasons.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      ${res.recommendation.admitted.length ? `<div class="n" style="margin-top:5px">Admitidos: ${esc(res.recommendation.admitted.join(" · "))}</div>` : ""}</div>
    </section>`
    : "";

  const proteccion = r.protection
    ? `<section class="sec">
      <div class="sec-t">${isDC ? "Protección" : "Protección termomagnética (especificación)"}</div>
      <div class="hechos">${r.protection.specs
        .map((sp) => `<div class="hecho w"><div class="l">${esc(sp.label)}</div><div class="v">${esc(sp.value)}</div></div>`)
        .join("")}</div>
      ${r.protection.notes.map((t) => `<div class="nota">${esc(t)}</div>`).join("")}
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Dimensionamiento de conductores${datos.proyecto ? " - " + esc(datos.proyecto) : ""}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #243238; font-size: 10px; line-height: 1.45; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    b, strong { color: #173f44; }
    .top { position: relative; overflow: hidden; background: #173f44; color: #fff; border-radius: 14px; padding: 18px 22px 17px; margin-bottom: 12px; display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: end; }
    .top::after { content: ""; position: absolute; top: -50px; right: -30px; width: 240px; height: 170px; background: rgba(255,255,255,.06); transform: rotate(-16deg); border-radius: 28px; }
    .top > * { position: relative; z-index: 1; }
    .brand { color: #9be21b; font-weight: 800; letter-spacing: .24em; font-size: 17px; margin-bottom: 11px; }
    .top h1 { margin: 0; font-size: 19px; font-weight: 750; line-height: 1.15; }
    .top .sub { color: #c5d6d8; font-size: 10px; margin-top: 3px; }
    .meta { text-align: right; color: #c5d6d8; font-size: 10px; }
    .meta strong { display: block; color: #fff; font-size: 12.5px; }
    .kpis { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr; gap: 9px; }
    .kpi { border: 1px solid #dfe8e7; border-radius: 12px; padding: 12px 14px; }
    .kpi.main { background: #f2f8e8; border-color: #d7e9ba; border-left: 6px solid #9be21b; }
    .lab { font-size: 8px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; color: #56706b; margin-bottom: 4px; }
    .val { font-size: 23px; font-weight: 800; color: #173f44; line-height: 1.1; letter-spacing: -.01em; }
    .val small { font-size: 11px; font-weight: 700; color: #56706b; }
    .kpi .s { font-size: 9px; color: #647572; margin-top: 5px; line-height: 1.4; }
    .ok-t { color: #2f7d1f; font-weight: 700; } .no-t { color: #b0302c; font-weight: 700; }
    .sec { margin-top: 14px; }
    .sec-t { display: flex; align-items: center; gap: 7px; margin-bottom: 7px; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #173f44; break-after: avoid; }
    .sec-t::before { content: ""; width: 7px; height: 7px; border-radius: 2px; background: #9be21b; }
    .nota { color: #647572; font-size: 9px; margin-top: 5px; }
    .n { color: #72817e; font-size: 8.5px; }
    .grupos { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
    .grupo { border: 1px solid #dfe8e7; border-radius: 12px; overflow: hidden; break-inside: avoid; }
    .g-t { background: #f3f7f6; padding: 5px 12px; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #56706b; }
    .fila-d { display: flex; justify-content: space-between; gap: 10px; padding: 4px 12px; border-top: 1px solid #eef3f2; }
    .fila-d .l { color: #647572; } .fila-d .v { font-weight: 700; color: #173f44; text-align: right; }
    .hechos { display: flex; flex-wrap: wrap; gap: 1px; background: #e6eeed; border: 1px solid #e6eeed; border-radius: 12px; overflow: hidden; }
    .hecho { background: #fff; padding: 7px 12px; flex: 1 1 45%; min-width: 0; }
    .hecho .l { font-size: 7.5px; text-transform: uppercase; letter-spacing: .07em; color: #72817e; }
    .hecho .v { font-weight: 700; color: #173f44; font-size: 10px; line-height: 1.3; }
    .grafico { border: 1px solid #dfe8e7; border-radius: 12px; padding: 8px 12px 4px; break-inside: avoid; }
    .paso { display: flex; gap: 10px; border: 1px solid #dfe8e7; border-radius: 10px; padding: 8px 11px; margin-bottom: 6px; break-inside: avoid; }
    .p-n { flex: none; width: 20px; height: 20px; border-radius: 50%; background: #173f44; color: #fff; font-weight: 800; font-size: 10px; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .p-c { flex: 1; min-width: 0; }
    .p-t { font-weight: 800; color: #173f44; font-size: 10.5px; }
    .paso p { margin: 3px 0 0; }
    .fx { margin-top: 4px; background: #f3f7f6; border-radius: 6px; padding: 4px 8px; font-family: "Consolas", "Courier New", monospace; font-size: 9px; color: #243238; overflow-wrap: anywhere; }
    .bl { margin: 4px 0 0; padding-left: 15px; color: #4d615f; font-size: 9.2px; }
    .src { margin-top: 4px; font-size: 8.4px; color: #647572; line-height: 1.4; }
    .p-r { margin-top: 5px; font-weight: 800; color: #173f44; }
    .tp, .tabla { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 9px; }
    .tp th, .tabla th { text-align: left; font-size: 7.8px; text-transform: uppercase; letter-spacing: .06em; color: #72817e; padding: 3px 6px; border-bottom: 1px solid #dfe8e7; }
    .tp td, .tabla td { padding: 4px 6px; border-top: 1px solid #eef3f2; vertical-align: top; }
    .tp tr.ok td:last-child { color: #2f7d1f; font-weight: 700; } .tp tr.no td:last-child { color: #b0302c; }
    .tabla { border: 1px solid #dfe8e7; border-radius: 10px; } .tabla tr.rec { background: #f2f8e8; }
    .bloque { border: 1px solid #dfe8e7; border-radius: 12px; padding: 9px 13px; font-size: 9.5px; color: #4d615f; }
    ul.al { list-style: none; margin: 0; padding: 0; }
    .al { margin-bottom: 5px; padding: 6px 10px; border-radius: 8px; border: 1px solid #dfe8e7; font-size: 9px; break-inside: avoid; }
    .al.warning { background: #fff8e6; border-color: #f0dca0; } .al.error { background: #fdeeee; border-color: #efbcbc; } .al.info { background: #f6f9f9; }
    .al .tag { display: inline-block; margin-right: 6px; padding: 0 5px; border-radius: 4px; font-size: 7.5px; font-weight: 800; text-transform: uppercase; background: #173f44; color: #fff; }
    .al.warning .tag { background: #e0a800; color: #000; } .al.error .tag { background: #b0302c; }
    .al .cod { color: #8a9a97; font-size: 8px; }
    .fuentes { margin: 0; padding-left: 16px; font-size: 8.8px; color: #4d615f; } .fuentes li { margin-bottom: 3px; }
    .consideracion { margin-top: 12px; border-left: 3px solid #9be21b; background: #f7f9f9; padding: 9px 12px; font-size: 8.8px; color: #596b68; line-height: 1.5; }
    .pie { margin-top: 12px; padding-top: 8px; border-top: 1px solid #dfe8e7; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8px; color: #70807d; }
    .pie .marca { color: #78b409; font-weight: 800; letter-spacing: .1em; }
  </style>
</head>
<body>
  <main>
    <header class="top">
      <div>
        <div class="brand">ECOVATIO</div>
        <h1>Dimensionamiento de conductores ${isDC ? "FV (CC)" : "de baja tensión"}</h1>
        <div class="sub">Sección, aislación, norma y especificación de la protección · ampacidad, caída de tensión y cortocircuito</div>
      </div>
      <div class="meta">
        <strong>${esc(datos.proyecto || "Circuito sin identificar")}</strong>
        ${datos.elaboro ? `Elaboró: ${esc(datos.elaboro)}<br />` : ""}Generado el ${fecha}
      </div>
    </header>

    <section class="kpis">
      <div class="kpi main">
        <div class="lab">Sección recomendada</div>
        <div class="val">${par > 1 ? `${par} × ` : ""}${mm(f.section)}</div>
        <div class="s"><b>${esc(r.cableLabel)}</b></div>
      </div>
      <div class="kpi">
        <div class="lab">Aislación y norma</div>
        <div class="s" style="margin-top:0;font-size:9.5px"><b>${esc(r.insulation)}</b><br />${esc(r.norma)}</div>
      </div>
      <div class="kpi">
        <div class="lab">Corriente</div>
        <div class="val">${n(f.iz)} <small>A</small></div>
        <div class="s">I_z ${okAmp ? "≥" : "<"} I diseño ${n(iDesign)} A <span class="${okAmp ? "ok-t" : "no-t"}">${okAmp ? "✓" : "✗"}</span></div>
      </div>
      <div class="kpi">
        <div class="lab">Caída de tensión</div>
        <div class="val">${n(f.duPct, 2)} <small>%</small></div>
        <div class="s">límite ${n(res.duLimitPct, 1)} % <span class="${okDu ? "ok-t" : "no-t"}">${okDu ? "✓" : "✗"}</span><br />${esc(res.duLimitSource)}</div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-t">Datos de entrada</div>
      <div class="grupos">${entradas}</div>
    </section>

    ${proteccion}

    ${
      r.curve.length
        ? `<section class="sec"><div class="sec-t">Corriente admisible por sección probada</div>
      <div class="grafico">${graficoSvg(r, iDesign)}
      <div class="n" style="margin:2px 0 6px">Barras: I_z de cada sección (verde oscuro = sección adoptada, verde claro = cumple, rojo = no cumple). Línea roja: corriente de diseño.</div></div></section>`
        : ""
    }

    <section class="sec">
      <div class="sec-t">Cálculo paso a paso</div>
      ${pasosHtml}
    </section>

    ${comparativa}
    ${recomendacion}

    ${
      importantes.length || r.dataNotes.length
        ? `<section class="sec"><div class="sec-t">Advertencias</div><ul class="al">${importantes.map(alertaHtml).join("")}${
            r.dataNotes.length ? `<li class="al warning"><span class="tag">Dato provisorio</span>${esc(r.dataNotes.join(" "))}</li>` : ""
          }</ul></section>`
        : ""
    }
    ${normas.length ? `<section class="sec"><div class="sec-t">Requisitos normativos de la instalación</div><ul class="al">${normas.map(alertaHtml).join("")}</ul></section>` : ""}

    <section class="sec">
      <div class="sec-t">Catálogos y documentos consultados</div>
      <ol class="fuentes">${fuentes}</ol>
    </section>

    <div class="consideracion">
      <strong>Importante:</strong> resultado de predimensionamiento. Verifique manualmente el cálculo, compárelo con el datasheet del
      proveedor del cable y valídelo con un profesional habilitado antes de adoptarlo. Los valores marcados como «de referencia» (sección
      mínima de la AEA 90364-7-771 y factores de agrupamiento de cables enterrados) deben confirmarse con la edición vigente del reglamento.
    </div>

    <footer class="pie">
      <div>Uso interno · Áreas Comercial, Ingeniería y Operaciones<br />Documento generado desde el Panel de Obras Solares.</div>
      <div class="marca">ECOVATIO</div>
    </footer>
  </main>

  <script>
    window.onload = function () {
      window.setTimeout(function () { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
}
