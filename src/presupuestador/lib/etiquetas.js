// Rótulos que cambian según el tipo de servicio (igual que en la planilla).

export function etiquetas(tipo) {
  if (tipo === 'Servicio') {
    return {
      titulo: 'PRESUPUESTO DE SERVICIO',
      conceptoServicio: 'Servicio',
      conceptoItems: 'Materiales y Actividades',
      hojaTitulo: 'Actividades del servicio',
      hojaAyuda: 'Detallá las actividades que componen el servicio a realizar.',
      colDesc: 'Actividad / Descripción',
      colPrecio: 'Costo unit. (USD)',
      detalle: 'DETALLE DE ACTIVIDADES',
      internoTitulo: 'SERVICIO',
      internoItems: 'Materiales / Actividades',
    }
  }
  if (tipo === 'Relevamiento') {
    return {
      titulo: 'PRESUPUESTO DE RELEVAMIENTO',
      conceptoServicio: 'Relevamiento',
      conceptoItems: 'Materiales y Actividades',
      hojaTitulo: 'Actividades del relevamiento',
      hojaAyuda: 'Detallá las actividades que componen el relevamiento.',
      colDesc: 'Actividad / Descripción',
      colPrecio: 'Costo unit. (USD)',
      detalle: 'DETALLE DE ACTIVIDADES',
      internoTitulo: 'RELEVAMIENTO',
      internoItems: 'Materiales / Actividades',
    }
  }
  return {
    titulo: 'PRESUPUESTO DE POST VENTA',
    conceptoServicio: 'Servicio Post Venta',
    conceptoItems: 'Repuestos / Materiales',
    hojaTitulo: 'Repuestos y materiales',
    hojaAyuda: 'Completá esta sección solo si la visita requiere repuestos. Si no hay repuestos, dejala vacía.',
    colDesc: 'Denominación / Descripción',
    colPrecio: 'Costo unit. (USD)',
    detalle: 'DETALLE DE REPUESTOS',
    internoTitulo: 'POST VENTA',
    internoItems: 'Repuestos',
  }
}
