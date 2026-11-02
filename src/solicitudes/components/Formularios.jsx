import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button, Campo, Dialogo, Input, Select, Aviso, useConfirm } from './ui'
import { eliminarPersona, eliminarVehiculo, guardarPersona, guardarVehiculo } from '../lib/data'
import { normalizarPatente } from '../lib/calc'
import { apellidoNombre } from '../lib/viaticos'
import { CATEGORIAS, categoriaDe } from '../lib/categorias'

const numeroPositivo = (s) => {
  const n = Number(String(s).replace(',', '.'))
  return n > 0 ? n : null
}

// Botón "Eliminar" (con confirmación) para los diálogos de edición.
function BotonEliminar({ texto, onEliminar, onError }) {
  const [borrando, setBorrando] = useState(false)
  const confirmar = useConfirm()
  async function click() {
    if (!(await confirmar(`¿Eliminar definitivamente ${texto}? No se puede deshacer.`, { textoOk: 'Eliminar', peligro: true }))) return
    setBorrando(true)
    try {
      await onEliminar()
      toast.success(`Eliminado: ${texto}`)
    } catch (e) {
      onError(e.message)
      setBorrando(false)
    }
  }
  return (
    <Button variante="peligro" onClick={click} disabled={borrando} className="mr-auto">
      {borrando ? 'Eliminando…' : 'Eliminar'}
    </Button>
  )
}

const mismoModelo = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

// Alta / edición de vehículo. `vehiculo` null = alta.
// `vehiculos` (opcional) permite aplicar el consumo a los demás del mismo modelo.
export function VehiculoDialogo({ abierto, vehiculo, vehiculos = [], personal = [], combustibles, onCerrar, onGuardado, onEliminado }) {
  const [f, setF] = useState({})
  const [aplicarATodos, setAplicarATodos] = useState(true)
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setF(
      vehiculo
        ? { ...vehiculo, conductor_habitual_id: vehiculo.conductor_habitual_id ?? '', categoria: categoriaDe(vehiculo), km_l: String(vehiculo.km_l).replace('.', ','), patente: vehiculo.patente ?? '' }
        : { modelo: '', patente: '', km_l: '', combustible: '', conductor_habitual_id: '', categoria: 'utilitario', activo: true },
    )
    setErrores({})
    setErrorGeneral('')
    setAplicarATodos(!!vehiculo) // al dar de alta no se toca a los demás salvo que se marque
  }, [abierto, vehiculo])

  // Otros vehículos de la flota con el mismo modelo (ej: todas las Hilux).
  const esBidon = f.categoria === 'bidon'
  const hermanos = f.modelo && f.categoria !== 'particular' && !esBidon
    ? vehiculos.filter((v) => v.id !== vehiculo?.id && v.activo && !['particular', 'bidon'].includes(categoriaDe(v)) && mismoModelo(v.modelo, f.modelo))
    : []

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function guardar() {
    const e = {}
    // Los bidones no usan km/l ni patente (km_l se guarda en 1 porque la
    // columna es obligatoria).
    const kmL = esBidon ? numeroPositivo(f.km_l) ?? 1 : numeroPositivo(f.km_l)
    const patente = esBidon ? '' : normalizarPatente(f.patente)
    if (!f.modelo.trim()) e.modelo = 'Obligatorio'
    if (!kmL) e.km_l = 'Número mayor a 0'
    else if (kmL > 40) e.km_l = 'Revisá el valor (más de 40 km/l)'
    if (!f.combustible) e.combustible = 'Elegí el combustible'
    if (f.patente && !/^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/.test(patente))
      e.patente = 'Formato: ABC123 o AB123CD'
    setErrores(e)
    if (Object.keys(e).length) return
    setGuardando(true)
    setErrorGeneral('')
    try {
      const fila = {
        modelo: f.modelo.trim(),
        patente: patente || null,
        km_l: kmL,
        combustible: f.combustible,
        categoria: f.categoria,
        conductor_habitual_id: f.conductor_habitual_id || null,
        particular: f.categoria === 'particular',
        activo: f.activo,
      }
      if (vehiculo?.id) fila.id = vehiculo.id
      const guardado = await guardarVehiculo(fila)
      if (aplicarATodos) {
        for (const h of hermanos) {
          if (Number(h.km_l) !== kmL) await guardarVehiculo({ ...h, km_l: kmL })
        }
      }
      onGuardado(guardado)
    } catch (err) {
      setErrorGeneral(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo abierto={abierto} titulo={vehiculo ? 'Editar vehículo' : 'Nuevo vehículo'} onCerrar={onCerrar}>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Tipo" className="col-span-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CATEGORIAS.map((c) => (
              <Button
                key={c.id}
                variante={f.categoria === c.id ? 'primario' : 'secundario'}
                className="flex-1"
                onClick={() => setF({ ...f, categoria: c.id })}
              >
                {c.boton}
              </Button>
            ))}
          </div>
        </Campo>
        <Campo label={esBidon ? 'Nombre (así sale en el Excel)' : 'Marca / modelo'} error={errores.modelo} className="col-span-2">
          <Input
            value={f.modelo ?? ''}
            onChange={set('modelo')}
            placeholder={esBidon ? 'Ej: Bidón de Nafta' : 'Ej: Toyota Hilux'}
            error={errores.modelo}
          />
        </Campo>
        {!esBidon && (
        <>
        <Campo label="Patente" error={errores.patente}>
          <Input
            value={f.patente ?? ''}
            onChange={set('patente')}
            onBlur={() => setF({ ...f, patente: normalizarPatente(f.patente) })}
            placeholder="AB123CD"
            error={errores.patente}
          />
        </Campo>
        <Campo label="Rendimiento (km/l)" error={errores.km_l}>
          <Input value={f.km_l ?? ''} onChange={set('km_l')} inputMode="decimal" placeholder="12,5" error={errores.km_l} />
        </Campo>
        </>
        )}
        <Campo label="Combustible" error={errores.combustible} className="col-span-2">
          <Select value={f.combustible ?? ''} onChange={set('combustible')} error={errores.combustible}>
            <option value="">Elegir…</option>
            {combustibles.map((c) => (
              <option key={c.nombre}>{c.nombre}</option>
            ))}
          </Select>
        </Campo>
        <Campo
          label={esBidon ? 'Responsable habitual (opcional)' : 'Conductor habitual (opcional)'}
          ayuda="Se sugiere al elegir este vehículo en un pedido; se puede cambiar."
          className="col-span-2"
        >
          <Select value={f.conductor_habitual_id ?? ''} onChange={set('conductor_habitual_id')}>
            <option value="">Sin conductor habitual</option>
            {personal
              .filter((p) => p.activo || p.id === f.conductor_habitual_id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
          </Select>
        </Campo>
        {hermanos.length > 0 && (
          <label className="col-span-2 flex items-start gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={aplicarATodos} onChange={(e) => setAplicarATodos(e.target.checked)} className="mt-0.5 size-4 accent-[#95de1d]" />
            <span>
              Aplicar este rendimiento a los otros {hermanos.length} {f.modelo.trim()} de la flota
              <span className="block text-xs text-gray-500">{hermanos.map((h) => h.patente ?? 's/patente').join(', ')}</span>
            </span>
          </label>
        )}
        {vehiculo && (
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={!!f.activo} onChange={set('activo')} className="size-4 accent-[#95de1d]" />
            Activo (desmarcar para darlo de baja; no aparece más en los pedidos)
          </label>
        )}
      </div>
      {errorGeneral && <div className="mt-3"><Aviso tipo="error">{errorGeneral}</Aviso></div>}
      <div className="mt-5 flex justify-end gap-2">
        {vehiculo && onEliminado && (
          <BotonEliminar
            texto={`${vehiculo.modelo} ${vehiculo.patente ?? ''}`.trim()}
            onEliminar={async () => {
              await eliminarVehiculo(vehiculo.id)
              onEliminado()
            }}
            onError={setErrorGeneral}
          />
        )}
        <Button variante="secundario" onClick={onCerrar}>Cancelar</Button>
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </Dialogo>
  )
}

export function PersonaDialogo({ abierto, persona, onCerrar, onGuardado, onEliminado }) {
  const [f, setF] = useState({})
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!abierto) return
    setF(persona ? { ...persona, apellido: persona.apellido ?? '', dni: persona.dni ?? '', telefono: persona.telefono ?? '' } : { nombre: '', apellido: '', dni: '', telefono: '', activo: true })
    setErrores({})
    setErrorGeneral('')
  }, [abierto, persona])

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  async function guardar() {
    const e = {}
    const dni = f.dni.replace(/\D/g, '')
    const telefono = f.telefono.replace(/\D/g, '')
    if (!f.nombre.trim()) e.nombre = 'Obligatorio'
    if (dni && (dni.length < 7 || dni.length > 8)) e.dni = 'El DNI tiene 7 u 8 dígitos'
    if (telefono && telefono.length !== 10) e.telefono = '10 dígitos, sin 0 ni 15 (ej: 3511234567)'
    setErrores(e)
    if (Object.keys(e).length) return
    setGuardando(true)
    setErrorGeneral('')
    try {
      const fila = {
        nombre: f.nombre.trim().replace(/\s+/g, ' '),
        apellido: f.apellido.trim().replace(/\s+/g, ' ') || null,
        dni: dni || null,
        telefono: telefono || null,
        activo: f.activo,
      }
      if (persona?.id) fila.id = persona.id
      onGuardado(await guardarPersona(fila))
    } catch (err) {
      setErrorGeneral(err.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo abierto={abierto} titulo={persona ? 'Editar persona' : 'Nueva persona'} onCerrar={onCerrar}>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Nombre y apellido" error={errores.nombre} className="col-span-2">
          <Input value={f.nombre ?? ''} onChange={set('nombre')} error={errores.nombre} />
        </Campo>
        <Campo
          label="Apellido"
          ayuda={`Para "Apellido, Nombre" en viáticos. Ej: Di Paola${f.nombre?.trim() ? ` → ${apellidoNombre({ nombre: f.nombre, apellido: f.apellido })}` : ''}`}
          className="col-span-2"
        >
          <Input value={f.apellido ?? ''} onChange={set('apellido')} placeholder="Si se deja vacío se usa la última palabra" />
        </Campo>
        <Campo label="DNI" error={errores.dni} ayuda="Se puede completar después">
          <Input value={f.dni ?? ''} onChange={set('dni')} inputMode="numeric" error={errores.dni} />
        </Campo>
        <Campo label="Teléfono" error={errores.telefono}>
          <Input value={f.telefono ?? ''} onChange={set('telefono')} inputMode="tel" placeholder="3511234567" error={errores.telefono} />
        </Campo>
        {persona && (
          <label className="col-span-2 flex items-center gap-2 text-sm text-gray-300">
            <input type="checkbox" checked={!!f.activo} onChange={set('activo')} className="size-4 accent-[#95de1d]" />
            Activo (desmarcar para darlo de baja)
          </label>
        )}
      </div>
      {errorGeneral && <div className="mt-3"><Aviso tipo="error">{errorGeneral}</Aviso></div>}
      <div className="mt-5 flex justify-end gap-2">
        {persona && onEliminado && (
          <BotonEliminar
            texto={`a ${persona.nombre}`}
            onEliminar={async () => {
              await eliminarPersona(persona.id)
              onEliminado()
            }}
            onError={setErrorGeneral}
          />
        )}
        <Button variante="secundario" onClick={onCerrar}>Cancelar</Button>
        <Button onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
      </div>
    </Dialogo>
  )
}
