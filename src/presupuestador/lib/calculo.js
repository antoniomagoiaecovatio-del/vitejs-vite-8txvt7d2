import { TARIFAS_DEFECTO, viaticoPersona, diarioManualARS } from '../../solicitudes/lib/viaticos'

// Cálculo del presupuesto: reproduce las fórmulas de la planilla "Presupuestador_PostVenta" (hojas
// Presupuesto Interno y Presupuesto Cliente). Todo en USD; los valores en pesos se convierten con el tipo de cambio.

/** Número escrito con coma decimal ("11,76", "1.234,5") → Number; vacío o inválido → null */
export function num(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  let s = String(v).trim().replace(/\s/g, '')
  if (s === '') return null
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.')
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
const n0 = (v) => num(v) ?? 0

/**
 * @param d       datos del presupuesto (ver datosVacios)
 * @param config  parámetros (ver CONFIG_INICIAL)
 * @param flota   vehículos [{ nombre, consumo (L/100 km), combustible, precioLitro (ARS/L) }] (ver flota.js)
 * @param tarifas viáticos de Solicitudes { dia, regreso, pernocte, comision } (ver flota.js)
 */
export function calcular(d, config, flota = [], tarifas = TARIFAS_DEFECTO) {
  const tc = n0(config.tipoCambio)
  const g = n0(config.ganancia) / 100
  const aUsd = (ars) => (tc > 0 ? ars / tc : 0)

  const veh = flota.find((v) => v.nombre === d.vehiculo)
  const consumo = veh ? n0(veh.consumo) : 0
  const precioLitro = veh ? n0(veh.precioLitro) : 0
  const km = n0(d.km)
  const litros = (km * consumo) / 100
  const combustible = aUsd(litros * precioLitro)

  const peajes = aUsd(n0(d.peajes) * n0(config.peaje))

  const nIng = n0(d.ingenieros)
  const dIng = n0(d.diasIngenieros)
  const nTec = n0(d.tecnicos)
  const dTec = n0(d.diasTecnicos)
  const jornadasIng = nIng * dIng
  const jornadasTec = nTec * dTec
  const moIng = jornadasIng * n0(config.moIngenieroUsd)
  const moTec = jornadasTec * n0(config.moTecnicoUsd)

  const personasNoche = n0(d.noches) * (nIng + nTec)
  const alojamiento = aUsd(personasNoche * n0(config.alojamientoNoche))

  // Viáticos: mismo método que Solicitudes. Días del viaje = noches + 1 (se cuentan el primer y el último día).
  //   1 día  → tarifa "en el día";  N días → (N−1) × "con pernocte" + 1 × "día de regreso".
  // La comisión de la tarjeta prepaga va incluida en cada monto. Todo en pesos enteros, convertido a USD.
  const noches = Math.max(0, Math.floor(n0(d.noches)))
  const diasViaje = noches + 1
  const personas = nIng + nTec
  const manual = d.viaticoModo === 'manual'
  // "Otro monto": valor por día (en pesos, o en USD convertido con el tipo de cambio del presupuesto), sin comisión
  const diarioManual = manual ? diarioManualARS({ moneda: d.viaticoMoneda, monto: d.viaticoMonto, tipoCambio: config.tipoCambio }) : null
  const viaticoPersonaArs = viaticoPersona({ dias: diasViaje, modo: manual ? 'manual' : 'auto', t: tarifas, diarioManual }) ?? 0
  const conViaticos = d.viaticos ? 1 : 0
  const viaticosIng = aUsd(nIng * viaticoPersonaArs) * conViaticos
  const viaticosTec = aUsd(nTec * viaticoPersonaArs) * conViaticos
  const viaticos = viaticosIng + viaticosTec

  // Repuestos / actividades: cantidad × costo unitario (una fila suma si tiene cantidad)
  const filas = (d.repuestos || []).map((r) => {
    const cant = num(r.cant)
    const precio = n0(r.precio)
    const total = cant === null ? null : cant * precio
    return {
      desc: String(r.desc || '').trim(),
      cant,
      precio,
      total,
      precioCliente: precio * (1 + g),
      totalCliente: total === null ? null : total * (1 + g),
      usada: cant !== null || String(r.desc || '').trim() !== '',
    }
  })
  const repuestos = filas.reduce((s, f) => s + (f.total ?? 0), 0)

  const subtotalServicio = combustible + peajes + moIng + moTec + alojamiento + viaticos
  const totalInterno = subtotalServicio + repuestos
  const totalConGanancia = totalInterno * (1 + g)
  const servicioCliente = subtotalServicio * (1 + g)
  const repuestosCliente = repuestos * (1 + g)
  const totalCliente = servicioCliente + repuestosCliente
  // IVA: se detalla aparte en el presupuesto del cliente (el total sin IVA es el de la planilla)
  const ivaPct = n0(config.iva)
  const iva = (totalCliente * ivaPct) / 100
  const totalConIva = totalCliente + iva

  return {
    tc,
    g,
    veh,
    consumo,
    precioLitro,
    litros,
    combustible,
    peajes,
    moIng,
    moTec,
    alojamiento,
    viaticosIng,
    viaticosTec,
    viaticos,
    jornadasIng,
    jornadasTec,
    personasNoche,
    diasViaje,
    personas,
    manual,
    diarioManual,
    viaticoPersonaArs,
    tarifas,
    filas,
    repuestos,
    subtotalServicio,
    totalInterno,
    totalConGanancia,
    servicioCliente,
    repuestosCliente,
    totalCliente,
    ivaPct,
    iva,
    totalConIva,
    ganancia: totalCliente - totalInterno,
    margenSobrePrecio: totalCliente > 0 ? (totalCliente - totalInterno) / totalCliente : 0,
  }
}
