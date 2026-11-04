// Herramienta "Solicitudes de combustible y viáticos" (RPO 03 20 y RPS 01 02).
// Vino de la app independiente "solicitud-combustible" y quedó dentro del
// Panel de Obras Solares, en la sección Herramientas. Usa su propia base en
// Supabase y pide usuario y contraseña (el resto del panel no los necesita).
import React, { useCallback, useEffect, useState } from 'react'
import { RiLogoutBoxRLine, RiSettings3Line, RiGasStationLine, RiSuitcaseLine } from '@remixicon/react'
import { Toaster } from 'sonner'
import { Aviso, Button, Card, ConfirmProvider, Esqueleto } from './components/ui'
import { TabNavigation, TabNavigationLink } from './tremor/TabNavigation'
import Pedido from './components/Pedido'
import Config from './components/Config'
import Viaticos from './components/Viaticos'
import RequiereLogin from '../auth/RequiereLogin'
import { MODO_DEMO, cargarTodo } from './lib/data'

const PESTANAS = [
  ['pedido', 'Combustible', RiGasStationLine],
  ['viaticos', 'Viáticos', RiSuitcaseLine],
  ['config', 'Configuración', RiSettings3Line],
]

export default function Solicitudes() {
  return (
    <ConfirmProvider>
      <Toaster theme="dark" position="top-center" richColors closeButton />
      <RequiereLogin titulo="Solicitudes" subtitulo="Combustible y viáticos · acceso con usuario">
        {({ email, salir }) => <Contenido email={email} salir={salir} />}
      </RequiereLogin>
    </ConfirmProvider>
  )
}

function Contenido({ email, salir }) {
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
    recargar()
  }, [recargar])

  const cambiarVista = (id) => {
    setVista(id)
    try {
      sessionStorage.setItem('solicitudes-pestana', id)
    } catch {
      /* ignorar */
    }
  }

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">Solicitudes de combustible y viáticos</h2>
          <div className="truncate text-xs text-gray-400">
            Combustible RPO 03 20 · Viáticos RPS 01 02{MODO_DEMO && ' · modo demo'}
          </div>
        </div>
        <span className="hidden max-w-[14rem] truncate text-xs text-gray-400 sm:inline" title={email}>
          {email}
        </span>
        <Button variante="secundario" onClick={salir} aria-label="Salir">
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
