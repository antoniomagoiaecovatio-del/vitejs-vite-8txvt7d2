// Informe del cálculo de conductores (HTML que luego se convierte en PDF).
// Pensado para quien no es del rubro: lenguaje simple, gráficos y el detalle del cálculo con sus fuentes.
import { CIRCUITS, protectionRatings } from "../engine/calc";
import { isBuried, usesConduit } from "../engine/rules";
import type { CalcInputs, CalcResult, FamilyResult } from "../engine/types";
import { buildSteps, mm, n, type StepSource } from "./steps";

const esc = (v: unknown) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

/** Igual que esc, pero convierte I_B, f_total, V_mp… en subíndices (el guion bajo se pierde al capturar la imagen). */
const escf = (v: unknown) => esc(v).replace(/(?<![A-Za-z0-9])([IfVURXSPk])_([A-Za-z0-9ñ]+)/g, "$1<sub>$2</sub>");

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

export interface DatosInforme {
  proyecto: string;
  elaboro: string;
}

/** Etiquetas de «datos del proyecto» en lenguaje simple. */
const SIMPLE: Record<string, string> = {
  "Tipo de sistema": "Tipo de instalación",
  "cos φ": "Factor de potencia (cos φ)",
  "ΔU máximo": "Pérdida de tensión máxima admitida",
  "Circuitos agrupados": "Circuitos que comparten el recorrido",
  "Conductores en paralelo": "Cables en paralelo por fase",
  "Longitud del tramo (ida)": "Distancia del cable (un solo sentido)",
  "Tipo de cable pedido": "Tipo de cable elegido",
  "Material del conductor": "Material del cable",
  "I″k máx. en el tablero": "Corriente de cortocircuito en el tablero",
  "Tiempo de despeje": "Tiempo que tarda en actuar la protección",
  "Formación del cable": "Tipo de cable",
  "Conductor neutro": "Neutro",
  "I_sc (STC)": "Corriente de cortocircuito del panel",
  "I_mp (STC)": "Corriente de trabajo del panel",
  "V_mp del string": "Tensión de trabajo del string",
  "Strings en paralelo (cable principal)": "Strings en paralelo",
  "Strings por entrada del combiner": "Strings por entrada de la caja de conexión",
  "Fusible máx. del módulo": "Fusible máximo del panel",
};
const sl = (l: string) => SIMPLE[l] ?? l;

/** Barra horizontal de un gráfico (todo con HTML/CSS: se captura bien en el PDF). */
function barra(etiqueta: string, valor: number, max: number, color: string, texto: string, destacada: boolean): string {
  const w = Math.max(2, Math.min(100, (valor / max) * 100));
  return `<div class="br${destacada ? " dest" : ""}">
      <div class="br-l">${esc(etiqueta)}</div>
      <div class="br-t"><div class="br-b" style="width:${w.toFixed(1)}%;background:${color}"></div></div>
      <div class="br-v">${esc(texto)}</div>
    </div>`;
}

const VERDE = "#78b409";
const VERDE_CL = "#b9de7e";
const ROJO = "#e08a85";

/** Gráfico 1: ¿aguanta la corriente? (I_z de cada sección probada y la corriente necesaria). */
function graficoCorriente(r: FamilyResult, iDesign: number): string {
  const f = r.final!;
  const filas = r.curve.filter((c) => c.section <= f.section + 1e-9).slice(-4);
  const sig = r.curve.find((c) => c.section > f.section + 1e-9);
  if (sig) filas.push(sig);
  const max = Math.max(...filas.map((c) => c.iz), iDesign) * 1.08;
  const pos = Math.min(100, (iDesign / max) * 100);
  return `<div class="graf">
    <div class="graf-t">¿Aguanta la corriente?</div>
    <div class="graf-s">Cuánta corriente soporta cada sección de cable, comparada con la que necesita el circuito.</div>
    <div class="area">
      <div class="marca" style="left:calc(50px + (100% - 98px) * ${(pos / 100).toFixed(4)})"><span>Necesita ${n(iDesign)} A</span></div>
      ${filas
        .map((c) =>
          barra(
            mm(c.section),
            c.iz,
            max,
            c.section === f.section ? VERDE : c.ok || c.iz >= iDesign - 1e-9 ? VERDE_CL : ROJO,
            `${n(c.iz, 0)} A`,
            c.section === f.section,
          ),
        )
        .join("")}
    </div>
    <div class="graf-p">${filas.some((c) => c.iz < iDesign - 1e-9) ? "Las barras rojas no alcanzan la corriente necesaria. " : ""}La verde oscura es la sección elegida.</div>
  </div>`;
}

/** Gráfico 2: ¿se pierde mucha tensión? (ΔU % de cada sección y el límite). */
function graficoTension(r: FamilyResult, limite: number): string {
  const f = r.final!;
  const filas = r.curve.filter((c) => c.section <= f.section + 1e-9).slice(-4);
  const sig = r.curve.find((c) => c.section > f.section + 1e-9);
  if (sig) filas.push(sig);
  const max = Math.max(...filas.map((c) => c.duPct), limite) * 1.08;
  const pos = Math.min(100, (limite / max) * 100);
  return `<div class="graf">
    <div class="graf-t">¿Se pierde mucha tensión?</div>
    <div class="graf-s">Tensión que se pierde en el cable según la sección, comparada con el máximo permitido.</div>
    <div class="area">
      <div class="marca" style="left:calc(50px + (100% - 98px) * ${(pos / 100).toFixed(4)})"><span>Máximo ${n(limite, 1)} %</span></div>
      ${filas
        .map((c) =>
          barra(
            mm(c.section),
            c.duPct,
            max,
            c.section === f.section ? VERDE : c.duPct <= limite + 1e-9 ? VERDE_CL : ROJO,
            `${n(c.duPct, 2)} %`,
            c.section === f.section,
          ),
        )
        .join("")}
    </div>
    <div class="graf-p">Cuanto más gruesa la sección, menos tensión se pierde. ${filas.some((c) => c.duPct > limite + 1e-9) ? "Las barras rojas superan el máximo." : ""}</div>
  </div>`;
}

const PROT_LABEL: Record<string, string> = {
  Tipo: "Tipo de protección",
  "Corriente nominal (I_n) o regulación térmica (I_r)": "Corriente nominal del interruptor",
  "Valores normalizados en el rango": "Valores comerciales posibles",
  Polos: "Polos",
  "Tensión nominal de empleo": "Tensión de trabajo",
  "Poder de corte": "Poder de corte (capacidad de cortar un cortocircuito)",
  "Norma del interruptor": "Norma",
};

/** Explicación en lenguaje simple de cada paso del cálculo. */
function explicacion(key: string, r: FamilyResult, res: CalcResult, i: CalcInputs): { pregunta: string; texto: string } {
  const isDC = i.side === "DC";
  switch (key) {
    case "corriente":
      return isDC
        ? {
            pregunta: "¿Qué corriente tiene que soportar el cable?",
            texto: "En una instalación solar el cable debe soportar un 25 % más que la corriente de cortocircuito de los paneles. Así lo exige la AEA 90364-7-712.",
          }
        : {
            pregunta: "¿Cuánta corriente va a circular?",
            texto: "Es la corriente que consume la carga cuando funciona. Se calcula con la potencia, la tensión de la red y el factor de potencia (cos φ).",
          };
    case "minima":
      return {
        pregunta: "¿Cuál es el cable más fino que permite el reglamento?",
        texto: isDC
          ? "El cable solar de este catálogo se fabrica desde 4 mm², por eso es la menor sección que se evalúa."
          : "Aunque la corriente sea baja, el reglamento no permite cables demasiado finos. El mínimo depende del uso del circuito: por ejemplo, 1,5 mm² para iluminación y 2,5 mm² para tomacorrientes y motores.",
      };
    case "metodo":
      return {
        pregunta: "¿Cuánta corriente aguanta el cable en condiciones ideales?",
        texto: "Cada fabricante publica cuánta corriente soporta un cable según cómo se instale (en caño, en bandeja, enterrado). Es la capacidad base del cable.",
      };
    case "factores":
      return {
        pregunta: "¿Cómo cambia esa capacidad en la instalación real?",
        texto: "La capacidad base vale para condiciones ideales. Baja si hace más calor, si varios cables van juntos o si el terreno disipa mal el calor. Por eso se corrige con tres factores que se multiplican.",
      };
    case "ampacidad":
      return {
        pregunta: "¿El cable aguanta la corriente del circuito?",
        texto: "Se compara lo que el cable realmente aguanta (capacidad corregida, I_z) con la corriente que va a circular. La capacidad tiene que ser igual o mayor.",
      };
    case "caida":
      return {
        pregunta: "¿Cuánta tensión se pierde en el cable?",
        texto: `Cuanto más largo el cable y más corriente circula, más tensión se pierde en el camino. Si se pierde demasiado, los equipos reciben menos tensión de la que necesitan. El máximo admitido acá es ${n(res.duLimitPct, 1)} %.`,
      };
    case "cortocircuito":
      return {
        pregunta: "¿El cable resiste un cortocircuito?",
        texto: "Ante un cortocircuito el cable se calienta muy rápido. Se verifica que la sección alcance para resistir ese calentamiento hasta que la protección actúe.",
      };
    default:
      return {
        pregunta: "¿Qué cable se elige finalmente?",
        texto: isDC
          ? "Se prueban las secciones de menor a mayor y se elige la primera que cumple todo a la vez."
          : "Se prueban las secciones de menor a mayor y se elige la primera que cumple todo a la vez. Además tiene que existir un interruptor termomagnético comercial cuya corriente nominal quede entre la corriente del circuito y la capacidad del cable.",
      };
  }
}

const claveDe = (titulo: string) =>
  /^Corriente de (diseño|proyecto)/.test(titulo)
    ? "corriente"
    : /^Sección mínima/.test(titulo)
      ? "minima"
      : /^Método de instalación/.test(titulo)
        ? "metodo"
        : /^Factores/.test(titulo)
          ? "factores"
          : /^Verificación por ampacidad/.test(titulo)
            ? "ampacidad"
            : /^Caída de tensión/.test(titulo)
              ? "caida"
              : /^Cortocircuito/.test(titulo)
                ? "cortocircuito"
                : "final";

/**
 * Informe de hasta 2 páginas pensado para quien no es del rubro: qué cable usar, por qué y cómo se calculó,
 * con gráficos de capacidad de corriente y caída de tensión.
 */
export function construirHtmlInformeCables(res: CalcResult, inputs: CalcInputs, datos: DatosInforme): string {
  const r = res.shown!;
  const f = r.final!;
  const iDesign = res.iRequired;
  const isDC = inputs.side === "DC";
  const par = Math.max(1, res.parallel);
  const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
  const inp = { ...inputs, parallel: res.parallel };
  const steps = buildSteps(r, res, inp);
  const okAmp = f.iz >= iDesign - 1e-9;
  const okDu = f.duPct <= res.duLimitPct + 1e-9;
  const prot = protectionRatings(iDesign, f.iz);
  const showSc = !isDC && inputs.ikKa > 0 && inputs.tScS > 0;
  const usoLimite = Math.min(100, (f.duPct / res.duLimitPct) * 100);

  // Resumen en una frase
  const carga = isDC
    ? `${n(res.ib)} A de operación`
    : inputs.loadMode === "power"
      ? `${n(inputs.powerKw, 2)} kW`
      : `${n(inputs.current, 2)} A`;
  const resumen = `Para alimentar ${carga}${isDC ? "" : ` a ${n(inputs.voltage, 0)} V`} con un cable de ${n(inputs.lengthM, 0)} m, se recomienda <b>${esc(
    r.cableLabel,
  )}</b>. El cable soporta <b>${n(f.iz)} A</b> (el circuito necesita ${n(iDesign)} A) y pierde <b>${n(f.duPct, 2)} %</b> de tensión (máximo permitido: ${n(res.duLimitPct, 1)} %).`;

  const chips = [
    [okAmp, "El cable soporta la corriente"],
    [okDu, "La pérdida de tensión está dentro del límite"],
    ...(isDC ? [] : ([[prot.ok, "Existe un interruptor adecuado"]] as [boolean, string][])),
    ...(showSc ? ([[true, "Resiste el cortocircuito indicado"]] as [boolean, string][]) : []),
  ]
    .map(([ok, t]) => `<span class="chip ${ok ? "ok" : "no"}"><b>${ok ? "✓" : "✗"}</b> ${esc(t)}</span>`)
    .join("");

  // Datos del proyecto en 3 tarjetas
  const grupos = datosEntrada(res, inp);
  const card = (titulo: string, nombres: string[]) => {
    const filas = grupos
      .filter(([t]) => nombres.includes(t))
      .flatMap(([, x]) => x)
      .map(([l, v]) => `<div class="c"><span class="l">${esc(sl(l))}</span><span class="v">${escf(v)}</span></div>`)
      .join("");
    return `<div class="card"><div class="card-t">${esc(titulo)}</div>${filas}</div>`;
  };
  const tarjetas = isDC
    ? card("Los paneles", ["Sistema", "Datos del string"]) + card("El tramo", ["Tramo y condiciones"])
    : card("Qué se alimenta", ["Sistema", "Carga"]) + card("Cómo se instala", ["Canalización"]) + card("Condiciones del lugar", ["Condiciones de instalación", "Cortocircuito"]);

  // Pasos explicados
  const fuenteTxt = (src: StepSource) =>
    src.src ? `${esc(src.src.doc)} — <i>${esc(src.src.file)}</i>, pág. <b>${esc(src.src.page)}</b>` : esc(src.text);
  const pasos = steps
    .map((s) => {
      const ex = explicacion(claveDe(s.title), r, res, inp);
      const tabla = s.table
        ? `<table class="tp"><thead><tr>${s.table.head.map((h) => `<th>${escf(h)}</th>`).join("")}</tr></thead><tbody>${s.table.rows
            .slice(-3)
            .map((row) => `<tr class="${row.ok ? "ok" : "no"}">${row.cells.map((c) => `<td>${escf(c)}</td>`).join("")}</tr>`)
            .join("")}</tbody></table>`
        : "";
      return `
      <div class="paso">
        <div class="p-h"><span class="p-t"><span class="nn">${s.num}</span>${esc(ex.pregunta)}</span><span class="p-r">${escf(s.result)}</span></div>
        <p class="ex">${escf(ex.texto)}</p>
        ${s.formulas.length ? `<div class="cuenta"><span class="cl">La cuenta</span><div class="fxs">${s.formulas.map((x) => `<div class="fx">${escf(x)}</div>`).join("")}</div></div>` : ""}
        ${tabla}
        ${s.sources.length ? `<div class="src">▤ ${s.sources.map((src) => `<b>${escf(src.label)}:</b> ${fuenteTxt(src)}`).join(" &nbsp;·&nbsp; ")}</div>` : ""}
      </div>`;
    })
    .join("");

  const specs = r.protection
    ? r.protection.specs
        .filter((sp) => PROT_LABEL[sp.label])
        .map((sp) => `<div class="c"><span class="l">${escf(PROT_LABEL[sp.label])}</span><span class="v">${escf(sp.value)}</span></div>`)
        .join("")
    : "";

  const alerts = [...res.globalAlerts, ...(r.alerts ?? [])];
  const obs = [...alerts.filter((a) => a.level !== "info"), ...alerts.filter((a) => a.level === "info").slice(0, 2)];
  const obsHtml =
    obs.length || r.dataNotes.length
      ? `<ul class="obs">${obs.map((a) => `<li class="${a.level}">${escf(a.message)}</li>`).join("")}${
          r.dataNotes.length ? `<li class="warning">${escf(r.dataNotes.join(" "))}</li>` : ""
        }</ul>`
      : "";

  const glosario: [string, string][] = [
    ["Sección (mm²)", "El grosor del conductor del cable. A mayor sección, más corriente soporta y menos tensión se pierde."],
    ["Corriente admisible (I_z)", "La máxima corriente que el cable soporta de forma continua sin recalentarse."],
    ["Caída de tensión", "La tensión que se pierde en el recorrido del cable. Se expresa en % de la tensión de la red."],
    ["Factor de potencia (cos φ)", "Indica qué parte de la corriente se aprovecha realmente en la carga."],
    ["Interruptor termomagnético", "Protección que corta el circuito ante una sobrecarga o un cortocircuito."],
    ["Cortocircuito", "Falla que genera una corriente muy alta por un instante y calienta el cable."],
  ];

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Informe de cable${datos.proyecto ? " - " + esc(datos.proyecto) : ""}</title>
  <style>
    * { box-sizing: border-box; }
    html { background: #fff; }
    body { margin: 0; width: 794px; padding: 30px; background: #fff; font-family: Inter, "Segoe UI", Arial, sans-serif; color: #243238; font-size: 10px; line-height: 1.45; }
    b, strong { color: #173f44; }
    sub { font-size: .75em; line-height: 0; vertical-align: -0.25em; }
    .top { background: #173f44; color: #fff; border-radius: 12px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; gap: 14px; }
    .brand { color: #9be21b; font-weight: 800; letter-spacing: .26em; font-size: 13px; margin-bottom: 5px; }
    .top h1 { margin: 0; font-size: 17px; font-weight: 750; line-height: 1.15; }
    .top .sub { color: #c5d6d8; font-size: 9.5px; margin-top: 3px; }
    .meta { text-align: right; color: #c5d6d8; font-size: 9.5px; line-height: 1.5; }
    .meta strong { display: block; color: #fff; font-size: 12px; }
    .hero { margin-top: 10px; border-radius: 12px; background: #f2f8e8; border: 1px solid #d7e9ba; padding: 14px 18px; display: flex; gap: 20px; align-items: center; }
    .hero-n { flex: none; min-width: 190px; }
    .hero-l { font-size: 8.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: #56706b; }
    .hero-v { font-size: 30px; font-weight: 800; color: #173f44; line-height: 1.1; margin: 2px 0; }
    .hero-s { font-size: 9.5px; color: #4d615f; }
    .hero-r { flex: 1; font-size: 11px; line-height: 1.55; color: #243238; border-left: 3px solid #9be21b; padding-left: 16px; }
    .hero-r b { color: #173f44; }
    .chips { margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { display: inline-block; border-radius: 12px; padding: 3px 10px; font-size: 9.2px; font-weight: 600; }
    .chip.ok { background: #e4f4d0; color: #2c5a12; } .chip.no { background: #fbe3e1; color: #8e2a25; }
    .chip b { color: inherit; margin-right: 3px; }
    .sec { margin-top: 13px; }
    .sec-t { font-size: 10.5px; font-weight: 800; color: #173f44; margin-bottom: 6px; display: flex; align-items: center; gap: 7px; }
    .sec-t::before { content: ""; width: 7px; height: 7px; border-radius: 2px; background: #9be21b; }
    .sec-s { color: #647572; font-size: 9px; margin: -3px 0 6px 14px; }
    .cards { display: flex; gap: 8px; }
    .card { flex: 1; border: 1px solid #dfe8e7; border-radius: 10px; padding: 7px 11px; background: #fcfdfd; }
    .card-t { font-size: 8.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #78b409; margin-bottom: 3px; }
    .c { display: flex; justify-content: space-between; gap: 8px; padding: 2.5px 0; border-bottom: 1px solid #f0f4f3; font-size: 9px; }
    .c:last-child { border-bottom: none; }
    .l { color: #6a7b78; } .v { font-weight: 700; color: #173f44; text-align: right; }
    .grafs { display: flex; gap: 10px; }
    .graf { flex: 1; border: 1px solid #dfe8e7; border-radius: 12px; padding: 10px 13px 9px; }
    .graf-t { font-size: 11px; font-weight: 800; color: #173f44; }
    .graf-s { font-size: 8.6px; color: #647572; margin: 1px 0 7px; line-height: 1.35; }
    .area { position: relative; padding-top: 14px; }
    .marca { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1.5px dashed #d9534f; z-index: 2; }
    .marca span { position: absolute; top: -1px; left: 4px; white-space: nowrap; font-size: 8px; font-weight: 800; color: #b0302c; background: #fff; padding: 0 2px; }
    .br { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
    .br-l { width: 44px; font-size: 9px; color: #4d615f; text-align: right; flex: none; }
    .br.dest .br-l { font-weight: 800; color: #173f44; }
    .br-t { flex: 1; height: 15px; background: #f1f5f4; border-radius: 4px; position: relative; }
    .br-b { height: 100%; border-radius: 4px; }
    .br-v { width: 42px; flex: none; font-size: 9px; font-weight: 700; color: #173f44; }
    .graf-p { margin-top: 5px; font-size: 8.4px; color: #647572; line-height: 1.35; }
    .medidor { margin-top: 8px; }
    .corte { height: 0; }
    .paso { border: 1px solid #dfe8e7; border-radius: 10px; padding: 6px 12px 6px; margin-bottom: 5px; background: #fff; }
    .p-h { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .p-t { font-weight: 800; color: #173f44; font-size: 10.6px; line-height: 1.5; }
    .nn { color: #78b409; font-weight: 800; margin-right: 6px; font-size: 12px; }
    .p-r { font-weight: 800; color: #173f44; font-size: 10px; line-height: 1.5; text-align: right; flex: none; max-width: 52%; }
    .ex { margin: 1px 0 3px; color: #4d615f; font-size: 9.6px; line-height: 1.42; }
    .cuenta { display: flex; gap: 6px; align-items: flex-start; }
    .cl { flex: none; width: 52px; font-size: 7.6px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: #8a9a97; padding-top: 4px; }
    .fxs { flex: 1; min-width: 0; }
    .fx { background: #f3f7f6; border-radius: 5px; padding: 2px 8px; font-family: Consolas, "Courier New", monospace; font-size: 8.5px; color: #243238; margin-bottom: 2px; overflow-wrap: anywhere; }
    .src { margin-top: 2px; font-size: 7.7px; color: #75857f; line-height: 1.4; }
    .tp { width: 100%; border-collapse: collapse; margin-top: 3px; font-size: 8.4px; }
    .tp th { text-align: left; font-size: 7.4px; text-transform: uppercase; color: #72817e; padding: 2px 5px; border-bottom: 1px solid #dfe8e7; }
    .tp td { padding: 2px 5px; border-top: 1px solid #eef3f2; }
    .tp tr.ok td:last-child { color: #2f7d1f; font-weight: 700; } .tp tr.no td:last-child { color: #b0302c; }
    .prot { border: 1px solid #dfe8e7; border-radius: 10px; padding: 7px 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 0 22px; }
    .obs { list-style: none; margin: 0; padding: 0; }
    .obs li { margin-bottom: 4px; padding: 4px 10px; border-radius: 7px; border: 1px solid #dfe8e7; background: #f6f9f9; font-size: 8.8px; }
    .obs li.warning { background: #fff8e6; border-color: #f0dca0; } .obs li.error { background: #fdeeee; border-color: #efbcbc; }
    .gl { display: grid; grid-template-columns: 1fr 1fr; gap: 3px 22px; font-size: 8.4px; color: #596b68; }
    .gl b { color: #173f44; }
    .aviso { margin-top: 10px; border-left: 3px solid #9be21b; background: #f7f9f9; padding: 7px 12px; font-size: 8.4px; color: #596b68; line-height: 1.5; }
    .pie { margin-top: 8px; padding-top: 6px; border-top: 1px solid #dfe8e7; display: flex; justify-content: space-between; font-size: 7.8px; color: #70807d; }
    .pie .marca-e { color: #78b409; font-weight: 800; letter-spacing: .1em; }
  </style>
</head>
<body>
  <header class="top">
    <div>
      <div class="brand">ECOVATIO</div>
      <h1>Informe de dimensionamiento de cable</h1>
      <div class="sub">Qué cable usar, por qué y cómo se calculó</div>
    </div>
    <div class="meta">
      <strong>${esc(datos.proyecto || "Circuito sin identificar")}</strong>
      ${datos.elaboro ? `Elaboró: ${esc(datos.elaboro)}<br />` : ""}Fecha: ${fecha}
    </div>
  </header>

  <section class="hero">
    <div class="hero-n">
      <div class="hero-l">Cable recomendado</div>
      <div class="hero-v">${par > 1 ? `${par} × ` : ""}${mm(f.section)}</div>
      <div class="hero-s">${esc(r.insulation)}<br />${esc(r.norma)}</div>
    </div>
    <div class="hero-r">${resumen}</div>
  </section>
  <div class="chips">${chips}</div>

  <section class="sec">
    <div class="sec-t">Datos del proyecto</div>
    <div class="cards">${tarjetas}</div>
  </section>

  <section class="sec">
    <div class="sec-t">Los resultados en gráficos</div>
    <div class="grafs">${graficoCorriente(r, iDesign)}${graficoTension(r, res.duLimitPct)}</div>
  </section>

  <section class="sec">
    <div class="sec-t">Protección recomendada</div>
    <div class="prot">${specs}</div>
  </section>

  <section class="sec">
    <div class="sec-t">Glosario</div>
    <div class="gl">${glosario.map(([t, d]) => `<div><b>${escf(t)}:</b> ${esc(d)}</div>`).join("")}</div>
  </section>

  <div class="aviso">
    <strong>Importante:</strong> este informe es un predimensionamiento. Verifique el cálculo, compárelo con el datasheet del proveedor del cable y
    valídelo con un profesional habilitado antes de comprar o instalar. La sección mínima de la AEA 90364-7-771 y los factores de agrupamiento de
    cables enterrados son valores de referencia: confirmelos con la edición vigente del reglamento.
  </div>
  <div class="corte"></div>

  <section class="sec" style="margin-top:0">
    <div class="sec-t">Cómo se llegó a este resultado <span style="font-weight:500;color:#647572;font-size:8.6px">· paso a paso, con la cuenta y el catálogo (archivo y página) de donde sale cada dato</span></div>
    ${pasos}
  </section>

  ${obsHtml ? `<section class="sec"><div class="sec-t">A tener en cuenta</div>${obsHtml}</section>` : ""}

  <footer class="pie">
    <div>Uso interno · Documento generado desde el Panel de Obras Solares</div>
    <div class="marca-e">ECOVATIO</div>
  </footer>
</body>
</html>`;
}
