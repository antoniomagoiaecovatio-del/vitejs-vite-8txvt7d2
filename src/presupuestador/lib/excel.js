// Excel descargable: parte de la planilla original (public/plantilla-presupuesto-postventa.xlsx) y completa
// la configuración y los datos del presupuesto. Las fórmulas se conservan, así que se puede seguir editando a mano.
//
// Cambios respecto de la planilla original:
//  - La fecha es un valor fijo (la original usa HOY() y cambia cada vez que se abre).
//  - Los vehículos, consumos y precios de combustible salen de Solicitudes (igual que en la herramienta): van en una
//    hoja nueva "Vehículos" y las fórmulas del combustible la usan, así que no hay límite de vehículos.
//  - Los viáticos usan el método de Solicitudes (días del viaje = noches + 1; en el día / con pernocte + regreso; con comisión
//    de la tarjeta prepaga). Las tarifas van al pie de la hoja Configuración (filas 35 a 40; la 40 es el modo "Otro monto")
//    y las fórmulas de viáticos las leen.
//  - Se completan las fórmulas de total de las filas 6 a 9 de "Repuestos - Servicios" (en la original estaban vacías,
//    por lo que un repuesto cargado en esas filas no se sumaba), y el total de la hoja pasa a ser una SUMA simple.
import { num } from './calculo'
import { diarioManualARS } from '../../solicitudes/lib/viaticos'
import { slug, descargarArchivo } from './formato'

function fechaExcel(iso) {
  const [y, m, d] = String(iso || '').split('-').map(Number)
  return y ? new Date(Date.UTC(y, m - 1, d)) : new Date()
}

export async function generarExcel(plantilla, { d, config, flota, tarifas, validezTexto, notas }) {
  const calcManual = d.viaticoModo === 'manual' ? diarioManualARS({ moneda: d.viaticoMoneda, monto: d.viaticoMonto, tipoCambio: config.tipoCambio }) : null
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
  cf.getCell('B12').value = 'Viáticos: ver tarifas al pie (método Solicitudes)'
  cf.getCell('C12').value = null
  // Tarifas de viáticos (de Solicitudes), al pie de la hoja
  const copiar = (origen, destino) => {
    cf.getCell(destino).style = structuredClone(cf.getCell(origen).style)
  }
  copiar('B16', 'B35')
  copiar('B16', 'C35')
  cf.getCell('B35').value = 'VIÁTICOS (método de Solicitudes)'
  ;[
    ['Viático en el día (ARS)', tarifas.dia],
    ['Día con pernocte (ARS)', tarifas.pernocte],
    ['Día de regreso (ARS)', tarifas.regreso],
    ['Comisión tarjeta prepaga (%)', tarifas.comision],
  ].forEach(([rot, v], i) => {
    const r = 36 + i
    copiar('B9', `B${r}`)
    copiar('C9', `C${r}`)
    cf.getCell(`B${r}`).value = rot
    cf.getCell(`C${r}`).value = v
  })
  // Modo "Otro monto": valor fijo por día en pesos (0 = se usan las tarifas automáticas de arriba)
  copiar('B9', 'B40')
  copiar('C9', 'C40')
  cf.getCell('B40').value = 'Otro monto por día (ARS, 0 = automático)'
  cf.getCell('C40').value = calcManual ? Math.round(calcManual) : 0
  cf.getColumn('B').width = Math.max(cf.getColumn('B').width || 0, 38)
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

  // Viáticos: días del viaje = noches + 1; 1 día = tarifa en el día; N días = (N-1) × pernocte + regreso (con comisión, en pesos enteros)
  const dias = "(INT('Ingreso de Datos'!C22)+1)"
  const k = '(1+Configuración!C39/100)'
  const porPersona = `IF(Configuración!C40>0,${dias}*ROUND(Configuración!C40*${k},0),IF(${dias}=1,ROUND(Configuración!C36*${k},0),(${dias}-1)*ROUND(Configuración!C37*${k},0)+ROUND(Configuración!C38*${k},0)))`
  const conV = "IF('Ingreso de Datos'!C23=\"Sí\",1,0)"
  const detalleV = `IF('Ingreso de Datos'!C23="Sí",${dias}&IF(${dias}=1," día"," días")&" · ARS "&TEXT(${porPersona},"#,##0")&"/persona (incl. "&TEXT(Configuración!C39,"0")&"% comisión)","No incluidos")`
  pi.getCell('C15').value = { formula: detalleV }
  pi.getCell('C16').value = { formula: detalleV }
  pi.getCell('D15').value = { formula: "'Ingreso de Datos'!C16" }
  pi.getCell('D16').value = { formula: "'Ingreso de Datos'!C18" }
  pi.getCell('E15').value = { formula: `IFERROR('Ingreso de Datos'!C16*${porPersona}/Configuración!C5*${conV},0)` }
  pi.getCell('E16').value = { formula: `IFERROR('Ingreso de Datos'!C18*${porPersona}/Configuración!C5*${conV},0)` }

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

export async function descargarExcel({ d, config, flota, tarifas, validezTexto, notas }) {
  const resp = await fetch('/plantilla-presupuesto-postventa.xlsx')
  if (!resp.ok) throw new Error('No se encontró la plantilla de Excel')
  const buf = await generarExcel(await resp.arrayBuffer(), { d, config, flota, tarifas, validezTexto, notas })
  descargarArchivo(buf, `Presupuesto_${slug(d.tipo)}_${slug(d.cliente) || 'cliente'}_${d.fecha || ''}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
}
