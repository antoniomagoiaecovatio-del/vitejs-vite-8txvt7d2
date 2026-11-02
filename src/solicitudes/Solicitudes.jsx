// Herramienta "Solicitudes de combustible y viáticos" (RPO 03 20 y RPS 01 02).
// Vino de la app independiente "solicitud-combustible" y quedó dentro del
// Panel de Obras Solares, en la sección Herramientas. Usa su propia base en
// Supabase y pide clave para entrar (el resto del panel no la necesita).
import React, { useCallback, useEffect, useState } from 'react'
import { RiLogoutBoxRLine, RiSettings3Line, RiGasStationLine, RiSuitcaseLine } from '@remixicon/react'
import { Toaster } from 'sonner'
import { Aviso, Button, Campo, Card, ConfirmProvider, Esqueleto, Input } from './components/ui'
import { TabNavigation, TabNavigationLink } from './tremor/TabNavigation'
import Pedido from './components/Pedido'
import Config from './components/Config'
import Viaticos from './components/Viaticos'
import { CONFIG_FALTANTE, MODO_DEMO, cargarTodo, haySesion, login, logout } from './lib/data'

const PESTANAS = [
  ['pedido', 'Combustible', RiGasStationLine],
  ['viaticos', 'Viáticos', RiSuitcaseLine],
  ['config', 'Configuración', RiSettings3Line],
]

// Mismo degradé del encabezado del Panel de Obras Solares.
const DEGRADE = { background: 'linear-gradient(110deg, #123138 0%, #1d4a50 55%, #24604f 100%)' }

export default function Solicitudes() {
  return (
    <ConfirmProvider>
      <Toaster theme="dark" position="top-center" richColors closeButton />
      <Contenido />
    </ConfirmProvider>
  )
}

function Contenido() {
  const [sesion, setSesion] = useState(null) // null = verificando
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [vista, setVista] = useState(() => {
    try {
      return sessionStorage.getItem('solicitudes-pestana') || 'pedido'
    } catch {
      return 'pedido'
    }
  })

  const recargar = useCallback(async () => {
    try {
      setDatos(await cargarTodo())
      setError('')
    } catch (e) {
      setError('No se pudieron cargar los datos: ' + e.message)
    }
  }, [])

  useEffect(() => {
    if (!CONFIG_FALTANTE) haySesion().then(setSesion)
  }, [])

  useEffect(() => {
    if (sesion) recargar()
  }, [sesion, recargar])

  const cambiarVista = (id) => {
    setVista(id)
    try {
      sessionStorage.setItem('solicitudes-pestana', id)
    } catch {
      /* ignorar */
    }
  }

  if (CONFIG_FALTANTE) {
    return (
      <Centro>
        <Aviso tipo="error">
          Falta configurar Supabase (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY y VITE_LOGIN_EMAIL) en las variables de
          entorno de Vercel de este proyecto.
        </Aviso>
      </Centro>
    )
  }
  if (sesion === null) return <Centro />
  if (!sesion) return <Login onEntrar={() => setSesion(true)} />

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">Solicitudes de combustible y viáticos</h2>
          <div className="truncate text-xs text-gray-400">
            Combustible RPO 03 20 · Viáticos RPS 01 02{MODO_DEMO && ' · modo demo'}
          </div>
        </div>
        <Button
          variante="secundario"
          onClick={async () => {
            await logout()
            setSesion(false)
            setDatos(null)
          }}
          aria-label="Salir"
        >
          <RiLogoutBoxRLine className="size-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>

      <TabNavigation>
        {PESTANAS.map(([id, texto, Icono]) => (
          <TabNavigationLink key={id} active={vista === id} onClick={() => cambiarVista(id)} className="cursor-pointer gap-1.5">
            <Icono className="size-4" aria-hidden="true" />
            {texto}
          </TabNavigationLink>
        ))}
      </TabNavigation>

      <div className="pt-5">
        {error && (
          <div className="mb-4">
            <Aviso tipo="error">{error}</Aviso>
          </div>
        )}
        {!datos ? (
          !error && <Cargando />
        ) : vista === 'pedido' ? (
          <Pedido datos={datos} onVehiculoNuevo={(v) => setDatos((d) => ({ ...d, vehiculos: [...d.vehiculos, v] }))} />
        ) : vista === 'viaticos' ? (
          <Viaticos datos={datos} />
        ) : (
          <Config datos={datos} onCambio={recargar} />
        )}
      </div>
    </div>
  )
}

function Cargando() {
  return (
    <div className="space-y-4" aria-label="Cargando">
      {[0, 1].map((i) => (
        <Card key={i} className="space-y-3">
          <Esqueleto className="h-4 w-32" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Esqueleto className="h-9" />
            <Esqueleto className="h-9" />
            <Esqueleto className="h-9" />
            <Esqueleto className="h-9" />
          </div>
        </Card>
      ))}
    </div>
  )
}

function Centro({ children }) {
  return <div className="flex min-h-[55vh] items-center justify-center p-4">{children}</div>
}

function Login({ onEntrar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function entrar(e) {
    e.preventDefault()
    setEntrando(true)
    setError('')
    try {
      await login(clave)
      onEntrar()
    } catch (err) {
      setError(err.message)
    } finally {
      setEntrando(false)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10">
      <img src="/fotos/planta.jpg" alt="" className="foto-zoom absolute inset-0 size-full object-cover" />
      <div className="absolute inset-0 bg-[#0e2228]/80 backdrop-blur-[2px]" />
      <div className="relative">
        <LoginCard
          clave={clave}
          setClave={setClave}
          error={error}
          entrando={entrando}
          entrar={entrar}
        />
      </div>
    </div>
  )
}

function LoginCard({ clave, setClave, error, entrando, entrar }) {
  return (
    <Centro>
      <Card className="w-full max-w-sm overflow-hidden p-0 sm:p-0">
        <div className="flex items-center gap-3 px-6 py-4" style={DEGRADE}>
          <img src="/logo-ecovatio.png" alt="Ecovatio" className="h-7" />
          <div className="border-l border-white/15 pl-3">
            <div className="text-sm font-bold">Solicitudes</div>
            <div className="text-xs text-gray-400">Combustible y viáticos · acceso con clave</div>
          </div>
        </div>
        <form onSubmit={entrar} className="space-y-4 p-6">
          <Campo label="Clave" error={error}>
            <Input type="password" value={clave} onChange={(e) => setClave(e.target.value)} autoFocus error={error} />
          </Campo>
          <Button type="submit" className="w-full" disabled={entrando || !clave} isLoading={entrando} loadingText="Entrando…">
            Entrar
          </Button>
          {MODO_DEMO && <p className="text-xs text-gray-500">Modo demo local: la clave es "demo".</p>}
        </form>
      </Card>
    </Centro>
  )
}
