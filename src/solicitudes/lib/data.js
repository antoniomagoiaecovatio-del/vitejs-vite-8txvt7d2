import { MODO_DEMO, supabase } from '../../auth/auth'

export { MODO_DEMO }

// ---------------------------------------------------------------- datos

const ordenar = (lista, ...campos) =>
  [...lista].sort((a, b) => {
    for (const c of campos) {
      const r = String(a[c] ?? '').localeCompare(String(b[c] ?? ''), 'es')
      if (r) return r
    }
    return 0
  })

export async function cargarTodo() {
  if (MODO_DEMO) {
    const db = await demoDb()
    return {
      combustibles: [...db.combustibles].sort((a, b) => a.orden - b.orden),
      vehiculos: ordenar(db.vehiculos, 'modelo', 'patente'),
      personal: ordenar(db.personal, 'nombre'),
      ajustes: Object.fromEntries(db.ajustes.map((a) => [a.clave, a.valor])),
    }
  }
  const [c, v, p, a] = await Promise.all([
    supabase.from('combustibles').select('*').order('orden'),
    supabase.from('vehiculos').select('*'),
    supabase.from('personal').select('*'),
    supabase.from('ajustes').select('*'),
  ])
  for (const r of [c, v, p, a]) if (r.error) throw new Error(r.error.message)
  return {
    combustibles: c.data,
    vehiculos: ordenar(v.data, 'modelo', 'patente'),
    personal: ordenar(p.data, 'nombre'),
    ajustes: Object.fromEntries(a.data.map((x) => [x.clave, x.valor])),
  }
}

const DUPLICADO = {
  vehiculos: 'Ya existe un vehículo con esa patente',
  personal: 'Ya existe una persona con ese nombre',
}

async function guardar(tabla, fila, clave = 'id') {
  if (MODO_DEMO) return guardarDemo(tabla, fila, clave)
  const { data, error } = await supabase.from(tabla).upsert(fila, { onConflict: clave }).select().single()
  if (error) throw new Error(error.code === '23505' ? DUPLICADO[tabla] : error.message)
  return data
}

export const guardarVehiculo = (v) => guardar('vehiculos', v)
export const guardarPersona = (p) => guardar('personal', p)
export const guardarPrecio = (nombre, precio) =>
  guardar('combustibles', { nombre, precio, updated_at: new Date().toISOString() }, 'nombre')
export const guardarAjuste = (clave, valor) => guardar('ajustes', { clave, valor: String(valor) }, 'clave')

async function eliminar(tabla, id) {
  if (MODO_DEMO) {
    const db = await demoDb()
    db[tabla] = db[tabla].filter((x) => x.id !== id)
    localStorage.setItem('demo-db', JSON.stringify(db))
    return
  }
  const { error } = await supabase.from(tabla).delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export const eliminarVehiculo = (id) => eliminar('vehiculos', id)
export const eliminarPersona = (id) => eliminar('personal', id)

// ---------------------------------------------------------------- modo demo

async function demoDb() {
  const guardado = localStorage.getItem('demo-db')
  if (guardado) return JSON.parse(guardado)
  const { seed } = await import('./seed-demo.js')
  localStorage.setItem('demo-db', JSON.stringify(seed))
  return structuredClone(seed)
}

async function guardarDemo(tabla, fila, clave) {
  const db = await demoDb()
  const lista = db[tabla]
  const repetido =
    (tabla === 'vehiculos' && fila.patente && lista.some((x) => x.patente === fila.patente && x.id !== fila.id)) ||
    (tabla === 'personal' && lista.some((x) => x.nombre.toLowerCase() === fila.nombre.toLowerCase() && x.id !== fila.id))
  if (repetido) throw new Error(DUPLICADO[tabla])
  const i = fila[clave] != null ? lista.findIndex((x) => x[clave] === fila[clave]) : -1
  const guardada = i >= 0 ? { ...lista[i], ...fila } : { id: crypto.randomUUID(), activo: true, ...fila }
  if (i >= 0) lista[i] = guardada
  else lista.push(guardada)
  localStorage.setItem('demo-db', JSON.stringify(db))
  return guardada
}
