// Guardado de la configuración del presupuestador, compartida por todo el equipo (tabla `presupuestador_config`
// en Supabase, ver supabase-presupuestador.sql en la carpeta del panel). Los presupuestos en sí no se guardan.
//
// Si la tabla todavía no existe, la herramienta sigue funcionando con una copia local en el navegador y avisa.
import { MODO_DEMO, supabase } from '../../auth/auth'
import { CONFIG_INICIAL } from './config'

const CLAVE = 'parametros'
const LOCAL = 'presupuestador-config'

export class TablaFaltante extends Error {
  constructor() {
    super('La tabla presupuestador_config no existe todavía en Supabase')
    this.name = 'TablaFaltante'
  }
}

// Completa lo que falte con los valores iniciales (por si se agregan parámetros nuevos más adelante)
export function completar(c) {
  const base = structuredClone(CONFIG_INICIAL)
  if (!c || typeof c !== 'object') return base
  // (versiones anteriores guardaban también vehículos y precios de combustible: se descartan)
  const { vehiculos, precios, ...resto } = c
  void vehiculos
  void precios
  return { ...base, ...resto }
}

const leerLocal = () => {
  try {
    const t = localStorage.getItem(LOCAL)
    return t ? JSON.parse(t) : null
  } catch {
    return null
  }
}
const escribirLocal = (c) => {
  try {
    localStorage.setItem(LOCAL, JSON.stringify(c))
  } catch {
    /* ignorar */
  }
}

const tablaNoExiste = (error) => error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || ''))

/** @returns {{ config, origen: 'compartida' | 'local' | 'inicial', tablaFaltante: boolean }} */
export async function cargarConfig() {
  if (MODO_DEMO) {
    const l = leerLocal()
    return { config: completar(l), origen: l ? 'local' : 'inicial', tablaFaltante: false }
  }
  const { data, error } = await supabase.from('presupuestador_config').select('valor').eq('clave', CLAVE).maybeSingle()
  if (tablaNoExiste(error)) {
    const l = leerLocal()
    return { config: completar(l), origen: l ? 'local' : 'inicial', tablaFaltante: true }
  }
  if (error) throw new Error(error.message)
  if (!data) return { config: completar(null), origen: 'inicial', tablaFaltante: false }
  return { config: completar(data.valor), origen: 'compartida', tablaFaltante: false }
}

export async function guardarConfig(config) {
  if (MODO_DEMO) {
    escribirLocal(config)
    return
  }
  const { error } = await supabase
    .from('presupuestador_config')
    .upsert({ clave: CLAVE, valor: config, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
  if (tablaNoExiste(error)) {
    escribirLocal(config)
    throw new TablaFaltante()
  }
  if (error) throw new Error(error.message)
  escribirLocal(config)
}
