// Informe PDF del dimensionamiento de conductores: documento técnico A4 de hasta 2 páginas, con texto
// vectorial (nítido y seleccionable), gráficos y la memoria de cálculo con sus fuentes.
// Las librerías y las fuentes se cargan recién al tocar el botón de descarga.
import { protectionRatings } from "../engine/calc";
import { kFactor } from "../data/protections";
import type { CalcInputs, CalcResult } from "../engine/types";
import { buildSteps, mm, n, type StepSource } from "./steps";
import { PROT_LABEL, claveDe, datosPartida, explicacion } from "./contenido";
import regularUrl from "../../assets/fonts/Roboto-Regular.ttf?url";
import boldUrl from "../../assets/fonts/Roboto-Bold.ttf?url";
import monoUrl from "../../assets/fonts/RobotoMono-Regular.ttf?url";

export interface DatosInforme {
  proyecto: string;
  elaboro: string;
}

type RGB = [number, number, number];
const TEAL: RGB = [23, 63, 68];
const GREEN: RGB = [120, 180, 9];
const INK: RGB = [36, 50, 56];
const GRAY: RGB = [92, 110, 107];
const LGRAY: RGB = [138, 154, 151];
const LINE: RGB = [221, 230, 229];
const PANEL: RGB = [245, 248, 247];
const LGREEN: RGB = [242, 248, 232];
const OKBG: RGB = [228, 244, 208];
const OKTX: RGB = [44, 90, 18];
const NOBG: RGB = [251, 227, 225];
const NOTX: RGB = [142, 42, 37];
const RED: RGB = [208, 63, 58];
const BARRA_OK: RGB = [190, 224, 138];
const BARRA_NO: RGB = [230, 161, 156];
const WHITE: RGB = [255, 255, 255];

const W = 210;
const H = 297;
const ML = 16;
const CW = W - 2 * ML;
const BOTTOM = H - 21.5;
const PT = 0.3528; // mm por punto

// ---------------------------------------------------------------------------------------------
// Recursos (fuentes y logo)
// ---------------------------------------------------------------------------------------------

let fuentesCache: { r: string; b: string; m: string } | null = null;

async function aBase64(url: string): Promise<string> {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function cargarFuentes() {
  if (!fuentesCache) {
    const [r, b, m] = await Promise.all([aBase64(regularUrl), aBase64(boldUrl), aBase64(monoUrl)]);
    fuentesCache = { r, b, m };
  }
  return fuentesCache;
}

interface Logo {
  data: string;
  w: number;
  h: number;
}

async function cargarLogo(): Promise<Logo | null> {
  try {
    const blob = await (await fetch("/logo-ecovatio.png")).blob();
    const data: string = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(blob);
    });
    const dim: { w: number; h: number } = await new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = rej;
      im.src = data;
    });
    return { data, ...dim };
  } catch {
    return null;
  }
}

const slug = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);

// ---------------------------------------------------------------------------------------------
// Construcción del documento
// ---------------------------------------------------------------------------------------------

type JsPDFCtor = typeof import("jspdf").jsPDF;
type Doc = InstanceType<JsPDFCtor>;
type Estilo = "normal" | "bold" | "mono";

const SUB_RE = /(?<![A-Za-z0-9])([IfVURXSPk])_([A-Za-z0-9ñ]+)/g;

function partes(s0: string): { t: string; sub: boolean }[] {
  const s = s0.replace(/\s*[✓✗]/g, "");
  const out: { t: string; sub: boolean }[] = [];
  let last = 0;
  for (const m of s.matchAll(SUB_RE)) {
    out.push({ t: s.slice(last, m.index) + m[1], sub: false }, { t: m[2], sub: true });
    last = (m.index ?? 0) + m[0].length;
  }
  out.push({ t: s.slice(last), sub: false });
  return out.filter((p) => p.t);
}

function construir(
  JsPDF: JsPDFCtor,
  fuentes: { r: string; b: string; m: string },
  logo: Logo | null,
  res: CalcResult,
  inputs: CalcInputs,
  datos: DatosInforme,
  k: number,
): Doc {
  const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  doc.addFileToVFS("Roboto-Regular.ttf", fuentes.r);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.addFileToVFS("Roboto-Bold.ttf", fuentes.b);
  doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
  doc.addFileToVFS("RobotoMono-Regular.ttf", fuentes.m);
  doc.addFont("RobotoMono-Regular.ttf", "RobotoMono", "normal");
  doc.setProperties({
    title: `Dimensionamiento de conductores${datos.proyecto ? " - " + datos.proyecto : ""}`,
    author: datos.elaboro || "Ecovatio",
    creator: "Panel de Obras Solares · Ecovatio",
  });

  const r = res.shown!;
  const f = r.final!;
  const isDC = inputs.side === "DC";
  const par = Math.max(1, res.parallel);
  const inp = { ...inputs, parallel: res.parallel };
  const iDesign = res.iRequired;
  const okAmp = f.iz >= iDesign - 1e-9;
  const okDu = f.duPct <= res.duLimitPct + 1e-9;
  const prot = protectionRatings(iDesign, f.iz);
  const showSc = !isDC && inputs.ikKa > 0 && inputs.tScS > 0;
  const insul: "PVC" | "XLPE" = r.familyId === "pvc" ? "PVC" : "XLPE";
  const now = new Date();
  const fecha = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(now);
  const p2 = (v: number) => String(v).padStart(2, "0");
  const nroInforme = `INF-CAB-${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;

  // ---- utilidades de texto -------------------------------------------------------------------
  const setF = (st: Estilo, size: number, color: RGB) => {
    if (st === "mono") doc.setFont("RobotoMono", "normal");
    else doc.setFont("Roboto", st === "bold" ? "bold" : "normal");
    doc.setFontSize(size * k);
    doc.setTextColor(color[0], color[1], color[2]);
  };
  const lh = (size: number, f = 1.42) => size * k * PT * f;

  const wRich = (s: string, size: number, st: Estilo) =>
    partes(s).reduce((acc, p) => {
      setF(st, p.sub ? size * 0.68 : size, INK);
      return acc + doc.getTextWidth(p.t);
    }, 0);

  const drawRich = (s: string, x: number, y: number, size: number, st: Estilo, color: RGB, align: "left" | "right" | "center" = "left") => {
    const total = wRich(s, size, st);
    let cx = align === "right" ? x - total : align === "center" ? x - total / 2 : x;
    for (const p of partes(s)) {
      const sz = p.sub ? size * 0.68 : size;
      setF(st, sz, color);
      doc.text(p.t, cx, y + (p.sub ? size * k * PT * 0.24 : 0));
      cx += doc.getTextWidth(p.t);
    }
  };

  const wrap = (s: string, maxW: number, size: number, st: Estilo): string[] => {
    const lines: string[] = [];
    let cur = "";
    setF(st, size, INK);
    const sp = doc.getTextWidth(" ");
    for (const word of s.split(" ")) {
      const cand = cur ? cur + " " + word : word;
      if (cur && wRich(cand, size, st) > maxW + sp * 0.01) {
        lines.push(cur);
        cur = word;
      } else cur = cand;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const rect = (x: number, y: number, w: number, h: number, fill: RGB, radius = 0, stroke?: RGB) => {
    doc.setFillColor(...fill);
    if (stroke) {
      doc.setDrawColor(...stroke);
      doc.setLineWidth(0.25);
    }
    const style = stroke ? "FD" : "F";
    if (radius) doc.roundedRect(x, y, w, h, radius, radius, style);
    else doc.rect(x, y, w, h, style);
  };
  const hline = (x1: number, x2: number, y: number, color: RGB = LINE, w = 0.2) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(w);
    doc.line(x1, y, x2, y);
  };

  const tick = (x: number, y: number, s: number, color: RGB) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.55);
    doc.line(x, y - s * 0.35, x + s * 0.38, y);
    doc.line(x + s * 0.38, y, x + s, y - s * 0.95);
  };
  const cross = (x: number, y: number, s: number, color: RGB) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.55);
    doc.line(x, y - s, x + s, y);
    doc.line(x, y, x + s, y - s);
  };
  const pill = (x: number, y: number, w: number, ok: boolean, texto: string) => {
    rect(x, y, w, 5.2, ok ? OKBG : NOBG, 2.6);
    const col = ok ? OKTX : NOTX;
    setF("bold", 7, col);
    const tw = doc.getTextWidth(texto);
    const gx = x + (w - tw - 3.6) / 2;
    (ok ? tick : cross)(gx, y + 3.9, 2.2, col);
    doc.text(texto, gx + 3.6, y + 3.65);
  };

  // ---- paginación ------------------------------------------------------------------------------
  let y = 0;
  const cabeceraInterna = () => {
    drawRich("ECOVATIO", ML, 11, 8.5, "bold", GREEN);
    drawRich(`Dimensionamiento de conductores · ${datos.proyecto || "Circuito sin identificar"}`, W - ML, 11, 7.8, "normal", LGRAY, "right");
    hline(ML, W - ML, 13.5, LINE, 0.25);
    y = 21;
  };
  const asegurar = (alto: number) => {
    if (y + alto > BOTTOM) {
      doc.addPage();
      cabeceraInterna();
    }
  };

  const titulo = (num: string, texto: string) => {
    asegurar(14);
    rect(ML, y - 3.1, 2.4, 2.4, GREEN, 0.5);
    drawRich(`${num}`, ML + 4, y, 10.5, "bold", GREEN);
    drawRich(texto, ML + 9.2, y, 11, "bold", TEAL);
    hline(ML, W - ML, y + 2.2, LINE, 0.25);
    y += 6.6;
  };

  // ---- portada / cabecera ------------------------------------------------------------------------
  rect(0, 0, W, 30, TEAL);
  if (logo) {
    const lw = 42;
    doc.addImage(logo.data, "PNG", ML, 7, lw, (lw * logo.h) / logo.w);
  } else {
    drawRich("ECOVATIO", ML, 14, 14, "bold", [155, 226, 27]);
  }
  drawRich("Dimensionamiento de conductores", ML, 21.5, 17, "bold", WHITE);
  drawRich(isDC ? "Instalación fotovoltaica · corriente continua" : "Baja tensión · corriente alterna", ML, 26.6, 8.4, "normal", [197, 214, 216]);
  drawRich(datos.proyecto || "Circuito sin identificar", W - ML, 12, 11, "bold", WHITE, "right");
  drawRich(datos.elaboro ? `Elaboró: ${datos.elaboro}` : "Elaboró: —", W - ML, 17, 8.6, "normal", [197, 214, 216], "right");
  drawRich(`Fecha: ${fecha}`, W - ML, 21.6, 8.6, "normal", [197, 214, 216], "right");
  drawRich(`Informe ${nroInforme} · Rev. 0`, W - ML, 26.2, 7.4, "normal", [150, 176, 179], "right");
  y = 38;

  // ---- 1 · Resultado ---------------------------------------------------------------------------
  titulo("1", "Resultado");
  const carga = isDC ? `${n(res.ib)} A de operación` : inputs.loadMode === "power" ? `${n(inputs.powerKw, 2)} kW` : `${n(inputs.current, 2)} A`;
  const frase1 = `Para alimentar ${carga}${isDC ? "" : ` a ${n(inputs.voltage, 0)} V`} con un cable de ${n(inputs.lengthM, 0)} m de longitud, se recomienda ${r.cableLabel}.`;
  const frase2 = `El cable soporta ${n(f.iz)} A (el circuito necesita ${n(iDesign)} A) y pierde ${n(f.duPct, 2)} % de la tensión (máximo permitido: ${n(res.duLimitPct, 1)} %).`;
  const colDer = wrap(frase1, 84, 9.6, "normal").concat([""], wrap(frase2, 84, 9.6, "normal"));
  const labelLines = wrap(r.cableLabel, 74, 8.6, "normal");
  const aisl = wrap(`${r.insulation} · ${r.norma}`, 74, 7.8, "normal");
  const altoIzq = 9.5 + lh(27, 1.0) + 2 + labelLines.length * lh(8.6) + 1 + aisl.length * lh(7.8) + 4;
  const altoCard = Math.max(30, altoIzq - 3, 9 + colDer.length * lh(9.6, 1.38) + 5);
  asegurar(altoCard + 4);
  rect(ML, y, CW, altoCard, LGREEN, 2.5, [205, 228, 165]);
  rect(ML, y, 2.6, altoCard, GREEN, 1.2);
  drawRich("CABLE RECOMENDADO", ML + 8, y + 7, 7.4, "bold", GRAY);
  drawRich(`${par > 1 ? `${par} × ` : ""}${mm(f.section)}`, ML + 8, y + 7 + 2 + lh(27, 1.0) * 0.98, 27, "bold", TEAL);
  let yy = y + 9.5 + lh(27, 1.0) + 2.6;
  for (const l of labelLines) {
    drawRich(l, ML + 8, yy, 8.6, "normal", INK);
    yy += lh(8.6);
  }
  yy += 0.8;
  for (const l of aisl) {
    drawRich(l, ML + 8, yy, 7.8, "normal", GRAY);
    yy += lh(7.8);
  }
  doc.setDrawColor(...[205, 228, 165]);
  doc.setLineWidth(0.3);
  doc.line(ML + 89, y + 6, ML + 89, y + altoCard - 6);
  drawRich("EN RESUMEN", ML + 94, y + 7, 7.4, "bold", GRAY);
  let yc = y + 13.2;
  for (const l of colDer) {
    if (l) drawRich(l, ML + 94, yc, 9.6, "normal", INK);
    yc += l ? lh(9.6, 1.38) : lh(9.6, 1.38) * 0.45;
  }
  y += altoCard + 6.2;

  // ---- 2 · Verificaciones ------------------------------------------------------------------------
  titulo("2", "Verificaciones");
  type FilaV = { crit: string; sub: string; req: string; obt: string; ok: boolean };
  const sMinSc = showSc ? (inputs.ikKa * 1000 * Math.sqrt(inputs.tScS)) / kFactor(inputs.material, insul) : 0;
  const filasV: FilaV[] = [
    { crit: "Capacidad de corriente", sub: "El cable aguanta la corriente del circuito", req: `≥ ${n(iDesign)} A`, obt: `${n(f.iz)} A`, ok: okAmp },
    { crit: "Caída de tensión", sub: "Tensión que se pierde en el recorrido", req: `≤ ${n(res.duLimitPct, 1)} %`, obt: `${n(f.duPct, 2)} %`, ok: okDu },
    { crit: "Sección mínima reglamentaria", sub: "Según el uso del circuito (AEA 90364-7-771)", req: `≥ ${mm(res.sMin)}`, obt: mm(f.section), ok: f.section >= res.sMin - 1e-9 },
  ];
  if (showSc)
    filasV.push({ crit: "Cortocircuito", sub: "Resistencia al calentamiento hasta que actúe la protección", req: `≥ ${n(sMinSc, 1)} mm²`, obt: mm(f.section * par), ok: f.section * par >= sMinSc - 1e-9 });
  if (!isDC)
    filasV.push({
      crit: "Protección",
      sub: "Interruptor termomagnético comercial disponible",
      req: `I_n entre ${n(iDesign)} y ${n(f.iz)} A`,
      obt: prot.ratings.length ? `${prot.ratings.join(" · ")} A` : prot.adjustable ? "Regulable" : "—",
      ok: prot.ok,
    });
  asegurar(8 + filasV.length * 7.9);
  rect(ML, y, CW, 6.6, PANEL, 1.2);
  const cx = { c: ML + 3.5, rq: ML + 92, ob: ML + 126, es: ML + CW - 3 };
  drawRich("CRITERIO", cx.c, y + 4.4, 7, "bold", GRAY);
  drawRich("REQUERIDO", cx.rq, y + 4.4, 7, "bold", GRAY);
  drawRich("OBTENIDO", cx.ob, y + 4.4, 7, "bold", GRAY);
  drawRich("ESTADO", cx.es, y + 4.4, 7, "bold", GRAY, "right");
  y += 6.6;
  filasV.forEach((v, i) => {
    drawRich(v.crit, cx.c, y + 3.7, 9, "bold", INK);
    drawRich(v.sub, cx.c, y + 6.6, 7.2, "normal", LGRAY);
    drawRich(v.req, cx.rq, y + 5, 9, "normal", INK);
    const obtLines = wrap(v.obt, 34, 9, "bold");
    obtLines.slice(0, 2).forEach((l, j) => drawRich(l, cx.ob, y + 4 + j * 3.3, obtLines.length > 1 ? 8 : 9, "bold", TEAL));
    pill(cx.es - 26, y + 1.35, 26, v.ok, v.ok ? "CUMPLE" : "NO CUMPLE");
    y += 7.9;
    hline(ML, W - ML, y, i === filasV.length - 1 ? [190, 205, 203] : LINE, i === filasV.length - 1 ? 0.35 : 0.2);
  });
  y += 6.2;

  // ---- 3 · Datos de partida ----------------------------------------------------------------------
  titulo("3", "Datos de partida");
  const dp = datosPartida(res, inp);
  const colW = (CW - 9) / 2;
  const filaKV = (x: number, w: number, etiqueta: string, valor: string): number => {
    const wl = wRich(etiqueta, 8.2, "normal");
    const wv = wRich(valor, 8.4, "bold");
    if (wl + wv + 4 <= w) {
      drawRich(etiqueta, x, y + 3.6, 8.2, "normal", GRAY);
      drawRich(valor, x + w, y + 3.6, 8.4, "bold", INK, "right");
      return 4.6;
    }
    drawRich(etiqueta, x, y + 3.6, 8.2, "normal", GRAY);
    const ls = wrap(valor, w, 8.4, "bold");
    ls.forEach((l, i) => drawRich(l, x + w, y + 7.6 + i * 3.8, 8.4, "bold", INK, "right"));
    return 4.2 + ls.length * 3.8 + 1.2;
  };
  const alturaGrupo = (g: { filas: [string, string][] }, w: number) =>
    7 +
    g.filas.reduce((acc, [e, v]) => acc + (wRich(e, 8.2, "normal") + wRich(v, 8.4, "bold") + 4 <= w ? 4.6 : 4.2 + wrap(v, w, 8.4, "bold").length * 3.8 + 1.2), 0);
  const altoDatos = Math.max(alturaGrupo(dp.a, colW), alturaGrupo(dp.b, colW));
  asegurar(altoDatos + 22);
  const yIni = y;
  [dp.a, dp.b].forEach((g, idx) => {
    const x = ML + idx * (colW + 9);
    y = yIni;
    drawRich(g.titulo.toUpperCase(), x, y + 3, 7.6, "bold", GREEN);
    hline(x, x + colW, y + 4.6, LINE, 0.25);
    y += 7;
    for (const [e, v] of g.filas) {
      const dh = filaKV(x, colW, e, v);
      y += dh;
      hline(x, x + colW, y - 0.5, [238, 243, 242], 0.15);
    }
  });
  y = yIni + altoDatos + 2;
  // franja de condiciones
  rect(ML, y, CW, 13, PANEL, 2);
  const cwf = CW / 4;
  dp.franja.forEach(([e, v], i) => {
    const x = ML + i * cwf + 4;
    drawRich(e.toUpperCase(), x, y + 4.6, 6.6, "bold", GRAY);
    let size = 8.8;
    while (wRich(v, size, "bold") > cwf - 7 && size > 6.8) size -= 0.3;
    drawRich(v, x, y + 9.6, size, "bold", INK);
    if (i) hline(ML + i * cwf, ML + i * cwf, y + 3, LINE);
  });
  y += 13 + 6.2;

  // ---- 4 · Gráficos ------------------------------------------------------------------------------
  titulo("4", "Resultados en gráficos");
  const filasG = r.curve.filter((c) => c.section <= f.section + 1e-9).slice(-4);
  const sig = r.curve.find((c) => c.section > f.section + 1e-9);
  if (sig) filasG.push(sig);

  const grafico = (
    x: number,
    w: number,
    h: number,
    tit: string,
    sub: string,
    items: { label: string; v: number; color: RGB; sel: boolean; txt: string }[],
    ref: { v: number; label: string },
    fmt: (v: number) => string,
  ) => {
    rect(x, y, w, h, WHITE, 2.5, LINE);
    drawRich(tit, x + 4, y + 6.5, 9.8, "bold", TEAL);
    wrap(sub, w - 8, 7.4, "normal").forEach((l, i) => drawRich(l, x + 4, y + 10.4 + i * 3.1, 7.4, "normal", GRAY));
    const px = x + 13;
    const py = y + 19.5;
    const pw = w - 13 - 5;
    const ph = h - 19.5 - 9;
    const maxV = Math.max(...items.map((it) => it.v), ref.v) * 1.18;
    const yOf = (v: number) => py + ph - (v / maxV) * ph;
    // cuadrícula y eje
    [0, 0.5, 1].forEach((t) => {
      const yv = py + ph - t * ph;
      hline(px, px + pw, yv, t === 0 ? [170, 188, 186] : [236, 241, 240], t === 0 ? 0.35 : 0.2);
      drawRich(fmt(maxV * t), px - 1.8, yv + 1, 6.6, "normal", LGRAY, "right");
    });
    const slot = pw / items.length;
    const bw = Math.min(14, slot * 0.52);
    items.forEach((it, i) => {
      const bx = px + i * slot + (slot - bw) / 2;
      const by = yOf(it.v);
      rect(bx, by, bw, py + ph - by, it.color, 0.8);
      drawRich(it.txt, bx + bw / 2, by - 1.3, 7.6, "bold", INK, "center");
      drawRich(it.label, bx + bw / 2, py + ph + 4.6, 7.6, it.sel ? "bold" : "normal", it.sel ? TEAL : GRAY, "center");
    });
    // referencia
    const yr = yOf(ref.v);
    doc.setDrawColor(...RED);
    doc.setLineWidth(0.4);
    doc.setLineDashPattern([1.4, 1], 0);
    doc.line(px, yr, px + pw, yr);
    doc.setLineDashPattern([], 0);
    const tw = wRich(ref.label, 7, "bold") + 2;
    rect(px + pw - tw, yr - 4.6, tw, 3.8, WHITE);
    drawRich(ref.label, px + pw - 1, yr - 1.8, 7, "bold", RED, "right");
  };
  const hG = 52;
  asegurar(hG + 11);
  const gw = (CW - 6) / 2;
  grafico(
    ML,
    gw,
    hG,
    "¿Aguanta la corriente?",
    "Cuánta corriente soporta cada sección, comparada con la que necesita el circuito.",
    filasG.map((c) => ({
      label: mm(c.section),
      v: c.iz,
      sel: c.section === f.section,
      color: c.section === f.section ? GREEN : c.iz >= iDesign - 1e-9 ? BARRA_OK : BARRA_NO,
      txt: `${n(c.iz, 0)} A`,
    })),
    { v: iDesign, label: `Necesita ${n(iDesign)} A` },
    (v) => n(v, 0),
  );
  grafico(
    ML + gw + 6,
    gw,
    hG,
    "¿Se pierde mucha tensión?",
    "Tensión que se pierde con cada sección, comparada con el máximo permitido.",
    filasG.map((c) => ({
      label: mm(c.section),
      v: c.duPct,
      sel: c.section === f.section,
      color: c.section === f.section ? GREEN : c.duPct <= res.duLimitPct + 1e-9 ? BARRA_OK : BARRA_NO,
      txt: `${n(c.duPct, 2)} %`,
    })),
    { v: res.duLimitPct, label: `Máximo ${n(res.duLimitPct, 1)} %` },
    (v) => n(v, v < 10 ? 1 : 0),
  );
  y += hG + 4;
  // leyenda
  let lx = ML;
  const leyenda: [RGB, string][] = [
    [GREEN, "Sección elegida"],
    [BARRA_OK, "Cumple"],
    [BARRA_NO, "No cumple"],
  ];
  for (const [c, t] of leyenda) {
    rect(lx, y - 2.4, 3, 3, c, 0.6);
    drawRich(t, lx + 4.4, y, 7.6, "normal", GRAY);
    lx += 4.4 + wRich(t, 7.6, "normal") + 7;
  }
  drawRich("Línea roja punteada: valor requerido o máximo permitido.", W - ML, y, 7.6, "normal", GRAY, "right");
  y += 7;

  // ---- 5 · Cálculo ---------------------------------------------------------------------------------
  if (doc.getNumberOfPages() === 1) {
    doc.addPage();
    cabeceraInterna();
  }
  titulo("5", "Cómo se llegó al resultado");
  const steps = buildSteps(r, res, inp);
  const fuenteTxt = (s: StepSource) => `${s.label}: ${s.src ? `${s.src.doc} — ${s.src.file}, pág. ${s.src.page}${s.src.note ? ` (${s.src.note})` : ""}` : s.text}`;
  for (const s of steps) {
    const ex = explicacion(claveDe(s.title), res, inp);
    const xC = ML + 8;
    const wC = CW - 8;
    const exL = wrap(ex.texto, wC, 8.4, "normal");
    const fL = s.formulas.map((fx) => wrap(fx, wC - 5, 7.7, "mono"));
    const corto = s.result.split(" · ")[0].replace(/\s*\([^)]*\)/g, "").replace("límite ", "").replace(/\s*[✓✗]/g, "").trim();
    const enTitulo = wRich(ex.pregunta, 10, "bold") + wRich(corto, 9, "bold") + 10 < wC;
    const resLines = enTitulo ? [] : wrap(corto, wC - 22, 9, "bold");
    const srcL = wrap(s.sources.map(fuenteTxt).join("   ·   "), wC, 6.8, "normal");
    const tRows = s.table ? s.table.rows.slice(-3) : [];
    const alto =
      6 +
      exL.length * lh(8.4, 1.34) +
      (fL.length ? 1.2 + fL.reduce((a, l) => a + l.length * lh(7.7, 1.33) + 1.4 + 0.7, 0) + 0.6 : 0) +
      (tRows.length ? 2 + (tRows.length + 1) * 4 : 0) +
      (resLines.length ? resLines.length * lh(9, 1.3) + 1.5 : 0) +
      srcL.length * lh(6.8, 1.3) +
      1.5 +
      4;
    asegurar(alto);
    drawRich(String(s.num), ML + 1, y + 4.2, 13, "bold", GREEN);
    drawRich(ex.pregunta, xC, y + 4.2, 10, "bold", TEAL);
    if (enTitulo) drawRich(corto, W - ML, y + 4.2, 9, "bold", GREEN, "right");
    y += 6;
    exL.forEach((l) => {
      drawRich(l, xC, y + 2.2, 8.4, "normal", GRAY);
      y += lh(8.4, 1.34);
    });
    if (fL.length) {
      y += 1.2;
      for (const lines of fL) {
        const hb = lines.length * lh(7.7, 1.33) + 1.4;
        rect(xC, y, wC, hb, PANEL, 1);
        lines.forEach((l, i) => drawRich(l, xC + 2.5, y + 3 + i * lh(7.7, 1.33), 7.7, "mono", INK));
        y += hb + 0.7;
      }
      y += 0.6;
    }
    if (tRows.length && s.table) {
      y += 1;
      const cols = [xC + 2, xC + 34, xC + 60, xC + 84];
      s.table.head.forEach((h, i) => drawRich(h.toUpperCase(), cols[i], y + 3, 6.6, "bold", LGRAY));
      hline(xC, xC + wC, y + 4, LINE, 0.2);
      y += 4;
      tRows.forEach((row) => {
        row.cells.forEach((c, i) => {
          const last = i === row.cells.length - 1;
          drawRich(c, cols[i], y + 3.2, 7.8, last || i === 0 ? "bold" : "normal", last ? (row.ok ? OKTX : NOTX) : INK);
        });
        y += 4;
      });
      y += 1;
    }
    if (resLines.length) {
      drawRich("RESULTADO", xC, y + 3.4, 6.8, "bold", LGRAY);
      resLines.forEach((l, i) => drawRich(l, xC + 21, y + 3.4 + i * lh(9, 1.3), 9, "bold", GREEN));
      y += resLines.length * lh(9, 1.3) + 1.5;
    }
    srcL.forEach((l) => {
      drawRich(l, xC, y + 2.1, 6.8, "normal", LGRAY);
      y += lh(6.8, 1.3);
    });
    y += 1.5;
    hline(ML, W - ML, y, LINE, 0.2);
    y += 2.5;
  }
  y += 3;

  // ---- 6 · Protección ----------------------------------------------------------------------------------
  if (r.protection) {
    const specs = r.protection.specs.filter((sp) => PROT_LABEL[sp.label]).map((sp): [string, string] => [PROT_LABEL[sp.label], sp.value]);
    const mitad = Math.ceil(specs.length / 2);
    const cols2 = [specs.slice(0, mitad), specs.slice(mitad)];
    const altoCol = (c: [string, string][]) =>
      c.reduce((a, [e, v]) => a + (wRich(e, 8.2, "normal") + wRich(v, 8.4, "bold") + 4 <= colW ? 4.6 : 4.2 + wrap(v, colW, 8.4, "bold").length * 3.8 + 1.2), 0);
    const alto = Math.max(altoCol(cols2[0]), altoCol(cols2[1]));
    asegurar(alto + 14);
    titulo("6", isDC ? "Protección" : "Protección recomendada");
    const yI = y;
    cols2.forEach((c, idx) => {
      y = yI;
      const x = ML + idx * (colW + 9);
      for (const [e, v] of c) {
        const dh = filaKV(x, colW, e, v);
        y += dh;
        hline(x, x + colW, y - 0.5, [238, 243, 242], 0.15);
      }
    });
    y = yI + alto + 5;
  }

  // ---- 7 · A tener en cuenta -------------------------------------------------------------------------------
  const alerts = [...res.globalAlerts, ...(r.alerts ?? [])];
  const obs: { nivel: string; texto: string }[] = [
    ...alerts.filter((a) => a.level !== "info").map((a) => ({ nivel: a.level, texto: a.message })),
    ...(r.dataNotes.length ? [{ nivel: "warning", texto: r.dataNotes.join(" ") }] : []),
    ...alerts.filter((a) => a.level === "info").slice(0, k < 1 ? 0 : 1).map((a) => ({ nivel: "info", texto: a.message })),
  ];
  if (obs.length) {
    asegurar(16);
    titulo("7", "A tener en cuenta");
    for (const o of obs) {
      const ls = wrap(o.texto, CW - 7, 8.2, "normal");
      asegurar(ls.length * lh(8.2, 1.35) + 3);
      rect(ML + 0.5, y - 0.3, 2.2, 2.2, o.nivel === "error" ? RED : o.nivel === "warning" ? [224, 168, 0] : LGRAY, 0.5);
      ls.forEach((l, i) => drawRich(l, ML + 6, y + 1.5 + i * lh(8.2, 1.35), 8.2, "normal", INK));
      y += ls.length * lh(8.2, 1.35) + 2.2;
    }
  }

  // ---- pie en todas las páginas ---------------------------------------------------------------------------
  const total = doc.getNumberOfPages();
  const aviso =
    "Resultado de predimensionamiento: verifique el cálculo con el datasheet del proveedor del cable y valídelo con un profesional habilitado antes de comprar o instalar. La sección mínima de la AEA 90364-7-771 y los factores de agrupamiento de cables enterrados son valores de referencia: confírmelos con la edición vigente del reglamento.";
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    hline(ML, W - ML, H - 20.5, LINE, 0.3);
    wrap(aviso, CW, 6.6, "normal").forEach((l, i) => drawRich(l, ML, H - 17.2 + i * 2.9, 6.6, "normal", LGRAY));
    drawRich("Ecovatio · Panel de Obras Solares · Uso interno", ML, H - 8.2, 7, "normal", LGRAY);
    drawRich(`Página ${p} de ${total}`, W - ML, H - 8.2, 7.4, "bold", GRAY, "right");
  }
  return doc;
}

export async function descargarInformePdf(res: CalcResult, inputs: CalcInputs, datos: DatosInforme): Promise<void> {
  const [{ jsPDF }, fuentes, logo] = await Promise.all([import("jspdf"), cargarFuentes(), cargarLogo()]);
  // Si con la tipografía normal el informe pasa de 2 páginas, se achica un poco el texto hasta que entre.
  let doc: Doc | null = null;
  for (const k of [1, 0.95, 0.9, 0.86, 0.82]) {
    doc = construir(jsPDF, fuentes, logo, res, inputs, datos, k);
    if (doc.getNumberOfPages() <= 2) break;
  }
  const d = new Date();
  const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const base = slug(datos.proyecto);
  doc!.save(`Dimensionamiento_conductores${base ? "_" + base : ""}_${f}.pdf`);
}
