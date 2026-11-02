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

const alertaHtml = (a: Alert) =>
  `<li class="al ${a.level}"><span class="tag">${a.level === "error" ? "Error" : a.level === "warning" ? "Atención" : "Norma"}</span>${esc(a.message)}</li>`;

export interface DatosInforme {
  proyecto: string;
  elaboro: string;
}

/**
 * Informe de 1–2 páginas: resultado, consideraciones de diseño y cálculo completo con sus fuentes.
 * Sin comparativas entre tipos de cable.
 */
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

  // Consideraciones de diseño: todos los datos de entrada en una grilla compacta.
  const consideraciones = datosEntrada(res, { ...inputs, parallel: res.parallel })
    .flatMap(([, filas]) => filas)
    .map(([l, v]) => `<div class="c"><span class="l">${esc(l)}</span><span class="v">${esc(v)}</span></div>`)
    .join("");

  const fuenteTxt = (src: StepSource) =>
    src.src
      ? `${esc(src.src.doc)} — <i>${esc(src.src.file)}</i>, pág. <b>${esc(src.src.page)}</b>${src.src.note ? ` · ${esc(src.src.note)}` : ""}`
      : esc(src.text);

  const pasosHtml = steps
    .map((s) => {
      const bullets = s.bullets.length ? `<div class="bl">${s.bullets.map(esc).join(" · ")}</div>` : "";
      const tabla = s.table
        ? `<table class="tp"><thead><tr>${s.table.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
            .slice(-3)
            .map((row) => `<tr class="${row.ok ? "ok" : "no"}">${row.cells.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      return `
      <div class="paso">
        <div class="p-n">${s.num}</div>
        <div class="p-c">
          <div class="p-h"><span class="p-t">${esc(s.title)}</span><span class="p-r">${esc(s.result)}</span></div>
          ${s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}
          ${s.formulas.map((x) => `<div class="fx">${esc(x)}</div>`).join("")}
          ${bullets}${tabla}
          ${s.after ? `<p>${esc(s.after)}</p>` : ""}
          ${s.sources.map((src) => `<div class="src">▤ <b>${esc(src.label)}:</b> ${fuenteTxt(src)}</div>`).join("")}
        </div>
      </div>`;
    })
    .join("");

  const specs = r.protection
    ? `<section class="sec">
      <div class="sec-t">${isDC ? "Protección" : "Protección termomagnética (especificación)"}</div>
      <div class="specs">${r.protection.specs.map((sp) => `<div class="sp"><span class="l">${esc(sp.label)}</span><span class="v">${esc(sp.value)}</span></div>`).join("")}</div>
    </section>`
    : "";

  const alerts = [...res.globalAlerts, ...(r.alerts ?? [])];
  const observaciones = [...alerts.filter((a) => a.level !== "info"), ...alerts.filter((a) => a.level === "info").slice(0, 3)];
  const obs =
    observaciones.length || r.dataNotes.length
      ? `<section class="sec">
      <div class="sec-t">Observaciones</div>
      <ul class="al-l">${observaciones.map(alertaHtml).join("")}${
        r.dataNotes.length ? `<li class="al warning"><span class="tag">Dato provisorio</span>${esc(r.dataNotes.join(" "))}</li>` : ""
      }</ul></section>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Dimensionamiento de conductores${datos.proyecto ? " - " + esc(datos.proyecto) : ""}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: Inter, "Segoe UI", Arial, sans-serif; color: #243238; font-size: 8.6px; line-height: 1.34; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    b, strong { color: #173f44; }
    .top { background: #173f44; color: #fff; border-radius: 10px; padding: 9px 16px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; gap: 14px; }
    .brand { color: #9be21b; font-weight: 800; letter-spacing: .24em; font-size: 12px; margin-bottom: 4px; }
    .top h1 { margin: 0; font-size: 14.5px; font-weight: 750; line-height: 1.15; }
    .top .sub { color: #c5d6d8; font-size: 8.5px; margin-top: 2px; }
    .meta { text-align: right; color: #c5d6d8; font-size: 8.5px; line-height: 1.45; }
    .meta strong { display: block; color: #fff; font-size: 10.5px; }
    .kpis { display: grid; grid-template-columns: 1.35fr 1.1fr 1fr 1fr; gap: 7px; }
    .kpi { border: 1px solid #dfe8e7; border-radius: 9px; padding: 8px 11px; }
    .kpi.main { background: #f2f8e8; border-color: #d7e9ba; border-left: 5px solid #9be21b; }
    .lab { font-size: 7px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #56706b; margin-bottom: 2px; }
    .val { font-size: 19px; font-weight: 800; color: #173f44; line-height: 1.1; }
    .val small { font-size: 9.5px; font-weight: 700; color: #56706b; }
    .kpi .s { font-size: 8px; color: #647572; margin-top: 3px; line-height: 1.35; }
    .ok-t { color: #2f7d1f; font-weight: 800; } .no-t { color: #b0302c; font-weight: 800; }
    .sec { margin-top: 7px; }
    .sec-t { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; font-size: 8px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #173f44; break-after: avoid; }
    .sec-t::before { content: ""; width: 6px; height: 6px; border-radius: 2px; background: #9be21b; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 14px; border: 1px solid #dfe8e7; border-radius: 9px; padding: 3px 11px; }
    .c, .sp { display: flex; justify-content: space-between; gap: 8px; padding: 2.5px 0; border-bottom: 1px solid #f0f4f3; }
    .l { color: #6a7b78; } .v { font-weight: 700; color: #173f44; text-align: right; }
    .specs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 18px; border: 1px solid #dfe8e7; border-radius: 9px; padding: 3px 11px; }
    .pasos { column-count: 2; column-gap: 7px; }
    .paso { display: flex; gap: 8px; border: 1px solid #dfe8e7; border-radius: 8px; padding: 4px 9px; margin-bottom: 3px; break-inside: avoid; }
    .p-n { flex: none; width: 16px; height: 16px; border-radius: 50%; background: #173f44; color: #fff; font-weight: 800; font-size: 8.5px; display: flex; align-items: center; justify-content: center; margin-top: 1px; }
    .p-c { flex: 1; min-width: 0; }
    .p-h { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
    .p-t { font-weight: 800; color: #173f44; font-size: 9.2px; }
    .p-r { font-weight: 800; color: #173f44; font-size: 8.6px; text-align: right; }
    .paso p { margin: 2px 0 0; color: #4d615f; }
    .fx { margin-top: 3px; background: #f3f7f6; border-radius: 5px; padding: 2.5px 7px; font-family: Consolas, "Courier New", monospace; font-size: 8px; color: #243238; overflow-wrap: anywhere; }
    .bl { margin-top: 3px; color: #647572; font-size: 8px; }
    .src { margin-top: 2.5px; font-size: 7.4px; color: #6a7b78; line-height: 1.35; }
    .tp { width: 100%; border-collapse: collapse; margin-top: 3px; font-size: 8px; }
    .tp th { text-align: left; font-size: 7px; text-transform: uppercase; color: #72817e; padding: 2px 5px; border-bottom: 1px solid #dfe8e7; }
    .tp td { padding: 2px 5px; border-top: 1px solid #eef3f2; }
    .tp tr.ok td:last-child { color: #2f7d1f; font-weight: 700; } .tp tr.no td:last-child { color: #b0302c; }
    .al-l { list-style: none; margin: 0; padding: 0; }
    .al { margin-bottom: 3px; padding: 3.5px 8px; border-radius: 6px; border: 1px solid #dfe8e7; font-size: 8px; break-inside: avoid; }
    .al.warning { background: #fff8e6; border-color: #f0dca0; } .al.error { background: #fdeeee; border-color: #efbcbc; } .al.info { background: #f6f9f9; }
    .al .tag { display: inline-block; margin-right: 5px; padding: 0 4px; border-radius: 3px; font-size: 6.8px; font-weight: 800; text-transform: uppercase; background: #173f44; color: #fff; }
    .al.warning .tag { background: #e0a800; color: #000; } .al.error .tag { background: #b0302c; }
    .consideracion { margin-top: 6px; border-left: 3px solid #9be21b; background: #f7f9f9; padding: 6px 10px; font-size: 7.8px; color: #596b68; line-height: 1.45; break-inside: avoid; }
    .pie { margin-top: 6px; padding-top: 5px; border-top: 1px solid #dfe8e7; display: flex; justify-content: space-between; align-items: flex-end; font-size: 7.4px; color: #70807d; }
    .pie .marca { color: #78b409; font-weight: 800; letter-spacing: .1em; }
  </style>
</head>
<body>
  <main>
    <header class="top">
      <div>
        <div class="brand">ECOVATIO</div>
        <h1>Dimensionamiento de conductores ${isDC ? "FV (CC)" : "de baja tensión"}</h1>
        <div class="sub">Memoria de cálculo · ampacidad, caída de tensión y cortocircuito</div>
      </div>
      <div class="meta">
        <strong>${esc(datos.proyecto || "Circuito sin identificar")}</strong>
        ${datos.elaboro ? `Elaboró: ${esc(datos.elaboro)}<br />` : ""}Generado el ${fecha}
      </div>
    </header>

    <section class="kpis">
      <div class="kpi main">
        <div class="lab">Sección adoptada</div>
        <div class="val">${par > 1 ? `${par} × ` : ""}${mm(f.section)}</div>
        <div class="s"><b>${esc(r.cableLabel)}</b></div>
      </div>
      <div class="kpi">
        <div class="lab">Aislación y norma</div>
        <div class="s" style="margin-top:0;font-size:8.6px"><b>${esc(r.insulation)}</b><br />${esc(r.norma)}</div>
      </div>
      <div class="kpi">
        <div class="lab">Corriente</div>
        <div class="val">${n(f.iz)} <small>A</small></div>
        <div class="s">I_z ${okAmp ? "≥" : "<"} I diseño ${n(iDesign)} A <span class="${okAmp ? "ok-t" : "no-t"}">${okAmp ? "✓" : "✗"}</span></div>
      </div>
      <div class="kpi">
        <div class="lab">Caída de tensión</div>
        <div class="val">${n(f.duPct, 2)} <small>%</small></div>
        <div class="s">límite ${n(res.duLimitPct, 1)} % <span class="${okDu ? "ok-t" : "no-t"}">${okDu ? "✓" : "✗"}</span></div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-t">Consideraciones de diseño</div>
      <div class="grid">${consideraciones}</div>
    </section>

    <section class="sec">
      <div class="sec-t">Cálculo</div>
      <div class="pasos">${pasosHtml}</div>
    </section>

    ${specs}
    ${obs}

    <div class="consideracion">
      <strong>Importante:</strong> resultado de predimensionamiento. Verifique manualmente el cálculo, compárelo con el datasheet del
      proveedor del cable y valídelo con un profesional habilitado. Los valores marcados «de referencia» (sección mínima de la AEA 90364-7-771
      y factores de agrupamiento de cables enterrados) deben confirmarse con la edición vigente del reglamento.
    </div>

    <footer class="pie">
      <div>Uso interno · Áreas Comercial, Ingeniería y Operaciones · Documento generado desde el Panel de Obras Solares.</div>
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
