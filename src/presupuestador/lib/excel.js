// Excel descargable: parte de la planilla original (public/plantilla-presupuesto-postventa.xlsx) y completa
// la configuración y los datos del presupuesto. Las fórmulas se conservan, así que se puede seguir editando a mano.
//
// Cambios respecto de la planilla original:
//  - La fecha es un valor fijo (la original usa HOY() y cambia cada vez que se abre).
//  - Los vehículos, consumos y precios de combustible salen de Solicitudes (igual que en la herramienta): van en una
//    hoja nueva "Vehículos" y las fórmulas del combustible la usan, así que no hay límite de vehículos.
//  - Se completan las fórmulas de total de las filas 6 a 9 de "Repuestos - Servicios" (en la original estaban vacías,
//    por lo que un repuesto cargado en esas filas no se sumaba), y el total de la hoja pasa a ser una SUMA simple.
import { num } from './calculo'
import { slug, descargarArchivo } from './formato'

function fechaExcel(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  return y ? new Date(Date.UTC(y, m - 1, d)) : new Date()
}

export async function generarExcel(plantilla, { d, config, flota, validezTexto, notas }) {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(plantilla)

  // ── Hoja nueva con la flota (de Solicitudes)
  const hv = wb.addWorksheet('Vehículos')
  hv.columns = [{ width: 30 }, { width: 20 }, { width: 18 }, { width: 16 }]
  hv.addRow(['Vehículo', 'Consumo (L/100 km)', 'Combustible', 'Precio (ARS/L)'])
  hv.getRow(1).eachCell((c) => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D3C44' } }
    c.alignment = { vertical: 'middle' }
  })
  flota.forEach((v) => hv.addRow([v.nombre, Number(v.consumo.toFixed(2)), v.combustible, v.precioLitro]))
  hv.getColumn(2).numFmt = '0.00'
  hv.getColumn(4).numFmt = '#,##0'
  hv.addRow([])
  hv.addRow(['Datos tomados de la herramienta Solicitudes de combustible (vehículos, km/l y precios de combustible).'])
  hv.getCell(`A${flota.length + 3}`).font = { italic: true, color: { argb: 'FF5C6F72' } }
  const ultima = Math.max(2, flota.length + 1)

  // ── Configuración
  const cf = wb.getWorksheet('Configuración')
  cf.getCell('C5').value = num(config.tipoCambio) ?? 0
  cf.getCell('C6').value = (num(config.ganancia) ?? 0) / 100
  cf.getCell('B9').value = 'Precios de combustible: ver hoja «Vehículos»'
  for (const c of ['C9', 'B10', 'C10', 'B11', 'C11']) cf.getCell(c).value = null
  cf.getCell('C12').value = num(config.viaticoDia) ?? 0
  cf.getCell('C13').value = num(config.alojamientoNoche) ?? 0
  cf.getCell('C14').value = num(config.peaje) ?? 0
  cf.getCell('C17').value = num(config.moIngenieroUsd) ?? 0
  cf.getCell('C18').value = num(config.moTecnicoUsd) ?? 0
  for (let r = 22; r <= 26; r++) for (const c of ['B', 'C', 'D']) cf.getCell(`${c}${r}`).value = null
  cf.getCell('B22').value = 'Ver hoja «Vehículos»'

  // ── Fórmulas del combustible: ahora leen la hoja Vehículos
  const veh = "MATCH('Ingreso de Datos'!C11,'Vehículos'!A2:A" + ultima + ',0)'
  const consumoF = `IFERROR(INDEX('Vehículos'!B2:B${ultima},${veh}),0)`
  const precioF = `IFERROR(INDEX('Vehículos'!D2:D${ultima},${veh}),0)`
  const pi = wb.getWorksheet('Presupuesto Interno')
  const c10 = pi.getCell('C10')
  const e10 = pi.getCell('E10')
  c10.value = {
    ...(typeof c10.value === 'object' ? c10.value : {}),
    formula: `IFERROR("Vehículo: "&'Ingreso de Datos'!C11&" | "&TEXT(${consumoF},"0.00")&" L/100km | "&TEXT(${precioF},"#,##0")&" ARS/L","—")`,
  }
  e10.value = {
    ...(typeof e10.value === 'object' ? e10.value : {}),
    formula: `IFERROR('Ingreso de Datos'!C12*(${consumoF}/100)*${precioF}/Configuración!C5,0)`,
  }

  // ── Ingreso de Datos
  const ws = wb.getWorksheet('Ingreso de Datos')
  ws.getCell('C5').value = d.cliente || null
  ws.getCell('C6').value = fechaExcel(d.fecha)
  ws.getCell('C7').value = d.obra || null
  ws.getCell('C8').value = d.descripcion || null
  ws.getCell('C9').value = d.tipo
  ws.getCell('C11').value = flota.some((v) => v.nombre === d.vehiculo) ? d.vehiculo : null
  ws.getCell('C12').value = num(d.km) ?? 0
  ws.getCell('C13').value = num(d.peajes) ?? 0
  ws.getCell('C16').value = num(d.ingenieros) ?? 0
  ws.getCell('C17').value = num(d.diasIngenieros) ?? 0
  ws.getCell('C18').value = num(d.tecnicos) ?? 0
  ws.getCell('C19').value = num(d.diasTecnicos) ?? 0
  ws.getCell('C22').value = num(d.noches) ?? 0
  ws.getCell('C23').value = d.viaticos ? 'Sí' : 'No'
  // La lista desplegable de vehículos lee la hoja Vehículos
  ws.getCell('C11').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [`'Vehículos'!$A$2:$A$${ultima}`],
  }

  // ── Repuestos / actividades (hasta 20 filas, de la 6 a la 25)
  const rp = wb.getWorksheet('Repuestos - Servicios')
  for (let r = 6; r <= 9; r++) {
    rp.getCell(`E${r}`).value = { formula: `IFERROR(IF(C${r}="","",C${r}*D${r}),"")` }
    rp.getCell(`E${r}`).style = structuredClone(rp.getCell('E10').style)
  }
  rp.getCell('E27').value = { formula: 'IFERROR(SUM(E6:E25),0)' }
  ;(d.repuestos || []).slice(0, 20).forEach((f, i) => {
    const r = 6 + i
    rp.getCell(`B${r}`).value = String(f.desc || '').trim() || null
    rp.getCell(`C${r}`).value = num(f.cant)
    rp.getCell(`D${r}`).value = String(f.precio ?? '').trim() === '' ? null : num(f.precio)
  })

  // ── Presupuesto Cliente: condiciones y notas
  const pc = wb.getWorksheet('Presupuesto Cliente')
  const lineas = [...notas]
  if (validezTexto) lineas.splice(Math.min(1, lineas.length), 0, validezTexto)
  pc.getCell('C41').value = lineas.map((l) => `• ${l}`).join('\n')

  wb.calcProperties = { fullCalcOnLoad: true }
  return wb.xlsx.writeBuffer()
}

export async function descargarExcel({ d, config, flota, validezTexto, notas }) {
  const resp = await fetch('/plantilla-presupuesto-postventa.xlsx')
  if (!resp.ok) throw new Error('No se encontró la plantilla de Excel')
  const buf = await generarExcel(await resp.arrayBuffer(), { d, config, flota, validezTexto, notas })
  descargarArchivo(buf, `Presupuesto_${slug(d.tipo)}_${slug(d.cliente) || 'cliente'}_${d.fecha || ''}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
