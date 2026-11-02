import ExcelJS from 'exceljs'
import { fechaLocalISO } from './calc.js'

// Genera el Excel RPO 03 20 a partir de la plantilla original de Solflix
// (mismo encabezado, logo, columnas y hojas auxiliares), con solo las filas
// del pedido y valores fijos (sin fórmulas).

const PRIMERA_FILA = 6
const FORMATOS = {
  6: 'dd/mm/yyyy', // Fecha carga
  8: '0.0', // km/l
  9: '#,##0', // Km estimados
  11: '"$" #,##0', // Precio
  12: '0.00', // Litros
  13: '"$" #,##0', // Monto
}

const aNumero = (s) => (s && /^\d+$/.test(String(s)) ? Number(s) : s || null)

const fechaExcel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * @param {ArrayBuffer} plantilla  bytes de public/plantilla-rpo-03-20.xlsx
 * @param {object} pedido
 * @param {Array} pedido.filas       [{vehiculo, patente, conductor, dni, telefono, fecha(ISO), obra, kmL, km, combustible, precio, litros, monto}]
 * @param {Array} pedido.combustibles [{nombre, precio, updated_at}]
 * @param {Array} pedido.personal     [{nombre, dni, telefono}]
 * @returns {Promise<ArrayBuffer>}
 */
export async function generarExcel(plantilla, { filas, combustibles, personal }) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(plantilla)

  // ---- Carga de Combustible
  const ws = wb.getWorksheet('Carga de Combustible')
  const estilos = []
  for (let c = 1; c <= 13; c++) estilos[c] = structuredClone(ws.getRow(PRIMERA_FILA).getCell(c).style)

  // La plantilla trae ~120 filas con bordes y relleno (y fórmulas compartidas,
  // que hay que vaciar o exceljs falla al guardar). Se deja cada fila sin
  // valor ni formato para que solo queden las del pedido.
  const ultima = ws.rowCount
  for (let r = PRIMERA_FILA; r <= ultima; r++) {
    const row = ws.getRow(r)
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.value = null
      cell.style = {}
    })
    row.style = {}
  }

  filas.forEach((f, i) => {
    const row = ws.getRow(PRIMERA_FILA + i)
    const valores = [
      f.vehiculo, f.patente || null, f.conductor, aNumero(f.dni), aNumero(f.telefono),
      fechaExcel(f.fecha), f.obra, f.kmL, f.km, f.combustible, f.precio, f.litros, f.monto,
    ]
    valores.forEach((v, j) => {
      const cell = row.getCell(j + 1)
      cell.style = structuredClone(estilos[j + 1])
      if (FORMATOS[j + 1]) cell.numFmt = FORMATOS[j + 1]
      cell.value = v
    })
    row.height = 14.25
    row.commit()
  })
  ws.autoFilter = `A5:M${PRIMERA_FILA + Math.max(filas.length, 1) - 1}`

  // ---- Precios Combustibles (precios vigentes en la app)
  const wp = wb.getWorksheet('Precios Combustibles')
  if (wp) {
    wp.eachRow((row, r) => {
      if (r === 1) return
      const c = combustibles.find((x) => x.nombre === row.getCell(1).value)
      if (c) row.getCell(2).value = Number(c.precio)
    })
    const ultimaAct = combustibles.map((c) => c.updated_at).filter(Boolean).sort().at(-1)
    if (ultimaAct) {
      wp.getCell('D1').value = fechaExcel(fechaLocalISO(new Date(ultimaAct)))
      wp.getCell('D1').numFmt = 'dd/mm/yyyy'
    }
  }

  // ---- Usuarios (base de personal vigente)
  const wu = wb.getWorksheet('Usuarios')
  if (wu) {
    for (let r = 2; r <= wu.rowCount; r++) {
      for (let c = 1; c <= 3; c++) wu.getRow(r).getCell(c).value = null
    }
    personal.forEach((p, i) => {
      const row = wu.getRow(2 + i)
      row.getCell(1).value = p.nombre
      row.getCell(2).value = aNumero(p.dni)
      row.getCell(3).value = aNumero(p.telefono)
    })
  }

  return wb.xlsx.writeBuffer()
}

export function nombreArchivo(filas) {
  const obras = [...new Set(filas.map((f) => f.obra.trim().toUpperCase()))]
  const fechas = filas.map((f) => f.fecha).sort()
  const [y, m, d] = fechas[0].split('-')
  const detalle = obras.length === 1 ? obras[0] : `${obras.length} OBRAS`
  const limpio = detalle.replace(/[\\/:*?"<>|]/g, '-').slice(0, 60)
  return `RPO 03 20 - SOLICITUD DE COMBUSTIBLE - ${limpio} - ${d}-${m}-${y}.xlsx`
}
