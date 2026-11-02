// Herramienta "Dimensionamiento de conductores BT y FV".
// Vino de la app independiente "dimensionamiento-cables-app" (Next.js) y quedó
// dentro del Panel de Obras Solares, en Herramientas. Todo el cálculo corre en
// el navegador (no usa base de datos); el acceso se pide con usuario y contraseña.
import React from 'react'
import { RiFlashlightLine, RiLogoutBoxRLine } from '@remixicon/react'
import RequiereLogin from '../auth/RequiereLogin'
import { Button } from '../solicitudes/components/ui'
import { CableCalculator } from './components/CableCalculator'

const NORMAS = ['AEA 90364-7-771', 'AEA 90364-7-712', 'AEA 92559-3', 'IEC 60364-5-52', 'IRAM 2178-1 · 62266 · 62930']

export default function Cables() {
  return (
    <RequiereLogin titulo="Dimensionamiento de cables" subtitulo="Conductores BT y FV · acceso con usuario">
      {({ email, salir }) => (
        <div className="cables-root mx-auto max-w-[1400px] pb-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-[#95de1d] ring-1 ring-white/15">
              <RiFlashlightLine className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold tracking-tight">Dimensionamiento de conductores BT y FV</h2>
              <p className="text-[13px] text-gray-400">
                Sección, aislación, norma y especificación de la protección — por ampacidad, caída de tensión y
                cortocircuito
              </p>
            </div>
            <span className="hidden max-w-[14rem] truncate text-xs text-gray-400 sm:inline" title={email}>
              {email}
            </span>
            <Button variante="secundario" onClick={salir} aria-label="Salir">
              <RiLogoutBoxRLine className="size-4" />
              <span className="hidden sm:inline">Salir</span>
            </Button>
          </div>
          <ul className="mb-4 flex flex-wrap gap-1.5">
            {NORMAS.map((n) => (
              <li key={n} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-gray-300 ring-1 ring-white/15">
                {n}
              </li>
            ))}
          </ul>

          <CableCalculator />

          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            Valores de referencia tomados de catálogos técnicos de fabricantes (cables 0,6/1 kV IRAM 2178-1 e IRAM
            62266 y cable solar IRAM 62930). Gráficos con Apache ECharts. Herramienta de predimensionamiento: el
            cálculo debe verificarse manualmente, compararse con el datasheet del proveedor del cable y ser validado
            por un profesional habilitado.
          </p>
        </div>
      )}
    </RequiereLogin>
  )
}
