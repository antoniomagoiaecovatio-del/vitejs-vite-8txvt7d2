// Cálculos de la Solicitud de Viáticos (RPS 01 02).
//
// - Duración: se cuentan el primer y el último día (viaje en el día = 1).
// - Viático automático por persona según sus días:
//     1 día  → tarifa "en el día"
//     N días → (N-1) × tarifa "con pernocte" + tarifa "día de regreso"
// - "Otro monto": un valor por día en pesos o en USD (× tipo de cambio).
// - La comisión de la tarjeta prepaga (8%) va incluida en cada monto.
// - Todo redondeado a pesos enteros.

export const TARIFAS_DEFECTO = { dia: 10000, regreso: 20000, pernocte: 30000, comision: 8 }

export function tarifasDe(ajustes = {}) {
  const n = (clave, def) => {
    const v = Number(ajustes[clave])
    return v > 0 || (clave === 'comision_transferencia' && v === 0) ? v : def
  }
  return {
    dia: n('viatico_dia', TARIFAS_DEFECTO.dia),
    regreso: n('viatico_regreso', TARIFAS_DEFECTO.regreso),
    pernocte: n('viatico_pernocte', TARIFAS_DEFECTO.pernocte),
    comision: n('comision_transferencia', TARIFAS_DEFECTO.comision),
  }
}

// Montos tipeados: "10.000" o "10000" → 10000; "12,5" → 12.5.
export const parseMonto = (s) => {
  const t = String(s ?? '').trim()
  if (!t || t === '-') return null
  const n = Number(t.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export const conComision = (monto, pct) => Math.round(monto * (1 + pct / 100))

export function diasEntre(inicioISO, finISO) {
  if (!inicioISO || !finISO) return null
  const a = Date.UTC(...inicioISO.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)))
  const b = Date.UTC(...finISO.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)))
  const d = Math.round((b - a) / 86400000) + 1
  return d >= 1 ? d : null
}

// Valor por día del modo "Otro monto", en pesos y sin comisión.
export function diarioManualARS({ moneda, monto, tipoCambio }) {
  const m = parseMonto(monto)
  if (!(m > 0)) return null
  if (moneda !== 'USD') return Math.round(m)
  const tc = parseMonto(tipoCambio)
  return tc > 0 ? Math.round(m * tc) : null
}

// Monto de viático de una persona (con comisión), sin el ajuste.
export function viaticoPersona({ dias, modo, t, diarioManual }) {
  if (!(dias >= 1)) return null
  if (modo === 'manual') return diarioManual ? dias * conComision(diarioManual, t.comision) : null
  if (dias === 1) return conComision(t.dia, t.comision)
  return (dias - 1) * conComision(t.pernocte, t.comision) + conComision(t.regreso, t.comision)
}

// "Ana María Pérez" + apellido "Pérez" → "Pérez, Ana María".
// Sin apellido cargado se toma la última palabra.
export function apellidoNombre(persona) {
  if (!persona) return ''
  const nombre = persona.nombre.trim().replace(/\s+/g, ' ')
  const apellido = (persona.apellido ?? '').trim().replace(/\s+/g, ' ')
  if (!apellido) {
    const partes = nombre.split(' ')
    const ultimo = partes.pop()
    return partes.length ? `${ultimo}, ${partes.join(' ')}` : ultimo
  }
  const n = nombre.toLowerCase()
  const a = apellido.toLowerCase()
  let nombres = nombre
  if (n.endsWith(a)) nombres = nombre.slice(0, nombre.length - apellido.length).trim()
  else if (n.startsWith(a)) nombres = nombre.slice(apellido.length).trim()
  return nombres ? `${apellido}, ${nombres}` : apellido
}
