// Herramienta "Presupuestador de visitas e intervenciones postventa".
// Reemplaza a la planilla Presupuestador_PostVenta: se cargan los datos de la visita, se calcula el costo interno
// y el precio para el cliente (con la ganancia), y se descargan el PDF del cliente, el PDF interno y el Excel.
// Pide usuario y contraseña (muestra costos y ganancia). Los presupuestos no se guardan; la configuración sí,
// compartida por todo el equipo (ver lib/datos.js).
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  RiLogoutBoxRLine, RiFileTextLine, RiSettings3Line, RiFilePdf2Line, RiFileExcel2Line, RiAddLine, RiSaveLine,
  RiRestartLine, RiEyeOffLine,
} from '@remixicon/react'
import { Toaster, toast } from 'sonner'
import RequiereLogin from '../auth/RequiereLogin'
import { MODO_DEMO } from '../auth/auth'
import { Aviso, Button, Campo, Card, Input, Segmentado, Select, Seccion, cx } from '../solicitudes/components/ui'
import { TabNavigation, TabNavigationLink } from '../solicitudes/tremor/TabNavigation'
import { calcular, num } from './lib/calculo'
import { CONFIG_INICIAL, FILAS_REPUESTOS, TIPOS_SERVICIO, datosVacios } from './lib/config'
import { cargarFlota } from './lib/flota'
import { cargarConfig, guardarConfig, TablaFaltante } from './lib/datos'
import { etiquetas } from './lib/etiquetas'
import { f0, f1, f2, hoyISO, usd } from './lib/formato'

// El borrador vive mientras la pestaña del navegador esté abierta (no se guarda en ningún lado)
let borrador = null

const PESTANAS = [
  ['presupuesto', 'Presupuesto', RiFileTextLine],
  ['config', 'Configuración', RiSettings3Line],
]

export default function Presupuestador() {
  return (
    <>
      <Toaster theme="dark" position="top-center" richColors closeButton />
      <RequiereLogin titulo="Presupuestador postventa" subtitulo="Visitas e intervenciones · acceso con usuario">
        {({ email, salir }) => <Contenido email={email} salir={salir} />}
      </RequiereLogin>
    </>
  )
}

function Contenido({ email, salir }) {
  const [vista, setVista] = useState('presupuesto')
  const [cfgEstado, setCfgEstado] = useState(null) // { config, origen, tablaFaltante }
  const [flota, setFlota] = useState(null) // { vehiculos, origen } (de Solicitudes)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarConfig()
      .then((r) => setCfgEstado(r))
      .catch((e) => setError('No se pudo cargar la configuración: ' + e.message))
    cargarFlota().then(setFlota)
  }, [])

  return (
    <div className="mx-auto max-w-[1400px] pb-10">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">Presupuestador de visitas e intervenciones postventa</h2>
          <div className="truncate text-xs text-gray-400">Presupuesto interno, presupuesto para el cliente y Excel{MODO_DEMO && ' · modo demo'}</div>
        </div>
        <span className="hidden max-w-[14rem] truncate text-xs text-gray-400 sm:inline" title={email}>{email}</span>
        <Button variante="secundario" onClick={salir} aria-label="Salir">
          <RiLogoutBoxRLine className="size-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>

      <TabNavigation>
        {PESTANAS.map(([id, texto, Icono]) => (
          <TabNavigationLink key={id} active={vista === id} onClick={() => setVista(id)} className="cursor-pointer gap-1.5">
            <Icono className="size-4" aria-hidden="true" />
            {texto}
          </TabNavigationLink>
        ))}
      </TabNavigation>

      <div className="pt-5">
        {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}
        {cfgEstado?.tablaFaltante && (
          <Aviso tipo="alerta" className="mb-4">
            La configuración compartida todavía no está creada en Supabase (falta la tabla <b>presupuestador_config</b>). Mientras tanto, los cambios
            se guardan solo en este navegador. Para compartirla con todo el equipo hay que ejecutar una vez el archivo{' '}
            <b>supabase-presupuestador.sql</b> en el editor SQL de Supabase.
          </Aviso>
        )}
        {flota?.origen === 'estimador' && (
          <Aviso tipo="alerta" className="mb-4">
            No se pudieron leer los vehículos de Solicitudes: se usa la copia del Estimador de obras FV (puede estar desactualizada).
          </Aviso>
        )}
        {!cfgEstado || !flota ? (
          !error && <div className="py-10 text-center text-sm text-gray-400">Cargando…</div>
        ) : vista === 'presupuesto' ? (
          <PestanaPresupuesto config={cfgEstado.config} flota={flota.vehiculos} irAConfig={() => setVista('config')} />
        ) : (
          <PestanaConfig
            estado={cfgEstado}
            flota={flota}
            onGuardada={(config, tablaFaltante) => setCfgEstado({ config, origen: tablaFaltante ? 'local' : 'compartida', tablaFaltante })}
          />
        )}
      </div>
    </div>
  )
}

// ───────────────────────────── campos ─────────────────────────────

// Número escrito con coma o punto; solo deja dígitos, coma y punto
function Numero({ value, onChange, ...props }) {
  return (
    <Input
      inputMode="decimal"
      value={value}
      onChange={(ev) => onChange(ev.target.value.replace(/[^\d.,]/g, ''))}
      {...props}
    />
  )
}

// Como Campo, pero con div: sirve para grupos de botones (un label haría clic en el primer botón)
function Grupo({ label, ayuda, children, className }) {
  return (
    <div className={className}>
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-gray-500">{ayuda}</span>}
    </div>
  )
}

function Fila({ rotulo, detalle, valor, tenue, fuerte }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-800 py-1.5 last:border-0">
      <div className="min-w-0">
        <div className={cx('text-sm', fuerte ? 'font-bold text-gray-50' : tenue ? 'text-gray-500' : 'text-gray-200')}>{rotulo}</div>
        {detalle && <div className="truncate text-[11px] text-gray-500">{detalle}</div>}
      </div>
      <div className={cx('shrink-0 tabular-nums', fuerte ? 'text-sm font-bold text-gray-50' : tenue ? 'text-sm text-gray-500' : 'text-sm font-semibold text-gray-100')}>{valor}</div>
    </div>
  )
}

// ───────────────────────────── presupuesto ─────────────────────────────

function PestanaPresupuesto({ config, flota, irAConfig }) {
  const [d, setD] = useState(() => borrador || datosVacios(hoyISO()))
  const [generando, setGenerando] = useState('')
  const [confirmaNuevo, setConfirmaNuevo] = useState(false)
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }))
  useEffect(() => {
    borrador = d
  }, [d])

  const lab = etiquetas(d.tipo)
  const calc = useMemo(() => calcular(d, config, flota), [d, config, flota])
  const vehiculos = flota
  const hayVehiculo = vehiculos.some((v) => v.nombre === d.vehiculo)

  // Filas de repuestos visibles: hasta la última usada + 1 (mínimo 4)
  const ultimaUsada = d.repuestos.reduce((u, r, i) => (r.desc || r.cant || r.precio ? i : u), -1)
  const [extra, setExtra] = useState(0)
  const visibles = Math.min(FILAS_REPUESTOS, Math.max(4, ultimaUsada + 2 + extra))
  const setFila = (i, campo, valor) => setD((p) => ({ ...p, repuestos: p.repuestos.map((r, k) => (k === i ? { ...r, [campo]: valor } : r)) }))

  const validezTexto = String(d.validez || '').trim() ? `Presupuesto válido por ${String(d.validez).trim()} días a partir de la fecha de emisión.` : ''
  const faltan = []
  if (!String(d.cliente).trim()) faltan.push('el cliente')
  if (!String(d.obra).trim()) faltan.push('la obra')

  const generar = async (que) => {
    setGenerando(que)
    try {
      if (que === 'cliente') {
        const { descargarPdfCliente } = await import('./lib/pdf')
        await descargarPdfCliente({ d, calc })
      } else if (que === 'interno') {
        const { descargarPdfInterno } = await import('./lib/pdf')
        await descargarPdfInterno({ d, calc, config })
      } else {
        const { descargarExcel } = await import('./lib/excel')
        await descargarExcel({ d, config, flota, validezTexto: validezTexto.replace(/\.$/, ''), notas: d.notas.filter((n) => String(n).trim()) })
      }
    } catch (e) {
      console.error(e)
      toast.error('No se pudo generar el archivo: ' + e.message)
    } finally {
      setGenerando('')
    }
  }

  const nuevo = () => {
    setD(datosVacios(hoyISO()))
    setExtra(0)
    setConfirmaNuevo(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_390px]">
      {/* ─────────── formulario ─────────── */}
      <div className="grid min-w-0 gap-4">
        <Seccion titulo="1 · Datos del proyecto">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Cliente"><Input value={d.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Nombre del cliente" /></Campo>
            <Campo label="Fecha del presupuesto"><Input type="date" value={d.fecha} onChange={(e) => set('fecha', e.target.value)} /></Campo>
            <Campo label="Obra / ubicación"><Input value={d.obra} onChange={(e) => set('obra', e.target.value)} placeholder="Descripción de la obra o dirección" /></Campo>
            <Grupo label="Tipo de servicio">
              <Segmentado opciones={TIPOS_SERVICIO.map((t) => [t, t])} valor={d.tipo} onCambio={(t) => set('tipo', t)} />
            </Grupo>
            <Campo label="Descripción del servicio" className="sm:col-span-2">
              <Input value={d.descripcion} onChange={(e) => set('descripcion', e.target.value)} placeholder="Detalle breve del servicio a realizar" />
            </Campo>
          </div>
        </Seccion>

        <Seccion titulo="2 · Traslado y logística">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo label="Vehículo">
              <Select value={hayVehiculo ? d.vehiculo : ''} onChange={(e) => set('vehiculo', e.target.value)}>
                <option value="">— Elegir —</option>
                {vehiculos.map((v) => <option key={v.nombre} value={v.nombre}>{v.nombre}</option>)}
              </Select>
            </Campo>
            <Campo label="Distancia total ida y vuelta (km)"><Numero value={d.km} onChange={(v) => set('km', v)} placeholder="Ej: 140" /></Campo>
            <Campo label="Cantidad de peajes"><Numero value={d.peajes} onChange={(v) => set('peajes', v)} placeholder="Ej: 2" /></Campo>
          </div>
          {calc.veh && (
            <p className="mt-2 text-xs text-gray-500">
              {calc.veh.nombre}: {f1.format(calc.veh.kmL)} km/l ({f1.format(calc.veh.consumo)} L/100 km) con {calc.veh.combustible} a ARS {f0.format(calc.precioLitro)} por litro.
              {calc.litros > 0 && <> Consumo estimado del viaje: <b className="text-gray-300">{f1.format(calc.litros)} litros</b>.</>}
            </p>
          )}
        </Seccion>

        <div className="grid gap-4 md:grid-cols-2">
          <Seccion titulo="3 · Personal">
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Ingenieros (cantidad)"><Numero value={d.ingenieros} onChange={(v) => set('ingenieros', v)} /></Campo>
              <Campo label="Días de ingenieros"><Numero value={d.diasIngenieros} onChange={(v) => set('diasIngenieros', v)} /></Campo>
              <Campo label="Técnicos (cantidad)"><Numero value={d.tecnicos} onChange={(v) => set('tecnicos', v)} /></Campo>
              <Campo label="Días de técnicos" ayuda="Se admiten fracciones, ej: 1,5"><Numero value={d.diasTecnicos} onChange={(v) => set('diasTecnicos', v)} /></Campo>
            </div>
          </Seccion>
          <Seccion titulo="4 · Estadía">
            <div className="grid gap-3">
              <Campo label="Noches de alojamiento" ayuda="Se cobra por cada persona (ingenieros + técnicos)."><Numero value={d.noches} onChange={(v) => set('noches', v)} /></Campo>
              <Grupo label="Incluir viáticos"><Segmentado opciones={[['si', 'Sí'], ['no', 'No']]} valor={d.viaticos ? 'si' : 'no'} onCambio={(v) => set('viaticos', v === 'si')} /></Grupo>
            </div>
          </Seccion>
        </div>

        <Seccion titulo={`5 · ${lab.hojaTitulo}`}>
          <p className="mb-3 text-xs text-gray-400">{lab.hojaAyuda} El precio se carga a <b className="text-gray-300">costo</b>: el presupuesto del cliente le suma la ganancia.</p>
          <div className="overflow-x-auto">
            <div className="grid min-w-[34rem] grid-cols-[minmax(0,1fr)_5rem_7rem_6.5rem] gap-x-2 gap-y-1.5">
              <div className="text-[11px] font-medium text-gray-500">{lab.colDesc}</div>
              <div className="text-right text-[11px] font-medium text-gray-500">Cantidad</div>
              <div className="text-right text-[11px] font-medium text-gray-500">{lab.colPrecio}</div>
              <div className="text-right text-[11px] font-medium text-gray-500">Total (USD)</div>
              {d.repuestos.slice(0, visibles).map((r, i) => (
                <React.Fragment key={i}>
                  <Input value={r.desc} onChange={(e) => setFila(i, 'desc', e.target.value)} aria-label={`Descripción ${i + 1}`} />
                  <Numero value={r.cant} onChange={(v) => setFila(i, 'cant', v)} className="text-right" aria-label={`Cantidad ${i + 1}`} />
                  <Numero value={r.precio} onChange={(v) => setFila(i, 'precio', v)} className="text-right" aria-label={`Costo unitario ${i + 1}`} />
                  <div className="flex items-center justify-end text-sm tabular-nums text-gray-300">{calc.filas[i].total !== null ? f2.format(calc.filas[i].total) : ''}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {visibles < FILAS_REPUESTOS ? (
              <Button variante="secundario" onClick={() => setExtra((x) => x + 3)}><RiAddLine className="size-4" />Agregar filas</Button>
            ) : <span className="text-xs text-gray-500">Máximo {FILAS_REPUESTOS} filas.</span>}
            <div className="text-sm text-gray-300">Total a costo: <b className="tabular-nums text-gray-50">{usd(calc.repuestos)}</b></div>
          </div>
        </Seccion>

        <Seccion titulo="6 · Condiciones del documento">
          <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <Campo label="Validez (días)" ayuda="Aparece en el PDF del cliente."><Numero value={d.validez} onChange={(v) => set('validez', v)} /></Campo>
            <Campo label="Notas del PDF (una por línea)" ayuda="La validez se agrega sola como segunda nota.">
              <textarea
                rows={3}
                value={d.notas.join('\n')}
                onChange={(e) => set('notas', e.target.value.split('\n'))}
                className="w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-brand"
              />
            </Campo>
          </div>
        </Seccion>
      </div>

      {/* ─────────── resumen ─────────── */}
      <div className="grid min-w-0 gap-4 lg:sticky lg:top-3">
        <Card className="border-brand/40">
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">Precio para el cliente</div>
          <div className="text-3xl font-bold tabular-nums text-brand">{usd(calc.totalCliente)}</div>
          <div className="text-xs text-gray-400">Sin I.V.A. · incluye {f0.format(calc.g * 100)} % de ganancia</div>
          <div className="mt-3 border-t border-gray-800 pt-2">
            <Fila rotulo={lab.conceptoServicio} detalle="Traslado, peajes, mano de obra, viáticos y alojamiento" valor={usd(calc.servicioCliente)} />
            <Fila rotulo={lab.conceptoItems} valor={usd(calc.repuestosCliente)} tenue={calc.repuestos === 0} />
          </div>
          <div className="mt-4 grid gap-2">
            <Button onClick={() => generar('cliente')} disabled={!!generando}>
              <RiFilePdf2Line className="size-4" />{generando === 'cliente' ? 'Generando…' : 'PDF para el cliente'}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variante="secundario" onClick={() => generar('interno')} disabled={!!generando}>
                <RiFilePdf2Line className="size-4" />{generando === 'interno' ? 'Generando…' : 'PDF interno'}
              </Button>
              <Button variante="secundario" onClick={() => generar('excel')} disabled={!!generando}>
                <RiFileExcel2Line className="size-4" />{generando === 'excel' ? 'Generando…' : 'Excel'}
              </Button>
            </div>
            {faltan.length > 0 && <p className="text-[11px] text-amber-300">Falta cargar {faltan.join(' y ')}: saldrá vacío en el PDF.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Presupuesto interno (USD)</div>
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-300"><RiEyeOffLine className="size-3.5" />Solo interno</span>
          </div>
          <Fila rotulo="Combustible" detalle={calc.veh ? `${calc.veh.nombre} · ${f1.format(calc.litros)} L` : 'Elegí un vehículo'} valor={f2.format(calc.combustible)} tenue={calc.combustible === 0} />
          <Fila rotulo="Peajes" valor={f2.format(calc.peajes)} tenue={calc.peajes === 0} />
          <Fila rotulo="Mano de obra · Ingenieros" detalle={`${f2.format(calc.jornadasIng)} jornadas`} valor={f2.format(calc.moIng)} tenue={calc.moIng === 0} />
          <Fila rotulo="Mano de obra · Técnicos" detalle={`${f2.format(calc.jornadasTec)} jornadas`} valor={f2.format(calc.moTec)} tenue={calc.moTec === 0} />
          <Fila rotulo="Alojamiento" valor={f2.format(calc.alojamiento)} tenue={calc.alojamiento === 0} />
          <Fila rotulo="Viáticos" detalle={d.viaticos ? undefined : 'No incluidos'} valor={f2.format(calc.viaticos)} tenue={calc.viaticos === 0} />
          <Fila rotulo={lab.internoItems} valor={f2.format(calc.repuestos)} tenue={calc.repuestos === 0} />
          <div className="mt-2 rounded-md bg-gray-950 px-3 py-2">
            <Fila rotulo="Total interno (costo)" valor={usd(calc.totalInterno)} fuerte />
            <Fila rotulo={`Total con ${f0.format(calc.g * 100)} % de ganancia`} valor={usd(calc.totalConGanancia)} fuerte />
            <Fila rotulo="Ganancia" detalle={`Margen sobre el precio: ${f1.format(calc.margenSobrePrecio * 100)} %`} valor={usd(calc.ganancia)} />
          </div>
          <p className="mt-2 text-[11px] text-gray-500">
            Tipo de cambio ARS {f0.format(calc.tc)} por USD. Los parámetros se cambian en <button type="button" onClick={irAConfig} className="underline hover:text-gray-300">Configuración</button>.
          </p>
        </Card>

        <div>
          {confirmaNuevo ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2">
              <span className="text-sm text-red-200">¿Borrar todo lo cargado?</span>
              <Button variante="peligro" onClick={nuevo}>Sí, empezar de nuevo</Button>
              <Button variante="fantasma" onClick={() => setConfirmaNuevo(false)}>Cancelar</Button>
            </div>
          ) : (
            <Button variante="secundario" className="w-full" onClick={() => setConfirmaNuevo(true)}>
              <RiRestartLine className="size-4" />Nuevo presupuesto
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ───────────────────────────── configuración ─────────────────────────────

function PestanaConfig({ estado, flota, onGuardada }) {
  const [c, setC] = useState(() => structuredClone(estado.config))
  const [guardando, setGuardando] = useState(false)
  const original = useMemo(() => JSON.stringify(estado.config), [estado.config])
  const cambiado = JSON.stringify(c) !== original
  const set = (k, v) => setC((p) => ({ ...p, [k]: v }))
  const problemas = []
  if (!(num(c.tipoCambio) > 0)) problemas.push('El tipo de cambio tiene que ser mayor que cero.')
  if (num(c.ganancia) === null || num(c.ganancia) < 0) problemas.push('La ganancia no puede ser negativa.')

  const guardar = async () => {
    setGuardando(true)
    try {
      await guardarConfig(c)
      onGuardada(c, false)
      toast.success('Configuración guardada para todo el equipo')
    } catch (e) {
      if (e instanceof TablaFaltante) {
        onGuardada(c, true)
        toast.warning('Se guardó solo en este navegador: falta crear la tabla compartida en Supabase')
      } else toast.error('No se pudo guardar: ' + e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid max-w-5xl gap-4">
      <Aviso tipo="info">
        Estos valores se usan en todos los presupuestos y los ve todo el equipo. Cada cambio se aplica a los presupuestos nuevos y a los que estén abiertos,
        una vez guardado.{estado.origen === 'inicial' && ' Por ahora están los valores iniciales de la planilla.'}
      </Aviso>

      <div className="grid gap-4 md:grid-cols-2">
        <Seccion titulo="Parámetros generales">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Tipo de cambio (ARS por USD)"><Numero value={c.tipoCambio} onChange={(v) => set('tipoCambio', v)} /></Campo>
            <Campo label="Ganancia (% sobre el costo)" ayuda="Recargo: costo × (1 + %)."><Numero value={c.ganancia} onChange={(v) => set('ganancia', v)} /></Campo>
          </div>
        </Seccion>
        <Seccion titulo="Mano de obra (USD por día)">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Ingeniero"><Numero value={c.moIngenieroUsd} onChange={(v) => set('moIngenieroUsd', v)} /></Campo>
            <Campo label="Técnico"><Numero value={c.moTecnicoUsd} onChange={(v) => set('moTecnicoUsd', v)} /></Campo>
          </div>
        </Seccion>
        <Seccion titulo="Costos en pesos (ARS)">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo label="Viático por persona / día"><Numero value={c.viaticoDia} onChange={(v) => set('viaticoDia', v)} /></Campo>
            <Campo label="Alojamiento por persona / noche"><Numero value={c.alojamientoNoche} onChange={(v) => set('alojamientoNoche', v)} /></Campo>
            <Campo label="Peaje por unidad"><Numero value={c.peaje} onChange={(v) => set('peaje', v)} /></Campo>
          </div>
        </Seccion>
      </div>

      <Seccion titulo="Vehículos, consumos y combustible">
        <p className="mb-3 text-xs text-gray-400">
          Son los mismos de la herramienta <b className="text-gray-300">Solicitudes de combustible y viáticos</b>: si cambian allá (un precio, un vehículo nuevo o un
          consumo), cambian acá solos. Se editan en Solicitudes → Configuración.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left text-[11px] font-medium text-gray-500">
                <th className="py-1.5 pr-3">Vehículo</th>
                <th className="py-1.5 pr-3 text-right">Consumo</th>
                <th className="py-1.5 pr-3">Combustible</th>
                <th className="py-1.5 text-right">Precio (ARS/L)</th>
              </tr>
            </thead>
            <tbody>
              {flota.vehiculos.map((v) => (
                <tr key={v.nombre} className="border-b border-gray-800/60 last:border-0">
                  <td className="py-1.5 pr-3 text-gray-200">{v.nombre}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-gray-300">{f1.format(v.kmL)} km/l · {f1.format(v.consumo)} L/100 km</td>
                  <td className="py-1.5 pr-3 text-gray-300">{v.combustible}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-200">{f0.format(v.precioLitro)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Seccion>

      {problemas.length > 0 && <Aviso tipo="error"><ul className="list-disc pl-5">{problemas.map((p) => <li key={p}>{p}</li>)}</ul></Aviso>}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={guardar} disabled={!cambiado || guardando || problemas.length > 0}>
          <RiSaveLine className="size-4" />{guardando ? 'Guardando…' : 'Guardar para todo el equipo'}
        </Button>
        <Button variante="secundario" onClick={() => setC(structuredClone(estado.config))} disabled={!cambiado}>Descartar cambios</Button>
        <Button variante="fantasma" onClick={() => setC(structuredClone(CONFIG_INICIAL))}>Volver a los valores de la planilla</Button>
        {cambiado && <span className="text-xs text-amber-300">Hay cambios sin guardar</span>}
      </div>
    </div>
  )
}
