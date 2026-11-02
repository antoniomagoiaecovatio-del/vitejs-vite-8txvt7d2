// Envuelve una herramienta con acceso restringido: pide email y contraseña y,
// una vez adentro, muestra la herramienta. La sesión vale para todas las
// herramientas restringidas del panel.
//   <RequiereLogin titulo="..." subtitulo="...">{({ email, salir }) => <Herramienta />}</RequiereLogin>
import React, { useEffect, useState } from 'react'
import { Aviso, Button, Campo, Card, Input } from '../solicitudes/components/ui'
import { CONFIG_FALTANTE, MODO_DEMO, login, logout, sesionActual } from './auth'

// Mismo degradé del encabezado del Panel de Obras Solares.
const DEGRADE = { background: 'linear-gradient(110deg, #123138 0%, #1d4a50 55%, #24604f 100%)' }

export default function RequiereLogin({ titulo, subtitulo, children }) {
  const [sesion, setSesion] = useState(undefined) // undefined = verificando

  useEffect(() => {
    if (!CONFIG_FALTANTE) sesionActual().then(setSesion)
  }, [])

  const salir = async () => {
    await logout()
    setSesion(null)
  }

  if (CONFIG_FALTANTE) {
    return (
      <Centro>
        <Aviso tipo="error">
          Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY) en las variables de entorno de
          Vercel de este proyecto.
        </Aviso>
      </Centro>
    )
  }
  if (sesion === undefined) return <Centro />
  if (!sesion) return <Login titulo={titulo} subtitulo={subtitulo} onEntrar={setSesion} />
  return children({ email: sesion.email, salir })
}

function Centro({ children }) {
  return <div className="flex min-h-[55vh] items-center justify-center p-4">{children}</div>
}

function Login({ titulo, subtitulo, onEntrar }) {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setEntrando(true)
    setError('')
    try {
      onEntrar(await login(email, clave))
    } catch (err) {
      setError(err.message)
      setEntrando(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10">
      <img src="/fotos/planta.jpg" alt="" className="foto-zoom absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[#0e2228]/80 backdrop-blur-[2px]" />
      <div className="relative">
        <Centro>
          <Card className="w-full max-w-sm overflow-hidden p-0 sm:p-0">
            <div className="flex items-center gap-3 px-6 py-4" style={DEGRADE}>
              <img src="/logo-ecovatio.png" alt="Ecovatio" className="h-7" />
              <div className="border-l border-white/15 pl-3">
                <div className="text-sm font-bold">{titulo}</div>
                <div className="text-xs text-gray-400">{subtitulo || 'Acceso con usuario y contraseña'}</div>
              </div>
            </div>
            <form onSubmit={entrar} className="space-y-4 p-6">
              <Campo label="Email">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  autoFocus
                />
              </Campo>
              <Campo label="Contraseña" error={error}>
                <Input
                  type="password"
                  value={clave}
                  onChange={(e) => setClave(e.target.value)}
                  autoComplete="current-password"
                  error={error}
                />
              </Campo>
              <Button
                type="submit"
                className="w-full"
                disabled={entrando || !email || !clave}
                isLoading={entrando}
                loadingText="Entrando…"
              >
                Entrar
              </Button>
              {MODO_DEMO && (
                <p className="text-xs text-gray-500">Modo demo local: cualquier email y la contraseña "demo".</p>
              )}
              <p className="text-center text-xs text-gray-500">
                ¿No tenés usuario? Pedíselo a quien administra el panel.
              </p>
            </form>
          </Card>
        </Centro>
      </div>
    </div>
  )
}
