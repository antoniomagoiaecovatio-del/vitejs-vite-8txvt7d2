// PDF del presupuesto: versión para el cliente (como la hoja "Presupuesto Cliente") y versión interna
// (como la hoja "Presupuesto Interno"). jsPDF y las fuentes se cargan recién al descargar.
import regularUrl from '../../cables/assets/fonts/Roboto-Regular.ttf?url'
import boldUrl from '../../cables/assets/fonts/Roboto-Bold.ttf?url'
import { etiquetas } from './etiquetas'
import { f0, f2, usd, fechaCorta, slug } from './formato'
import { num } from './calculo'

const n0 = (v) => num(v) ?? 0

// Paleta de marca Ecovatio
const PANEL = [29, 60, 68] // 1D3C44
const PANEL2 = [38, 71, 79] // 26474F
const LIME = [149, 222, 29] // 95DE1D
const VERDEFONDO = [242, 248, 232] // F2F8E8
const FILA = [248, 250, 249] // F8FAF9
const BORDE = [216, 225, 227] // D8E1E3
const TEXTO = [31, 48, 52] // 1F3034
const GRIS = [92, 111, 114]
const GRISCLARO = [138, 154, 157]
const SUBT = [185, 199, 201] // B9C7C9
const BLANCO = [255, 255, 255]
const AMBAR = [242, 169, 0]

const W = 210
const H = 297
const ML = 16
const CW = W - 2 * ML

let fuentesCache = null
async function aBase64(url) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer())
  let bin = ''
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(bin)
}
async function cargarFuentes() {
  if (!fuentesCache) {
    const [r, b] = await Promise.all([aBase64(regularUrl), aBase64(boldUrl)])
    fuentesCache = { r, b }
  }
  return fuentesCache
}
async function cargarLogo() {
  try {
    const blob = await (await fetch('/logo-ecovatio.png')).blob()
    const data = await new Promise((res, rej) => {
      const fr = new FileReader()
      fr.onload = () => res(String(fr.result))
      fr.onerror = rej
      fr.readAsDataURL(blob)
    })
    const dim = await new Promise((res, rej) => {
      const im = new Image()
      im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight })
      im.onerror = rej
      im.src = data
    })
    return { data, ...dim }
  } catch {
    return null
  }
}

function nuevoDoc(JsPDF, fuentes) {
  const doc = new JsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  doc.addFileToVFS('Roboto-Regular.ttf', fuentes.r)
  doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
  doc.addFileToVFS('Roboto-Bold.ttf', fuentes.b)
  doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')
  const font = (st, size, color) => {
    doc.setFont('Roboto', st === 'b' ? 'bold' : 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }
  const T = (s, x, y, size = 9, st = 'n', color = TEXTO, align = 'left') => {
    font(st, size, color)
    doc.text(String(s), x, y, { align })
  }
  const ancho = (s, size, st = 'n') => {
    font(st, size, TEXTO)
    return doc.getTextWidth(String(s))
  }
  const envolver = (s, maxW, size, st = 'n') => {
    const out = []
    String(s)
      .split('\n')
      .forEach((parr) => {
        let cur = ''
        parr.split(' ').forEach((p) => {
          const cand = cur ? `${cur} ${p}` : p
          if (cur && ancho(cand, size, st) > maxW) {
            out.push(cur)
            cur = p
          } else cur = cand
        })
        out.push(cur)
      })
    return out
  }
  const ajustado = (s, maxW, size, st = 'n') => {
    let sz = size
    while (sz > 5 && ancho(s, sz, st) > maxW) sz -= 0.25
    return sz
  }
  const rect = (x, y, w, h, fill, r = 0, stroke) => {
    doc.setFillColor(...fill)
    if (stroke) {
      doc.setDrawColor(...stroke)
      doc.setLineWidth(0.25)
    }
    const st = stroke ? 'FD' : 'F'
    if (r) doc.roundedRect(x, y, w, h, r, r, st)
    else doc.rect(x, y, w, h, st)
  }
  const linea = (x1, y1, x2, y2, color = BORDE, w = 0.2) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(w)
    doc.line(x1, y1, x2, y2)
  }
  return { doc, T, ancho, envolver, ajustado, rect, linea }
}

// Encabezado: panel teal con el logo y el título del documento
function encabezado(u, logo, titulo, subtitulo) {
  const { doc, T, rect } = u
  rect(0, 0, W, 42, PANEL)
  rect(0, 42, W, 1.6, LIME)
  if (logo) {
    const lw = 50
    doc.addImage(logo.data, 'PNG', ML, 21 - (lw * logo.h) / logo.w / 2, lw, (lw * logo.h) / logo.w)
  } else T('ECOVATIO', ML, 24, 20, 'b', LIME)
  T(titulo, W - ML, 20, 15.5, 'b', BLANCO, 'right')
  T(subtitulo, W - ML, 28, 10, 'n', LIME, 'right')
}

function pie(u, texto) {
  const { doc, T, linea } = u
  const n = doc.getNumberOfPages()
  for (let p = 1; p <= n; p++) {
    doc.setPage(p)
    linea(ML, H - 14, W - ML, H - 14, LIME, 0.5)
    T(texto, ML, H - 8.5, 8, 'n', GRIS)
    T(n > 1 ? `Página ${p} de ${n}` : 'ECOVATIO', W / 2, H - 8.5, 8, 'n', GRISCLARO, 'center')
    T('ECOVATIO', W - ML, H - 8.5, 8, 'b', [92, 150, 20], 'right')
  }
}

// Datos de cabecera: Cliente / Fecha / Obra / Descripción
function bloqueDatos(u, y, d, extra = []) {
  const { T, envolver } = u
  const filas = [
    ['Cliente:', d.cliente || '—'],
    ['Fecha:', fechaCorta(d.fecha) || '—'],
    ['Obra:', d.obra || '—'],
    ['Descripción:', d.descripcion || '—'],
    ...extra,
  ]
  filas.forEach(([k, v]) => {
    T(k, ML + 26, y, 9.5, 'n', GRISCLARO, 'right')
    const ls = envolver(v, CW - 32, 10)
    ls.forEach((l, i) => T(l, ML + 30, y + i * 4.8, 10, 'b', TEXTO))
    y += Math.max(1, ls.length) * 4.8 + 2.4
  })
  return y
}

// ─────────────────────────────── PDF para el cliente ───────────────────────────────

function construirCliente({ JsPDF, fuentes, logo, d, calc }) {
  const lab = etiquetas(d.tipo)
  const u = nuevoDoc(JsPDF, fuentes)
  const { doc, T, rect, linea, envolver, ajustado } = u
  encabezado(u, logo, lab.titulo, 'Instalaciones Fotovoltaicas')

  let y = bloqueDatos(u, 56, d) + 2
  linea(ML, y, W - ML, y, BORDE, 0.3)
  y += 8

  // Tabla de conceptos
  const c1 = ML, c2 = ML + 62, c3 = W - ML
  rect(ML, y, CW, 9, PANEL)
  T('Concepto', c1 + 4, y + 6, 9.5, 'b', BLANCO)
  T('Detalle', c2 + 2, y + 6, 9.5, 'b', BLANCO)
  T('Total (USD)', c3 - 4, y + 6, 9.5, 'b', BLANCO, 'right')
  y += 9
  const partes = [
    calc.combustible > 0 && 'Traslado',
    calc.peajes > 0 && 'Peajes',
    calc.moIng + calc.moTec > 0 && 'Mano de obra',
    calc.viaticos > 0 && 'Viáticos',
    calc.alojamiento > 0 && 'Alojamiento',
  ].filter(Boolean)
  const filas = [
    [lab.conceptoServicio, partes.length ? partes.join(' · ') : '—', calc.servicioCliente],
    [lab.conceptoItems, calc.filas.some((f) => f.total !== null) ? 'Ver detalle abajo' : 'Sin ítems', calc.repuestosCliente],
  ]
  filas.forEach(([a, b, v], i) => {
    const det = envolver(b, 70, 9)
    const h = Math.max(11, det.length * 4.4 + 5)
    rect(ML, y, CW, h, i % 2 ? BLANCO : FILA)
    linea(ML, y + h, W - ML, y + h, BORDE, 0.2)
    T(a, c1 + 4, y + h / 2 + 1.6, 10, 'b', TEXTO)
    det.forEach((l, k) => T(l, c2 + 2, y + h / 2 + 1.5 - ((det.length - 1) * 4.4) / 2 + k * 4.4, 9, 'n', GRIS))
    T(usd(v), c3 - 4, y + h / 2 + 1.6, 10, 'b', TEXTO, 'right')
    y += h
  })

  // Total final
  y += 6
  // En primer plano el TOTAL FINAL sin IVA; debajo, el monto del IVA y el total con IVA
  rect(ML, y, CW, 17, VERDEFONDO, 1.5)
  rect(ML, y, 2.4, 17, LIME)
  T('TOTAL FINAL (Sin I.V.A)', ML + 8, y + 10.6, 11, 'b', PANEL)
  T(usd(calc.totalCliente), W - ML - 6, y + 11.4, 17, 'b', PANEL, 'right')
  y += 17
  if (calc.ivaPct > 0) {
    y += 6
    T(`I.V.A. ${f2.format(calc.ivaPct).replace(',00', '')} %`, ML + 8, y, 10, 'n', GRIS)
    T(usd(calc.iva), W - ML - 6, y, 10.5, 'b', TEXTO, 'right')
    y += 3.5
    linea(ML + 8, y, W - ML - 6, y, BORDE, 0.3)
    y += 6.5
    T('Total con I.V.A.', ML + 8, y, 10.5, 'b', TEXTO)
    T(usd(calc.totalConIva), W - ML - 6, y, 11.5, 'b', TEXTO, 'right')
    y += 4
  }
  y += 10

  // Detalle de repuestos / actividades
  const usadas = calc.filas.filter((f) => f.usada && f.total !== null)
  if (usadas.length) {
    rect(ML, y, CW, 8, PANEL2)
    T(lab.detalle, ML + 4, y + 5.6, 9, 'b', BLANCO)
    y += 8
    const xCant = ML + 108, xPu = ML + 140, xTot = W - ML - 3
    T('Descripción', ML + 4, y + 5.6, 8, 'b', GRISCLARO)
    T('Cant.', xCant, y + 5.6, 8, 'b', GRISCLARO, 'right')
    T('Precio unit.', xPu, y + 5.6, 8, 'b', GRISCLARO, 'right')
    T('Total', xTot, y + 5.6, 8, 'b', GRISCLARO, 'right')
    y += 8
    usadas.forEach((f, i) => {
      const ls = envolver(f.desc || '—', 98, 9)
      const h = Math.max(8, ls.length * 4.2 + 3.6)
      if (y + h > H - 50) {
        doc.addPage()
        y = 20
      }
      if (i % 2 === 0) rect(ML, y, CW, h, FILA)
      ls.forEach((l, k) => T(l, ML + 4, y + 5.2 + k * 4.2, 9, 'n', TEXTO))
      T(String(f.cant).replace('.', ','), xCant, y + 5.2, 9, 'n', TEXTO, 'right')
      T(f2.format(f.precioCliente), xPu, y + 5.2, 9, 'n', TEXTO, 'right')
      T(f2.format(f.totalCliente), xTot, y + 5.2, 9, 'b', TEXTO, 'right')
      y += h
    })
    linea(ML, y, W - ML, y, BORDE, 0.3)
    y += 8
  }

  // Notas y condiciones
  const validez = String(d.validez || '').trim()
  const notas = [...(d.notas || [])].map((s) => String(s).trim()).filter(Boolean)
  if (validez) notas.splice(Math.min(1, notas.length), 0, `Presupuesto válido por ${validez} días a partir de la fecha de emisión.`)
  if (notas.length) {
    if (y > H - 55) {
      doc.addPage()
      y = 20
    }
    T('CONDICIONES Y NOTAS', ML, y, 8, 'b', GRISCLARO)
    y += 5
    notas.forEach((n) => {
      const ls = envolver(n, CW - 6, 8.6)
      doc.setFillColor(...LIME)
      doc.circle(ML + 1.2, y - 1, 0.6, 'F')
      ls.forEach((l, k) => T(l, ML + 4, y + k * 4, 8.6, 'n', GRIS))
      y += ls.length * 4 + 1.6
    })
  }
  void ajustado
  pie(u, 'Oficina Técnica · Ecovatio')
  return doc
}

// ─────────────────────────────── PDF interno ───────────────────────────────

const personasPor = (v, uno, varios) => `${f0.format(n0(v))} ${n0(v) === 1 ? uno : varios}`

// Detalle del viático por persona (método de Solicitudes)
function textoViatico(d, calc) {
  if (!d.viaticos) return 'No incluidos'
  const t = calc.tarifas
  const dias = calc.diasViaje
  if (calc.manual) return `${dias} ${dias === 1 ? 'día' : 'días'} × ARS ${f0.format(Math.round((calc.diarioManual || 0) * (1 + t.comision / 100)))} (otro monto, incl. ${f0.format(t.comision)} % comisión)`
  const base = dias === 1 ? `1 día en el día` : `${dias} días: ${dias - 1} con pernocte + regreso`
  return `${base} · ARS ${f0.format(calc.viaticoPersonaArs)}/persona (incl. ${f0.format(t.comision)} % comisión)`
}

function construirInterno({ JsPDF, fuentes, logo, d, calc, config }) {
  const lab = etiquetas(d.tipo)
  const u = nuevoDoc(JsPDF, fuentes)
  const { doc, T, rect, linea, envolver, ancho } = u
  encabezado(u, logo, `PRESUPUESTO INTERNO DE ${lab.internoTitulo}`, 'Desglose de costos (USD) · uso interno')
  // sello
  rect(ML, 47, CW, 7.5, [253, 240, 210], 1.5)
  T('USO INTERNO — contiene costos y ganancia. No enviar al cliente.', ML + 4, 52.2, 8.6, 'b', [140, 90, 0])

  let y = bloqueDatos(u, 64, d, [['Tipo de cambio:', `ARS ${f0.format(calc.tc)} por USD`]]) + 1
  linea(ML, y, W - ML, y, BORDE, 0.3)
  y += 6

  const xCon = ML, xDet = ML + 50, xCant = ML + 150, xTot = W - ML - 3
  rect(ML, y, CW, 9, PANEL)
  T('Concepto', xCon + 3, y + 6, 9, 'b', BLANCO)
  T('Detalle / cálculo', xDet, y + 6, 9, 'b', BLANCO)
  T('Cantidad', xCant, y + 6, 9, 'b', BLANCO, 'right')
  T('Total (USD)', xTot, y + 6, 9, 'b', BLANCO, 'right')
  y += 9

  const ars = (v) => f0.format(v)
  const p = config
  const filas = [
    ['Combustible', calc.veh ? `${calc.veh.nombre} | ${f2.format(calc.veh.consumo)} L/100 km | ${ars(calc.precioLitro)} ARS/L` : '—', calc.litros > 0 || calc.combustible > 0 ? `${f2.format(n0(d.km))} km` : '', calc.combustible],
    ['Peajes', `Valor unitario: ${ars(n0(p.peaje))} ARS`, String(d.peajes || 0), calc.peajes],
    ['Mano de obra – Ingenieros', `USD ${f2.format(n0(p.moIngenieroUsd))}/día · ${personasPor(d.ingenieros, 'ingeniero', 'ingenieros')} × ${f2.format(n0(d.diasIngenieros)).replace(',00', '')} días`, `${f2.format(calc.jornadasIng)} jornadas`, calc.moIng],
    ['Mano de obra – Técnicos', `USD ${f2.format(n0(p.moTecnicoUsd))}/día · ${personasPor(d.tecnicos, 'técnico', 'técnicos')} × ${f2.format(n0(d.diasTecnicos)).replace(',00', '')} días`, `${f2.format(calc.jornadasTec)} jornadas`, calc.moTec],
    ['Alojamiento', `Valor noche/persona: ${ars(n0(p.alojamientoNoche))} ARS · ${f0.format(n0(d.noches))} ${n0(d.noches) === 1 ? 'noche' : 'noches'} × ${f0.format(n0(d.ingenieros) + n0(d.tecnicos))} pers.`, `${f2.format(calc.personasNoche)} noches-persona`, calc.alojamiento],
    ['Viáticos – Ingenieros', textoViatico(d, calc), `${f0.format(n0(d.ingenieros))} ${n0(d.ingenieros) === 1 ? 'persona' : 'personas'}`, calc.viaticosIng],
    ['Viáticos – Técnicos', textoViatico(d, calc), `${f0.format(n0(d.tecnicos))} ${n0(d.tecnicos) === 1 ? 'persona' : 'personas'}`, calc.viaticosTec],
  ]
  const fila = (a, b, c, v, i, fuerte = false) => {
    const det = envolver(b, 62, 8.4)
    const h = Math.max(9, det.length * 4 + 4)
    if (i % 2 === 0) rect(ML, y, CW, h, FILA)
    linea(ML, y + h, W - ML, y + h, BORDE, 0.15)
    const cy = y + h / 2 + 1.4
    T(a, xCon + 3, cy, 9.2, fuerte ? 'b' : 'n', TEXTO)
    det.forEach((l, k) => T(l, xDet, cy - ((det.length - 1) * 4) / 2 + k * 4, 8.4, 'n', GRIS))
    if (c) T(c, xCant, cy, 8.4, 'n', GRIS, 'right')
    T(f2.format(v), xTot, cy, 9.4, 'b', v === 0 ? GRISCLARO : TEXTO, 'right')
    y += h
  }
  filas.forEach((f, i) => fila(...f, i))
  fila(lab.internoItems, calc.filas.some((f) => f.total !== null) ? 'Detalle abajo' : 'Sin ítems', '', calc.repuestos, filas.length)

  // Totales
  y += 5
  const total = (rot, valor, { fondo = FILA, color = TEXTO, size = 10.5, h = 10 } = {}) => {
    rect(ML, y, CW, h, fondo, 1.2)
    T(rot, ML + 5, y + h / 2 + 1.6, size, 'b', color)
    T(valor, W - ML - 5, y + h / 2 + 1.6, size + 1, 'b', color, 'right')
    y += h + 2
  }
  total('Subtotal servicio (sin repuestos)', usd(calc.subtotalServicio))
  total('TOTAL INTERNO (costo)', usd(calc.totalInterno), { fondo: PANEL, color: BLANCO })
  total(`TOTAL CON ${f2.format(calc.g * 100).replace(',00', '')} % DE GANANCIA`, usd(calc.totalConGanancia), { fondo: VERDEFONDO, color: PANEL, size: 11.5, h: 12 })
  T(`Ganancia: ${usd(calc.ganancia)} · margen sobre el precio de venta: ${f2.format(calc.margenSobrePrecio * 100)} % (el ${f2.format(calc.g * 100).replace(',00', '')} % es un recargo sobre el costo).`, ML, y + 3, 8, 'n', GRIS)
  y += 10

  // Detalle de repuestos a costo
  const usadas = calc.filas.filter((f) => f.usada && f.total !== null)
  if (usadas.length) {
    if (y > H - 45) {
      doc.addPage()
      y = 20
    }
    rect(ML, y, CW, 8, PANEL2)
    T(`${lab.detalle} (a costo)`, ML + 4, y + 5.6, 9, 'b', BLANCO)
    y += 8
    usadas.forEach((f, i) => {
      const ls = envolver(f.desc || '—', 98, 9)
      const h = Math.max(8, ls.length * 4.2 + 3.6)
      if (y + h > H - 20) {
        doc.addPage()
        y = 20
      }
      if (i % 2 === 0) rect(ML, y, CW, h, FILA)
      ls.forEach((l, k) => T(l, ML + 4, y + 5.2 + k * 4.2, 9, 'n', TEXTO))
      T(`${String(f.cant).replace('.', ',')} × ${f2.format(f.precio)}`, ML + 140, y + 5.2, 9, 'n', GRIS, 'right')
      T(f2.format(f.total), W - ML - 3, y + 5.2, 9, 'b', TEXTO, 'right')
      y += h
    })
  }
  void ancho
  pie(u, 'Oficina Técnica · Ecovatio — uso interno')
  return doc
}

// ─────────────────────────────── API ───────────────────────────────

async function recursos() {
  const [{ jsPDF }, fuentes, logo] = await Promise.all([import('jspdf'), cargarFuentes(), cargarLogo()])
  return { JsPDF: jsPDF, fuentes, logo }
}

export async function descargarPdfCliente({ d, calc }) {
  const r = await recursos()
  const doc = construirCliente({ ...r, d, calc })
  doc.save(`Presupuesto_${slug(d.tipo)}_${slug(d.cliente) || 'cliente'}_${d.fecha || ''}.pdf`)
}

export async function descargarPdfInterno({ d, calc, config }) {
  const r = await recursos()
  const doc = construirInterno({ ...r, d, calc, config })
  doc.save(`Presupuesto_INTERNO_${slug(d.tipo)}_${slug(d.cliente) || 'cliente'}_${d.fecha || ''}.pdf`)
}

// Para pruebas: devuelve el documento sin descargarlo
export async function armarPdf(tipo, args) {
  const r = await recursos()
  return tipo === 'interno' ? construirInterno({ ...r, ...args }) : construirCliente({ ...r, ...args })
}
