import React, { useEffect, useState } from 'react'
import { RiAddLine, RiEditLine } from '@remixicon/react'
import { toast } from 'sonner'
import { Aviso, Badge, Button, Campo, Card, Input, MoneyInput, Select, cx } from './ui'
import { PersonaDialogo, VehiculoDialogo } from './Formularios'
import { guardarAjuste, guardarPrecio, guardarVehiculo } from '../lib/data'
import { fechaCorta, numero } from '../lib/calc'
import { CATEGORIAS, categoriaDe } from '../lib/categorias'
import { conComision, tarifasDe } from '../lib/viaticos'

const SECCIONES = [
  ['precios', 'Precios'],
  ['vehiculos', 'Vehículos'],
  ['personal', 'Personal'],
  ['conductores', 'Conductores'],
  ['viaticos', 'Viáticos'],
]

export default function Config({ datos, onCambio }) {
  const [seccion, setSeccion] = useState('precios')
  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-md border border-gray-800 bg-gray-900 p-1">
        {SECCIONES.map(([id, texto]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSeccion(id)}
            className={cx(
              'flex-1 rounded px-3 py-1.5 text-sm transition',
              seccion === id ? 'bg-brand font-semibold text-gray-950' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
            )}
          >
            {texto}
          </button>
        ))}
      </div>
      {seccion === 'precios' && <Precios datos={datos} onCambio={onCambio} />}
      {seccion === 'vehiculos' && <Vehiculos datos={datos} onCambio={onCambio} />}
      {seccion === 'personal' && <Personal datos={datos} onCambio={onCambio} />}
      {seccion === 'conductores' && <Conductores datos={datos} onCambio={onCambio} />}
      {seccion === 'viaticos' && <ConfigViaticos datos={datos} onCambio={onCambio} />}
    </div>
  )
}

// ------------------------------------------------------------------ Precios

function Precios({ datos, onCambio }) {
  const [valores, setValores] = useState({})
  const [kmLleno, setKmLleno] = useState(datos.ajustes.km_tanque_lleno ?? '900')
  const [estado, setEstado] = useState({ tipo: '', msg: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setValores(Object.fromEntries(datos.combustibles.map((c) => [c.nombre, String(Number(c.precio))])))
  }, [datos.combustibles])

  const cambiados = datos.combustibles.filter((c) => Number(valores[c.nombre]) !== Number(c.precio))
  const kmCambiado = String(kmLleno) !== String(datos.ajustes.km_tanque_lleno ?? '900')

  async function guardar() {
    const invalidos = cambiados.filter((c) => !(Number(valores[c.nombre]) > 0))
    if (invalidos.length) return setEstado({ tipo: 'error', msg: `Precio inválido: ${invalidos.map((c) => c.nombre).join(', ')}` })
    if (kmCambiado && !(Number(kmLleno) > 0)) return setEstado({ tipo: 'error', msg: 'Los km de tanque lleno deben ser mayores a 0' })
    setGuardando(true)
    try {
      for (const c of cambiados) await guardarPrecio(c.nombre, Number(valores[c.nombre]))
      if (kmCambiado) await guardarAjuste('km_tanque_lleno', Number(kmLleno))
      await onCambio()
      setEstado({ tipo: '', msg: '' })
      toast.success('Cambios guardados')
    } catch (e) {
      setEstado({ tipo: 'error', msg: e.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Precios de combustible</h2>
        <p className="text-sm text-gray-400">Precio por litro (GNC por m³). Se usan en todos los pedidos nuevos.</p>
      </div>
      <div className="divide-y divide-gray-800">
        {datos.combustibles.map((c) => {
          const cambiado = Number(valores[c.nombre]) !== Number(c.precio)
          return (
            <div key={c.nombre} className="flex items-center gap-3 py-2">
              <div className="flex-1">
                <div className="text-sm">{c.nombre}</div>
                <div className="text-xs text-gray-500">Actualizado el {fechaCorta(c.updated_at)}</div>
              </div>
              <div className="w-40">
                <MoneyInput
                  className={cx('text-right', cambiado && 'border-amber-600')}
                  decimales
                  value={(valores[c.nombre] ?? '').replace('.', ',')}
                  onChange={(v) => setValores({ ...valores, [c.nombre]: v.replace(',', '.') })}
                />
              </div>
            </div>
          )
        })}
      </div>
      <Campo label="Km para “Tanque lleno”" ayuda="Km que se asumen cuando se elige Tanque lleno en un pedido." className="max-w-xs">
        <Input inputMode="numeric" value={kmLleno} onChange={(e) => setKmLleno(e.target.value.replace(/\D/g, ''))} />
      </Campo>
      {estado.msg && <Aviso tipo={estado.tipo}>{estado.msg}</Aviso>}
      <Button onClick={guardar} disabled={guardando || (!cambiados.length && !kmCambiado)}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </Card>
  )
}

// ------------------------------------------------------------------ Vehículos

function Buscador({ valor, onCambio, placeholder }) {
  return (
    <div className="flex-1">
      <Input type="search" value={valor} onChange={(e) => onCambio(e.target.value)} placeholder={placeholder} />
    </div>
  )
}

const coincide = (texto, ...campos) =>
  campos.some((c) => (c ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(texto))

const normalizarBusqueda = (s) => s.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

function VerBajas({ cantidad, valor, onCambio }) {
  if (!cantidad) return null
  return (
    <label className="flex items-center gap-2 text-sm text-gray-400">
      <input type="checkbox" checked={valor} onChange={(e) => onCambio(e.target.checked)} className="size-4 accent-[#95de1d]" />
      Mostrar {cantidad} dados de baja
    </label>
  )
}

function Vehiculos({ datos, onCambio }) {
  const [busqueda, setBusqueda] = useState('')
  const [verBajas, setVerBajas] = useState(false)
  const [dialogo, setDialogo] = useState({ abierto: false, vehiculo: null })
  const q = normalizarBusqueda(busqueda)
  const bajas = datos.vehiculos.filter((v) => !v.activo).length
  const lista = datos.vehiculos.filter((v) => (verBajas || v.activo) && coincide(q, v.modelo, v.patente, v.combustible))

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar modelo o patente" />
        <Button onClick={() => setDialogo({ abierto: true, vehiculo: null })}>
          <RiAddLine className="size-4" /> Nuevo
        </Button>
      </div>
      <VerBajas cantidad={bajas} valor={verBajas} onCambio={setVerBajas} />
      {CATEGORIAS.map((cat) => [cat.grupo, lista.filter((v) => categoriaDe(v) === cat.id)]).map(([titulo, grupo]) => (
        <section key={titulo}>
          <h3 className="flex items-center gap-2 border-b border-gray-700 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase">
            {titulo}
            <span className="font-normal text-gray-500">({grupo.length})</span>
          </h3>
          <div className="divide-y divide-gray-800">
            {grupo.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setDialogo({ abierto: true, vehiculo: v })}
                className={cx('flex w-full items-center gap-3 py-2.5 text-left hover:bg-gray-800/40', !v.activo && 'opacity-50')}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    {v.modelo}
                    <span className="font-mono text-xs text-gray-400">{v.patente ?? (categoriaDe(v) === 'bidon' ? '' : 'sin patente')}</span>
                    {!v.activo && <Badge color="rojo">de baja</Badge>}
                  </div>
                  <div className="text-xs text-gray-500">
                    {v.combustible}
                    {categoriaDe(v) !== 'bidon' && ` · ${numero(Number(v.km_l))} km/l`}
                    {v.conductor_habitual_id &&
                      ` · ${datos.personal.find((p) => p.id === v.conductor_habitual_id)?.nombre ?? ''}`}
                  </div>
                </div>
                <RiEditLine className="size-4 shrink-0 text-gray-500" />
              </button>
            ))}
            {!grupo.length && <p className="py-3 text-center text-sm text-gray-500">Sin vehículos</p>}
          </div>
        </section>
      ))}
      <VehiculoDialogo
        abierto={dialogo.abierto}
        vehiculo={dialogo.vehiculo}
        vehiculos={datos.vehiculos}
        personal={datos.personal}
        combustibles={datos.combustibles}
        onCerrar={() => setDialogo({ abierto: false, vehiculo: null })}
        onEliminado={async () => {
          setDialogo({ abierto: false, vehiculo: null })
          await onCambio()
        }}
        onGuardado={async () => {
          setDialogo({ abierto: false, vehiculo: null })
          await onCambio()
        }}
      />
    </Card>
  )
}

// ------------------------------------------------------------------ Viáticos

const CAMPOS_VIATICOS = [
  ['viatico_dia', 'dia', 'Viaje en el día ($ por día)'],
  ['viatico_pernocte', 'pernocte', 'Día con pernocte ($ por día)'],
  ['viatico_regreso', 'regreso', 'Día de regreso ($)'],
  ['comision_transferencia', 'comision', 'Comisión tarjeta prepaga (%)'],
]

function ConfigViaticos({ datos, onCambio }) {
  const t = tarifasDe(datos.ajustes)
  const [valores, setValores] = useState({})
  const [estado, setEstado] = useState({ tipo: '', msg: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    setValores(Object.fromEntries(CAMPOS_VIATICOS.map(([clave, k]) => [clave, String(t[k])])))
  }, [datos.ajustes]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiados = CAMPOS_VIATICOS.filter(([clave, k]) => Number(valores[clave]) !== t[k])

  async function guardar() {
    const malos = cambiados.filter(([clave]) =>
      clave === 'comision_transferencia' ? !(Number(valores[clave]) >= 0 && Number(valores[clave]) < 100) : !(Number(valores[clave]) > 0),
    )
    if (malos.length) return setEstado({ tipo: 'error', msg: `Valor inválido: ${malos.map((m) => m[2]).join(', ')}` })
    setGuardando(true)
    try {
      for (const [clave] of cambiados) await guardarAjuste(clave, Number(valores[clave]))
      await onCambio()
      setEstado({ tipo: '', msg: '' })
      toast.success('Cambios guardados')
    } catch (e) {
      setEstado({ tipo: 'error', msg: e.message })
    } finally {
      setGuardando(false)
    }
  }

  const pct = Number(valores.comision_transferencia) || 0
  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold">Viáticos</h2>
        <p className="text-sm text-gray-400">
          Valores base por persona, sin comisión. La comisión se suma automáticamente a cada monto de la solicitud.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CAMPOS_VIATICOS.map(([clave, k, texto]) => (
          <Campo
            key={clave}
            label={texto}
            ayuda={k !== 'comision' && Number(valores[clave]) > 0 ? `Con comisión: $ ${conComision(Number(valores[clave]), pct).toLocaleString('es-AR')}` : ''}
          >
            <Input
              inputMode="decimal"
              value={valores[clave] ?? ''}
              className={cx(Number(valores[clave]) !== t[k] && 'border-amber-600')}
              onChange={(e) => setValores({ ...valores, [clave]: e.target.value.replace(',', '.').replace(/[^\d.]/g, '') })}
            />
          </Campo>
        ))}
      </div>
      {estado.msg && <Aviso tipo={estado.tipo}>{estado.msg}</Aviso>}
      <Button onClick={guardar} disabled={guardando || !cambiados.length}>
        {guardando ? 'Guardando…' : 'Guardar cambios'}
      </Button>
    </Card>
  )
}

// ------------------------------------------------------------------ Conductores habituales

// Asignación rápida vehículo → conductor habitual (se sugiere en el pedido).
function Conductores({ datos, onCambio }) {
  const [guardando, setGuardando] = useState(null) // id del vehículo que se está guardando
  const [estado, setEstado] = useState({ tipo: '', msg: '' })
  const activos = datos.vehiculos.filter((v) => v.activo)
  const personas = datos.personal.filter((p) => p.activo)

  async function asignar(v, personaId) {
    setGuardando(v.id)
    setEstado({ tipo: '', msg: '' })
    try {
      await guardarVehiculo({ ...v, conductor_habitual_id: personaId || null })
      await onCambio()
      const nombre = personas.find((p) => p.id === personaId)?.nombre
      toast.success(`${v.modelo} ${v.patente ?? ''}`, {
        description: nombre ? `Conductor habitual: ${nombre}` : 'Sin conductor habitual',
      })
    } catch (e) {
      setEstado({ tipo: 'error', msg: e.message })
    } finally {
      setGuardando(null)
    }
  }

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-semibold">Conductores habituales</h2>
        <p className="text-sm text-gray-400">
          Al elegir el vehículo en un pedido se sugiere este conductor; siempre se puede elegir otro. Los cambios se
          guardan al instante.
        </p>
      </div>
      {estado.msg && <Aviso tipo={estado.tipo}>{estado.msg}</Aviso>}
      {CATEGORIAS.map((cat) => {
        const grupo = activos.filter((v) => categoriaDe(v) === cat.id)
        if (!grupo.length) return null
        return (
          <section key={cat.id}>
            <h3 className="border-b border-gray-700 pt-3 pb-1.5 text-xs font-semibold tracking-wide text-gray-400 uppercase">
              {cat.grupo}
            </h3>
            <div className="divide-y divide-gray-800">
              {grupo.map((v) => (
                <div key={v.id} className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1 text-sm">
                    {v.modelo} <span className="font-mono text-xs text-gray-400">{v.patente ?? ''}</span>
                  </div>
                  <Select
                    className="sm:w-64"
                    value={v.conductor_habitual_id ?? ''}
                    disabled={guardando === v.id}
                    onChange={(e) => asignar(v, e.target.value)}
                  >
                    <option value="">Sin conductor habitual</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </Card>
  )
}

// ------------------------------------------------------------------ Personal

function Personal({ datos, onCambio }) {
  const [busqueda, setBusqueda] = useState('')
  const [soloSinDni, setSoloSinDni] = useState(false)
  const [verBajas, setVerBajas] = useState(false)
  const [dialogo, setDialogo] = useState({ abierto: false, persona: null })
  const q = normalizarBusqueda(busqueda)

  const telefonos = {}
  datos.personal.forEach((p) => p.activo && p.telefono && (telefonos[p.telefono] = (telefonos[p.telefono] ?? 0) + 1))
  const sinDni = datos.personal.filter((p) => p.activo && !p.dni).length
  const bajas = datos.personal.filter((p) => !p.activo).length
  const lista = datos.personal.filter(
    (p) => (verBajas || p.activo) && coincide(q, p.nombre, p.dni, p.telefono) && (!soloSinDni || !p.dni),
  )

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Buscador valor={busqueda} onCambio={setBusqueda} placeholder="Buscar nombre, DNI o teléfono" />
        <Button onClick={() => setDialogo({ abierto: true, persona: null })}>
          <RiAddLine className="size-4" /> Nuevo
        </Button>
      </div>
      {sinDni > 0 && (
        <label className="flex items-center gap-2 text-sm text-amber-300">
          <input type="checkbox" checked={soloSinDni} onChange={(e) => setSoloSinDni(e.target.checked)} className="size-4 accent-[#95de1d]" />
          Ver solo los {sinDni} sin DNI
        </label>
      )}
      <VerBajas cantidad={bajas} valor={verBajas} onCambio={setVerBajas} />
      <div className="divide-y divide-gray-800">
        {lista.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setDialogo({ abierto: true, persona: p })}
            className={cx('flex w-full items-center gap-3 py-2.5 text-left hover:bg-gray-800/40', !p.activo && 'opacity-50')}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {p.nombre}
                {!p.dni && <Badge color="ambar">sin DNI</Badge>}
                {p.activo && telefonos[p.telefono] > 1 && <Badge color="rojo">teléfono repetido</Badge>}
                {!p.activo && <Badge color="rojo">de baja</Badge>}
              </div>
              <div className="text-xs text-gray-500">
                DNI {p.dni ?? '—'} · Tel {p.telefono ?? '—'}
              </div>
            </div>
            <RiEditLine className="size-4 shrink-0 text-gray-500" />
          </button>
        ))}
        {!lista.length && <p className="py-4 text-center text-sm text-gray-500">Sin resultados</p>}
      </div>
      <PersonaDialogo
        abierto={dialogo.abierto}
        persona={dialogo.persona}
        onCerrar={() => setDialogo({ abierto: false, persona: null })}
        onEliminado={async () => {
          setDialogo({ abierto: false, persona: null })
          await onCambio()
        }}
        onGuardado={async () => {
          setDialogo({ abierto: false, persona: null })
          await onCambio()
        }}
      />
    </Card>
  )
}

