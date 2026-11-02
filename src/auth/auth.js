// Acceso con usuario y contraseña a las herramientas restringidas del panel
// (Solicitudes y Dimensionamiento de cables). Usa Supabase Auth: cada persona
// tiene su email y contraseña (se crean desde el panel de Supabase) y la sesión
// vale para todas las herramientas con acceso restringido.
import { createClient } from '@supabase/supabase-js'

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sin credenciales de Supabase y en `npm run dev` se usa un modo demo,
// solo para desarrollo local (cualquier email, contraseña "demo").
export const MODO_DEMO = !URL || !KEY
export const CONFIG_FALTANTE = MODO_DEMO && !import.meta.env.DEV

export const supabase = MODO_DEMO ? null : createClient(URL, KEY)

export async function sesionActual() {
  if (MODO_DEMO) {
    const email = sessionStorage.getItem('demo-sesion')
    return email ? { email } : null
  }
  const { data } = await supabase.auth.getSession()
  return data.session ? { email: data.session.user.email } : null
}

export async function login(email, password) {
  if (MODO_DEMO) {
    if (password !== 'demo') throw new Error('Contraseña incorrecta (modo demo: "demo")')
    sessionStorage.setItem('demo-sesion', email)
    return { email }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) {
    throw new Error(
      error.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : error.message
    )
  }
  return { email: data.user.email }
}

export async function logout() {
  if (MODO_DEMO) return sessionStorage.removeItem('demo-sesion')
  await supabase.auth.signOut()
}
