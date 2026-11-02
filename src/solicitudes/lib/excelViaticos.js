import ExcelJS from 'exceljs'

// Genera la Solicitud de Viáticos RPS 01 02 a partir de la plantilla única
// (public/plantilla-rps-01-02.xlsx: formato de octubre 2026, sin las hojas
// TABLAS / TRANSFERENCIA / Hoja2). Se escriben valores fijos, ya redondeados
// y con la comisión incluida.

const PESOS = '_-"$"\\ * #,##0_-;\\-"$"\\ * #,##0_-;_-"$"\\ * "-"??_-;_-@'
const FILAS_COLAB = [23, 33] // 11 filas por columna
const COLUMNAS_COLAB = [
  { nombre: 'C', dias: 'E', monto: 'F' },
  { nombre: 'H', dias: 'J', monto: 'K' },
]

const fechaExcel = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/**
 * @param {ArrayBuffer} plantilla
 * @param {object} s  solicitud ya calculada:
 *   { responsable, fechaInicio, fechaFin, duracion, destino, descripcion,
 *     viaticoDiario, notaViatico, colaboradores: [{ nombre, dias, monto }],
 *     totalViaticos, gastos: [{ fila, concepto, monto }], totalGastos,
 *     anticipo, saldoAnterior, saldo, comision }
 */
export async function generarExcelViaticos(plantilla, s) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(plantilla)
  const ws = wb.worksheets[0]
  const set = (celda, valor, formato) => {
    const c = ws.getCell(celda)
    c.value = valor
    if (formato) c.numFmt = formato
  }

  // Datos del viaje
  set('C10', s.responsable)
  set('F9', fechaExcel(s.fechaInicio), 'dd/mm/yyyy')
  set('F10', fechaExcel(s.fechaFin), 'dd/mm/yyyy')
  set('G9', s.duracion, '0')
  set('H9', s.destino)
  set('I9', s.descripcion || null)

  // Anticipo
  set('K12', s.anticipo, PESOS)
  set('J14', s.saldoAnterior || 0, PESOS)
  set('K15', s.saldo, PESOS)

  // Viático diario
  set('G20', s.viaticoDiario, PESOS)
  set('H20', s.notaViatico)

  // Colaboradores: primero la columna izquierda, después la derecha
  const porColumna = FILAS_COLAB[1] - FILAS_COLAB[0] + 1
  s.colaboradores.forEach((c, i) => {
    const col = COLUMNAS_COLAB[Math.floor(i / porColumna)]
    const fila = FILAS_COLAB[0] + (i % porColumna)
    set(col.nombre + fila, c.nombre)
    set(col.dias + fila, c.dias, '0')
    set(col.monto + fila, c.monto, PESOS)
  })
  set('G35', s.totalViaticos, PESOS)

  // Otros gastos (filas 40 a 44)
  for (const g of s.gastos) {
    set('C' + g.fila, g.concepto)
    set('F' + g.fila, g.monto || null, PESOS)
  }
  const pct = s.comision ?? 8
  // Aclaración de la comisión (textos cortos: son celdas combinadas y Excel corta lo que no entra)
  set('C37', 'OTROS GASTOS RELACIONADOS CON EL VIAJE (A RENDIR)')
  set('F39', `MONTO c/${pct}%`)
  set('H39', `Montos con ${pct}% de comisión de la tarjeta prepaga incluido`)
  set('C45', `Total otros gastos (c/${pct}% comisión tarjeta prepaga)`)
  set('G45', s.totalGastos, PESOS)

  return wb.xlsx.writeBuffer()
}

export function nombreArchivoViaticos({ destino, fechaInicio }) {
  const [y, m, d] = fechaInicio.split('-')
  const limpio = destino.trim().toUpperCase().replace(/[\\/:*?"<>|]/g, '-').slice(0, 60)
  return `RPS 01 02 - SOLICITUD de VIÁTICOS - ${limpio} - ${d}-${m}-${y.slice(2)}.xlsx`
}
