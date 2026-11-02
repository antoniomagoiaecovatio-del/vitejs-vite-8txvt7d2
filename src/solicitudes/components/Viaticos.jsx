import React, { useEffect, useMemo, useState } from 'react'
import { RiAddLine, RiDeleteBinLine, RiDownload2Line, RiEraserLine } from '@remixicon/react'
import { toast } from 'sonner'
import { Aviso, Button, Campo, Card, Combobox, Input, MoneyInput, Seccion, Segmentado, Select, useConfirm } from './ui'
import { hoyISO, pesos } from '../lib/calc'
import {
  apellidoNombre,
  conComision,
  diarioManualARS,
  diasEntre,
  parseMonto,
  tarifasDe,
  viaticoPersona,
} from '../lib/viaticos'

const CLAVE_BORRADOR = 'viaticos-borrador'
const MAX_COLABORADORES = 22

const colaboradorVacio = () => ({ uid: crypto.randomUUID(), personaId: '', dias: '', ajuste: '' })

const solicitudVacia = () => ({
  responsableId: '',
  fechaInicio: hoyISO(),
  fechaFin: hoyISO(),
  destino: '',
  descripcion: '',
  modo: 'auto', // 'auto' | 'manual'
  moneda: 'ARS', // modo manual: 'ARS' | 'USD'
  montoManual: '',
  tipoCambio: '',
  colaboradores: [colaboradorVacio()],
  combustible: '',
  peajesCantidad: '',
  peajesValor: '',
  hotel: '',
  imprevistos: '',
  otros: '',
  saldoAnterior: '',
})

function leerBorrador() {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR))
    if (b && Array.isArray(b.colaboradores)) return { ...solicitudVacia(), ...b }
  } catch {
    /* sin borrador */
  }
  return solicitudVacia()
}

// Solo dígitos (y opcionalmente un "-" adelante y coma decimal).
const soloMonto = (v, { negativo = false, decimales = false } = {}) => {
  let s = v.replace(decimales ? /[^\d.,-]/g : /[^\d.-]/g, '')
  s = negativo ? s.replace(/(?!^)-/g, '') : s.replace(/-/g, '')
  return s
}

export default function Viaticos({ datos }) {
  const personalActivo = datos.personal.filter((p) => p.activo)
  const t = tarifasDe(datos.ajustes)
  const [s, setS] = useState(leerBorrador)
  const [intento, setIntento] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(s))
    } catch {
      /* ignorar */
    }
  }, [s])

  const set = (campo) => (e) => setS((x) => ({ ...x, [campo]: e.target.value }))
  const setMonto = (campo, opts) => (e) => setS((x) => ({ ...x, [campo]: soloMonto(e.target.value, opts) }))
  const setColab = (uid, cambios) =>
    setS((x) => ({ ...x, colaboradores: x.colaboradores.map((c) => (c.uid === uid ? { ...c, ...cambios } : c)) }))

  // ---------------------------------------------------------------- cálculo
  const calc = useMemo(() => {
    const errores = {}
    const duracion = diasEntre(s.fechaInicio, s.fechaFin)
    if (!s.responsableId) errores.responsable = 'Elegí quién solicita el viático'
    if (!s.fechaInicio) errores.fechaInicio = 'Elegí la fecha'
    if (!s.fechaFin) errores.fechaFin = 'Elegí la fecha'
    else if (s.fechaInicio && !duracion) errores.fechaFin = 'La fecha fin es anterior al inicio'
    if (!s.destino.trim()) errores.destino = 'Escribí el destino'

    const diarioManual =
      s.modo === 'manual' ? diarioManualARS({ moneda: s.moneda, monto: s.montoManual, tipoCambio: s.tipoCambio }) : null
    if (s.modo === 'manual') {
      if (!(parseMonto(s.montoManual) > 0)) errores.montoManual = 'Ingresá el monto por día'
      if (s.moneda === 'USD' && !(parseMonto(s.tipoCambio) > 0)) errores.tipoCambio = 'Ingresá el tipo de cambio'
    }

    const usados = new Set()
    const colaboradores = s.colaboradores.map((c) => {
      const e = {}
      const persona = datos.personal.find((p) => p.id === c.personaId)
      if (!persona) e.persona = 'Elegí la persona'
      else if (usados.has(c.personaId)) e.persona = 'Está repetida'
      usados.add(c.personaId)
      const dias = c.dias === '' ? duracion : Number(c.dias)
      if (!(Number.isInteger(dias) && dias >= 1)) e.dias = 'Días ≥ 1'
      const ajuste = parseMonto(c.ajuste) ?? 0
      const base = viaticoPersona({ dias, modo: s.modo, t, diarioManual })
      const monto = !persona || base == null ? null : base + ajuste
      // Nunca generar una planilla con el viático de una persona vacío.
      if (persona && !e.dias && base == null) e.monto = 'Falta el monto del viático'
      return { ...c, diasTxt: c.dias, ajusteTxt: c.ajuste, persona, dias, ajuste, base, monto, errores: e }
    })
    if (colaboradores.length > MAX_COLABORADORES) errores.colaboradores = `Máximo ${MAX_COLABORADORES} personas por planilla`

    const totalViaticos = colaboradores.reduce((a, c) => a + (c.monto ?? 0), 0)
    const cc = (campo) => {
      const v = parseMonto(s[campo])
      return v > 0 ? conComision(v, t.comision) : 0
    }
    const peajesCant = parseMonto(s.peajesCantidad)
    const peajesValor = parseMonto(s.peajesValor)
    const peajeUnit = peajesValor > 0 ? conComision(peajesValor, t.comision) : 0
    const peajes = peajesCant > 0 && peajeUnit ? Math.round(peajesCant) * peajeUnit : 0
    if ((s.peajesCantidad && !peajesValor) || (s.peajesValor && !(peajesCant > 0)))
      errores.peajes = 'Completá cantidad y valor del peaje'
    const gastos = [
      { fila: 40, concepto: 'Combustible', monto: cc('combustible') },
      {
        fila: 41,
        concepto: peajes ? `Peajes (${Math.round(peajesCant)} × ${pesos(peajeUnit)})` : 'Peajes',
        monto: peajes,
      },
      { fila: 42, concepto: 'Hotel', monto: cc('hotel') },
      { fila: 43, concepto: 'Imprevistos:', monto: cc('imprevistos') },
      { fila: 44, concepto: 'Otros:', monto: cc('otros') },
    ]
    const totalGastos = gastos.reduce((a, g) => a + g.monto, 0)
    const anticipo = totalViaticos + totalGastos
    const saldoAnterior = Math.round(parseMonto(s.saldoAnterior) ?? 0)

    const avisos = []
    colaboradores.forEach((c) => {
      if (c.persona && duracion && c.dias > duracion)
        avisos.push(`${c.persona.nombre} tiene más días (${c.dias}) que la duración del viaje (${duracion}).`)
    })
    if (anticipo === 0 && colaboradores.every((c) => c.monto != null)) avisos.push('El anticipo total es $ 0.')

    const hayErrores = Object.keys(errores).length > 0 || colaboradores.some((c) => Object.keys(c.errores).length)
    return {
      errores, duracion, diarioManual, colaboradores, totalViaticos, gastos, totalGastos,
      anticipo, saldoAnterior, saldo: anticipo + saldoAnterior, avisos, hayErrores,
    }
  }, [s, datos.personal, t.dia, t.regreso, t.pernocte, t.comision]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- Excel
  function notaViatico() {
    const pct = `${t.comision}%`
    if (s.modo === 'manual') {
      const usd = s.moneda === 'USD' ? ` · US$ ${s.montoManual} × $ ${s.tipoCambio} por día` : ''
      return `Incluye ${pct} de comisión para transferencias${usd}`
    }
    return (
      `Incluye ${pct} de comisión para transferencias. ` +
      `Día de regreso ${pesos(conComision(t.regreso, t.comision))} · viaje en el día ${pesos(conComision(t.dia, t.comision))}`
    )
  }

  async function descargarExcel() {
    setIntento(true)
    setError('')
    if (calc.hayErrores) {
      toast.error('Faltan datos en los campos marcados en rojo')
      return
    }
    setGenerando(true)
    try {
      const responsable = datos.personal.find((p) => p.id === s.responsableId)
      const hayPernocte = calc.colaboradores.some((c) => c.dias >= 2)
      const viaticoDiario =
        s.modo === 'manual'
          ? conComision(calc.diarioManual, t.comision)
          : conComision(hayPernocte ? t.pernocte : t.dia, t.comision)
      const solicitud = {
        responsable: apellidoNombre(responsable),
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        duracion: calc.duracion,
        destino: s.destino.trim().toUpperCase(),
        descripcion: s.descripcion.trim().toUpperCase(),
        viaticoDiario,
        notaViatico: s.modo === 'manual' || hayPernocte ? notaViatico() : `Incluye ${t.comision}% de comisión para transferencias (viaje en el día)`,
        colaboradores: calc.colaboradores.map((c) => ({ nombre: apellidoNombre(c.persona), dias: c.dias, monto: c.monto })),
        totalViaticos: calc.totalViaticos,
        gastos: calc.gastos,
        totalGastos: calc.totalGastos,
        anticipo: calc.anticipo,
        saldoAnterior: calc.saldoAnterior,
        saldo: calc.saldo,
        comision: t.comision,
      }
      const plantilla = await fetch('/plantilla-rps-01-02.xlsx').then((r) => {
        if (!r.ok) throw new Error('No se encontró la plantilla de viáticos')
        return r.arrayBuffer()
      })
      const { generarExcelViaticos, nombreArchivoViaticos } = await import('../lib/excelViaticos')
      const buffer = await generarExcelViaticos(plantilla, solicitud)
      const nombre = nombreArchivoViaticos(solicitud)
      const url = URL.createObjectURL(
        new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success('Excel descargado', { description: nombre })
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerando(false)
    }
  }

  const confirmar = useConfirm()
  async function nuevaSolicitud() {
    if (await confirmar('¿Limpiar todos los campos y empezar una solicitud nueva?', { textoOk: 'Limpiar todo', peligro: true })) {
      setS(solicitudVacia())
      setIntento(false)
    }
  }

  const err = intento ? calc.errores : {}
  const gruposPersonal = [{ opciones: personalActivo.map((p) => ({ valor: p.id, texto: p.nombre })) }]
  const conComisionTxt = (i, prefijo = 'Con comisión') => (calc.gastos[i].monto ? `${prefijo}: ${pesos(calc.gastos[i].monto)}` : '')

  // ---------------------------------------------------------------- UI
  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-50">Solicitud de viáticos</h2>
          <p className="text-xs text-gray-400">Genera el Excel RPS 01 02 para enviar por mail a administración.</p>
        </div>
        <Button variante="secundario" onClick={nuevaSolicitud} className="shrink-0">
          <RiEraserLine className="size-4" /> <span className="hidden sm:inline">Limpiar todo</span>
        </Button>
      </div>

      <Seccion titulo="Datos del viaje">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Responsable (quien solicita)" error={err.responsable} className="sm:col-span-2">
            <Combobox
              valor={s.responsableId}
              error={err.responsable}
              placeholder="Buscar persona…"
              grupos={gruposPersonal}
              onCambio={(id) => setS((x) => ({ ...x, responsableId: id }))}
            />
          </Campo>
          <Campo label="Fecha inicio" error={err.fechaInicio}>
            <Input type="date" value={s.fechaInicio} error={err.fechaInicio} onChange={set('fechaInicio')} />
          </Campo>
          <Campo
            label="Fecha fin"
            error={err.fechaFin}
            ayuda={calc.duracion ? `Duración: ${calc.duracion} ${calc.duracion === 1 ? 'día' : 'días'}` : ''}
          >
            <Input type="date" value={s.fechaFin} min={s.fechaInicio} error={err.fechaFin} onChange={set('fechaFin')} />
          </Campo>
          <Campo label="Destino" error={err.destino} className="sm:col-span-2">
            <Input value={s.destino} error={err.destino} placeholder="Ej: Villa General Belgrano" onChange={set('destino')} />
          </Campo>
          <Campo label="Breve descripción del viaje" className="sm:col-span-2">
            <Input value={s.descripcion} placeholder="Ej: Instalación en VGB E3" onChange={set('descripcion')} />
          </Campo>
        </div>
      </Seccion>

      <Seccion titulo="Viático por día">
        <Segmentado
          className="mb-3 max-w-md"
          opciones={[
            ['auto', 'Automático'],
            ['manual', 'Otro monto'],
          ]}
          valor={s.modo}
          onCambio={(modo) => setS((x) => ({ ...x, modo }))}
        />
        {s.modo === 'auto' ? (
          <div className="grid gap-2 text-sm sm:grid-cols-3">
            {[
              ['Viaje en el día', t.dia],
              ['Día con pernocte', t.pernocte],
              ['Día de regreso', t.regreso],
            ].map(([texto, base]) => (
              <div key={texto} className="rounded-md border border-gray-800 bg-gray-950/60 px-3 py-2">
                <div className="text-xs text-gray-400">{texto}</div>
                <div className="text-lg font-semibold text-gray-50 tabular-nums">{pesos(conComision(base, t.comision))}</div>
                <div className="text-xs text-gray-500">
                  {pesos(base)} + {t.comision}% comisión
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500 sm:col-span-3">
              1 día = viaje en el día. Más días = pernocte cada día y el último a tarifa de regreso. Los valores se
              cambian en Configuración › Viáticos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Campo label="Moneda">
              <Select value={s.moneda} onChange={set('moneda')}>
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares (USD)</option>
              </Select>
            </Campo>
            <Campo label="Monto por día" error={err.montoManual}>
              <MoneyInput
                value={s.montoManual}
                error={err.montoManual}
                prefijo={s.moneda === 'USD' ? 'US$' : '$'}
                decimales={s.moneda === 'USD'}
                onChange={(v) => setS((x) => ({ ...x, montoManual: v }))}
              />
            </Campo>
            {s.moneda === 'USD' && (
              <Campo label="Tipo de cambio ($ por US$)" error={err.tipoCambio}>
                <MoneyInput value={s.tipoCambio} error={err.tipoCambio} decimales onChange={(v) => setS((x) => ({ ...x, tipoCambio: v }))} />
              </Campo>
            )}
            <div className="self-end pb-2 text-sm text-gray-400">
              {calc.diarioManual
                ? `= ${pesos(calc.diarioManual)} + ${t.comision}% → ${pesos(conComision(calc.diarioManual, t.comision))} por día`
                : ''}
            </div>
          </div>
        )}
      </Seccion>

      <Seccion
        titulo="Colaboradores que viajan (reciben el viático)"
        extra={
          <span className="text-xs text-gray-500">
            {s.colaboradores.length}/{MAX_COLABORADORES}
          </span>
        }
      >
        <div className="space-y-3">
          {calc.colaboradores.map((c, i) => {
            const e = intento ? c.errores : {}
            return (
              <div key={c.uid} className="grid grid-cols-2 items-start gap-2 rounded-md bg-gray-950/40 p-3 sm:grid-cols-12">
                <Campo label={`Persona ${i + 1}`} error={e.persona} className="col-span-2 sm:col-span-5">
                  <Combobox
                    valor={c.personaId}
                    error={e.persona}
                    placeholder="Buscar persona…"
                    grupos={gruposPersonal}
                    onCambio={(id) => setColab(c.uid, { personaId: id })}
                  />
                </Campo>
                <Campo label="Días" error={e.dias} className="sm:col-span-2">
                  <Input
                    value={c.diasTxt}
                    placeholder={calc.duracion ? String(calc.duracion) : ''}
                    error={e.dias}
                    inputMode="numeric"
                    onChange={(ev) => setColab(c.uid, { dias: ev.target.value.replace(/\D/g, '') })}
                  />
                </Campo>
                <Campo label="Ajuste" ayuda="Ej: -10.000 saldo a favor" className="sm:col-span-2">
                  <MoneyInput value={c.ajusteTxt} negativo placeholder="0" onChange={(v) => setColab(c.uid, { ajuste: v })} />
                </Campo>
                <div className="col-span-2 flex items-end justify-between gap-2 self-end pb-2 sm:col-span-3">
                  {e.monto ? (
                    <span className="text-xs text-red-400">{e.monto}</span>
                  ) : (
                    <span className="text-base font-semibold text-gray-50 tabular-nums">{pesos(c.monto)}</span>
                  )}
                  <Button
                    variante="fantasma"
                    className="px-2 py-1 text-gray-400"
                    aria-label="Quitar"
                    onClick={() =>
                      setS((x) => ({
                        ...x,
                        colaboradores:
                          x.colaboradores.length > 1 ? x.colaboradores.filter((y) => y.uid !== c.uid) : [colaboradorVacio()],
                      }))
                    }
                  >
                    <RiDeleteBinLine className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
        {intento && calc.errores.colaboradores && (
          <div className="mt-2">
            <Aviso tipo="error">{calc.errores.colaboradores}</Aviso>
          </div>
        )}
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button
            variante="secundario"
            className="border-dashed text-gray-300"
            disabled={s.colaboradores.length >= MAX_COLABORADORES}
            onClick={() => setS((x) => ({ ...x, colaboradores: [...x.colaboradores, colaboradorVacio()] }))}
          >
            <RiAddLine className="size-4" /> Agregar colaborador
          </Button>
          <span className="text-sm text-gray-400">
            Total viáticos <b className="text-gray-50 tabular-nums">{pesos(calc.totalViaticos)}</b>
          </span>
        </div>
      </Seccion>

      <Seccion titulo="Otros gastos relacionados con el viaje (a rendir)">
        <p className="-mt-2 mb-3 text-xs text-gray-500">Ingresá los montos sin comisión: se les suma el {t.comision}% automáticamente.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo label="Combustible" ayuda={conComisionTxt(0)}>
            <MoneyInput value={s.combustible} onChange={(v) => setS((x) => ({ ...x, combustible: v }))} />
          </Campo>
          <Campo label="Peajes: cantidad" error={err.peajes}>
            <Input value={s.peajesCantidad} inputMode="numeric" placeholder="Ej: 4" onChange={setMonto('peajesCantidad')} />
          </Campo>
          <Campo label="Peajes: valor c/u" ayuda={conComisionTxt(1, 'Total con comisión')}>
            <MoneyInput value={s.peajesValor} placeholder="Ej: 3.000" onChange={(v) => setS((x) => ({ ...x, peajesValor: v }))} />
          </Campo>
          <Campo label="Hotel" ayuda={conComisionTxt(2)}>
            <MoneyInput value={s.hotel} onChange={(v) => setS((x) => ({ ...x, hotel: v }))} />
          </Campo>
          <Campo label="Imprevistos" ayuda={conComisionTxt(3)}>
            <MoneyInput value={s.imprevistos} onChange={(v) => setS((x) => ({ ...x, imprevistos: v }))} />
          </Campo>
          <Campo label="Otros" ayuda={conComisionTxt(4)}>
            <MoneyInput value={s.otros} onChange={(v) => setS((x) => ({ ...x, otros: v }))} />
          </Campo>
          <Campo label="Saldo anterior (opcional)" ayuda="+ debo / − debe SOLFLIX. Sin comisión." className="sm:col-span-2">
            <MoneyInput value={s.saldoAnterior} negativo placeholder="0" onChange={(v) => setS((x) => ({ ...x, saldoAnterior: v }))} />
          </Campo>
        </div>
      </Seccion>

      {calc.avisos.length > 0 && (
        <Aviso tipo="alerta">
          <ul className="list-disc space-y-0.5 pl-4">
            {calc.avisos.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Aviso>
      )}

      {/* Barra fija con el total y la descarga */}
      <div className="sticky bottom-3 z-30">
        <Card className="space-y-2 border-gray-700 bg-gray-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="flex gap-5 text-xs text-gray-400">
              <div>
                Viáticos
                <div className="text-sm font-semibold text-gray-200 tabular-nums">{pesos(calc.totalViaticos)}</div>
              </div>
              <div>
                Otros gastos
                <div className="text-sm font-semibold text-gray-200 tabular-nums">{pesos(calc.totalGastos)}</div>
              </div>
              {calc.saldoAnterior !== 0 && (
                <div>
                  Con saldo anterior
                  <div className="text-sm font-semibold text-gray-200 tabular-nums">{pesos(calc.saldo)}</div>
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Anticipo a retirar (AGV)</div>
              <div className="text-2xl font-semibold text-gray-50 tabular-nums">{pesos(calc.anticipo)}</div>
            </div>
          </div>
          <Button onClick={descargarExcel} isLoading={generando} loadingText="Generando…" className="w-full py-2.5 sm:w-52">
            <RiDownload2Line className="size-4" /> Descargar Excel
          </Button>
          </div>
          {intento && calc.hayErrores && <Aviso tipo="error">Faltan datos en los campos marcados en rojo.</Aviso>}
          {error && <Aviso tipo="error">{error}</Aviso>}
        </Card>
      </div>
    </div>
  )
}
