// Permisos por herramienta. Cada usuario (email de Supabase Auth) tiene una lista de herramientas autorizadas
// en la tabla `permisos_herramientas` (ver supabase-permisos.sql). El permiso 'admin' autoriza todo y permite
// administrar los accesos desde la pestaña "Accesos de usuarios".
//
// El bloqueo tiene dos capas: acá, en el panel (la herramienta no se abre), y en la base de datos
// (las políticas de seguridad rechazan leer o guardar datos a quien no está autorizado).
//
// Si la tabla todavía no existe (no se ejecutó supabase-permisos.sql), no se bloquea nada: así subir esta
// versión no deja a nadie afuera antes de tiempo.
import { MODO_DEMO, supabase } from './auth'

export const HERRAMIENTAS = [
  { id: 'solicitudes', nombre: 'Solicitudes de combustible y viáticos', corto: 'Solicitudes' },
  { id: 'cables', nombre: 'Dimensionamiento de cables', corto: 'Cables' },
  { id: 'presupuestador', nombre: 'Presupuestador de visitas postventa', corto: 'Presupuestador' },
]

const tablaNoExiste = (error) =>
  error && (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || ''))

// ── modo demo (solo desarrollo local): los permisos viven en localStorage
const DEMO = 'demo-permisos'
const DEMO_USUARIOS = ['maria.demo@ecovatio.com', 'juan.demo@ecovatio.com']
const leerDemo = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO) || '{}')
  } catch {
    return {}
  }
}
const escribirDemo = (o) => localStorage.setItem(DEMO, JSON.stringify(o))

/** @returns {Promise<{ herramientas: Set<string>, admin: boolean, sinTabla: boolean }>} */
export async function permisosDe(email) {
  const mail = String(email || '').trim().toLowerCase()
  if (MODO_DEMO) {
    const d = leerDemo()
    // Sin entrada guardada, el usuario demo es administrador (puede probar todo)
    const lista = d[mail] ?? ['admin']
    return { herramientas: new Set(lista), admin: lista.includes('admin'), sinTabla: false }
  }
  const { data, error } = await supabase.from('permisos_herramientas').select('herramienta').eq('email', mail)
  if (tablaNoExiste(error)) return { herramientas: new Set(), admin: false, sinTabla: true }
  if (error) throw new Error(error.message)
  const lista = data.map((r) => r.herramienta)
  return { herramientas: new Set(lista), admin: lista.includes('admin'), sinTabla: false }
}

export const tieneAcceso = (permisos, herramienta) =>
  !!permisos && (permisos.sinTabla || permisos.admin || permisos.herramientas.has(herramienta))

/** Para administradores: todos los usuarios con sus permisos. */
export async function listarUsuariosConPermisos(emailActual) {
  if (MODO_DEMO) {
    const d = leerDemo()
    const emails = [String(emailActual).toLowerCase(), ...DEMO_USUARIOS, ...Object.keys(d)].filter((e, i, a) => e && a.indexOf(e) === i)
    return emails.map((email) => ({
      email,
      ultimoAcceso: null,
      permisos: d[email] ?? (email === String(emailActual).toLowerCase() ? ['admin'] : []),
    }))
  }
  const [u, p] = await Promise.all([supabase.rpc('usuarios_panel'), supabase.from('permisos_herramientas').select('email, herramienta')])
  if (tablaNoExiste(u.error) || tablaNoExiste(p.error) || /usuarios_panel/.test(u.error?.message || '')) {
    const e = new Error('Falta ejecutar supabase-permisos.sql en Supabase')
    e.faltaSql = true
    throw e
  }
  if (u.error) throw new Error(u.error.message)
  if (p.error) throw new Error(p.error.message)
  const porEmail = {}
  p.data.forEach((r) => {
    ;(porEmail[r.email] ||= []).push(r.herramienta)
  })
  return u.data.map((x) => ({
    email: String(x.email || '').toLowerCase(),
    ultimoAcceso: x.ultimo_acceso,
    permisos: porEmail[String(x.email || '').toLowerCase()] || [],
  }))
}

export async function guardarPermiso(email, herramienta, activo) {
  const mail = String(email).trim().toLowerCase()
  if (MODO_DEMO) {
    const d = leerDemo()
    const actual = new Set(d[mail] ?? [])
    if (activo) actual.add(herramienta)
    else actual.delete(herramienta)
    d[mail] = [...actual]
    escribirDemo(d)
    return
  }
  if (activo) {
    const { error } = await supabase.from('permisos_herramientas').upsert({ email: mail, herramienta }, { onConflict: 'email,herramienta' })
    if (error) throw new Error(error.message)
  } else {
    const { error } = await supabase.from('permisos_herramientas').delete().eq('email', mail).eq('herramienta', herramienta)
    if (error) throw new Error(error.message)
  }
}
