// Vehículos, consumos y precios de combustible del presupuestador: son los mismos que usa la herramienta
// "Solicitudes de combustible y viáticos" (se leen de su base en Supabase, así que si cambian allá, cambian acá).
// El Estimador de obras FV usa una copia fija de esos mismos datos (src/data/vehiculosCombustible.js): se usa
// solo como respaldo si no se pueden leer los de Solicitudes.
//
// Para presupuestar se agrupan por modelo (las 3 Fiat Fiorino son un solo ítem) y se dejan afuera los
// vehículos particulares, los bidones y los dados de baja.
import { MODO_DEMO, supabase } from '../../auth/auth'
import { cargarTodo } from '../../solicitudes/lib/data'
import { categoriaDe } from '../../solicitudes/lib/categorias'
import { VEHICULOS_FLOTA } from '../../data/vehiculosCombustible'

// Tipo de cambio fijo con el que se armó la copia del Estimador (precios en USD por litro)
const TC_RESPALDO = 1545

/**
 * @returns {Promise<{ vehiculos: {nombre, kmL, consumo, combustible, precioLitro}[], origen: 'solicitudes' | 'estimador' }>}
 *   consumo = litros cada 100 km; precioLitro = ARS por litro
 */
export async function cargarFlota() {
  try {
    let vehiculosDb
    let combustibles
    if (MODO_DEMO) {
      const t = await cargarTodo()
      vehiculosDb = t.vehiculos
      combustibles = t.combustibles
    } else {
      const [v, c] = await Promise.all([supabase.from('vehiculos').select('*'), supabase.from('combustibles').select('*')])
      if (v.error) throw new Error(v.error.message)
      if (c.error) throw new Error(c.error.message)
      vehiculosDb = v.data
      combustibles = c.data
    }
    const precios = Object.fromEntries(combustibles.map((c) => [c.nombre, Number(c.precio)]))
    const lista = agrupar(
      vehiculosDb
        .filter((v) => v.activo !== false && ['utilitario', 'camion'].includes(categoriaDe(v)) && Number(v.km_l) > 0 && precios[v.combustible] >= 0)
        .map((v) => ({ nombre: v.modelo, kmL: Number(v.km_l), combustible: v.combustible, precioLitro: precios[v.combustible] })),
    )
    if (lista.length) return { vehiculos: lista, origen: 'solicitudes' }
  } catch (e) {
    console.warn('No se pudo leer la flota de Solicitudes; se usa la copia del Estimador:', e)
  }
  return {
    vehiculos: agrupar(VEHICULOS_FLOTA.map((v) => ({ nombre: v.nombre, kmL: v.kmPorLitro, combustible: v.combustible, precioLitro: Math.round(v.precioLitroUsd * TC_RESPALDO) }))),
    origen: 'estimador',
  }
}

// Un ítem por modelo + consumo + combustible. Si un mismo modelo aparece más de una vez, se agrega lo que
// los distingue: primero el combustible y, si todavía quedan nombres iguales, también los km/l.
function agrupar(items) {
  const unicos = []
  for (const it of items) {
    if (!unicos.some((u) => u.nombre === it.nombre && u.kmL === it.kmL && u.combustible === it.combustible)) unicos.push(it)
  }
  const km = (v) => String(v).replace('.', ',')
  const contar = (lista) => lista.reduce((m, n) => ({ ...m, [n]: (m[n] || 0) + 1 }), {})
  const base = contar(unicos.map((u) => u.nombre))
  const conComb = unicos.map((u) => ({ ...u, etiqueta: base[u.nombre] > 1 ? `${u.nombre} (${u.combustible})` : u.nombre }))
  const conComb2 = contar(conComb.map((u) => u.etiqueta))
  return conComb
    .map((u) => ({
      ...u,
      nombre: conComb2[u.etiqueta] > 1 ? `${u.nombre} (${u.combustible}, ${km(u.kmL)} km/l)` : u.etiqueta,
      consumo: 100 / u.kmL,
    }))
    .map(({ etiqueta, ...v }) => {
      void etiqueta
      return v
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
