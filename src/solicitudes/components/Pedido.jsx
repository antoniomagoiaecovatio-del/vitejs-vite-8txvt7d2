import React, { useEffect, useMemo, useState } from 'react'
import { RiAddLine, RiDeleteBinLine, RiDownload2Line, RiEraserLine, RiFileExcel2Line, RiWhatsappLine } from '@remixicon/react'
import { toast } from 'sonner'
import { Aviso, Badge, Button, Campo, Card, Combobox, Input, Segmentado, Select, cx, useConfirm } from './ui'
import { VehiculoDialogo } from './Formularios'
import { CATEGORIAS, categoriaDe } from '../lib/categorias'
import { calcularCarga, fechaCorta, hoyISO, numero, pesos, redondear2 } from '../lib/calc'

const CLAVE_BORRADOR = 'pedido-borrador'
const DIAS_PRECIO_VIEJO = 30

const lineaVacia = (base = {}) => ({
  uid: crypto.randomUUID(),
  vehiculoId: '',
  conductorId: '',
  conductorSugerido: false, // true si el conductor lo completó la sugerencia (se puede reemplazar)
  fecha: base.fecha ?? hoyISO(),
  obra: base.obra ?? '',
  modo: 'lleno',
  km: '',
  litros: '', // solo bidones
  combustible: '', // solo bidones (vacío = el del bidón)
})

function leerBorrador() {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR))
    if (Array.isArray(b) && b.length) return b
  } catch {
    /* sin borrador */
  }
  return [lineaVacia()]
}

export default function Pedido({ datos, onVehiculoNuevo }) {
  const { combustibles, vehiculos, personal, ajustes } = datos
  const kmLleno = Number(ajustes.km_tanque_lleno) || 900

  const [lineas, setLineas] = useState(leerBorrador)
  const [intentoGenerar, setIntentoGenerar] = useState(false)
  const [archivo, setArchivo] = useState(null) // { nombre, blob }
  const [generando, setGenerando] = useState(false)
  const [error, setError] = useState('')
  const [dialogoPara, setDialogoPara] = useState(null) // uid de la línea que pidió "nuevo vehículo"
  const [avisoWhatsapp, setAvisoWhatsapp] = useState(null) // null | 'web' | 'app'

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_BORRADOR, JSON.stringify(lineas))
    } catch {
      /* ignorar */
    }
    setArchivo(null)
    setAvisoWhatsapp(null)
  }, [lineas])

  const vehiculosActivos = vehiculos.filter((v) => v.activo)
  const personalActivo = personal.filter((p) => p.activo)
  const precioDe = (nombre) => combustibles.find((c) => c.nombre === nombre)

  // Resuelve cada línea con sus datos calculados y errores.
  const resueltas = useMemo(
    () =>
      lineas.map((l) => {
        const v = vehiculos.find((x) => x.id === l.vehiculoId)
        const p = personal.find((x) => x.id === l.conductorId)
        const esBidon = !!v && categoriaDe(v) === 'bidon'
        const combustible = esBidon ? l.combustible || v.combustible : v?.combustible
        const c = v && precioDe(combustible)
        const errores = {}
        let km = null
        let litros
        let monto
        if (esBidon) {
          // Bidones (grupos electrógenos): se piden litros directamente.
          const pedidos = Number(String(l.litros ?? '').replace(',', '.'))
          litros = pedidos > 0 ? redondear2(pedidos) : null
          monto = litros != null && c ? Math.round(Number(c.precio) * litros) : null
          if (!(pedidos > 0)) errores.litros = 'Ingresá los litros'
          else if (pedidos > 1000) errores.litros = 'Revisá los litros (más de 1000)'
        } else {
          km = l.modo === 'lleno' ? kmLleno : Number(String(l.km).replace(',', '.'))
          ;({ litros, monto } = calcularCarga({ km, kmL: Number(v?.km_l), precio: Number(c?.precio) }))
          if (l.modo === 'recarga' && !(km > 0)) errores.km = 'Ingresá los km a recorrer'
          if (l.modo === 'recarga' && km > 3000) errores.km = 'Revisá los km (más de 3000)'
        }
        if (!v || !v.activo) errores.vehiculo = 'Elegí un vehículo o bidón'
        if (!p || !p.activo) errores.conductor = esBidon ? 'Elegí el responsable' : 'Elegí un conductor'
        if (!l.fecha) errores.fecha = 'Elegí la fecha'
        if (!l.obra.trim()) errores.obra = 'Escribí la obra'
        if (v && !c) errores.vehiculo = `No hay precio para "${combustible}"`
        return { l, v, p, c, esBidon, combustible, km, litros, monto, errores }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineas, vehiculos, personal, combustibles, kmLleno],
  )

  const hayErrores = resueltas.some((r) => Object.keys(r.errores).length)
  const total = resueltas.reduce((s, r) => s + (r.monto ?? 0), 0)

  const avisos = []
  const repetidos = vehiculosActivos.filter((v) => categoriaDe(v) !== 'bidon' && lineas.filter((l) => l.vehiculoId === v.id).length > 1)
  repetidos.forEach((v) => avisos.push(`El vehículo ${v.modelo} ${v.patente ?? ''} está más de una vez en el pedido.`))
  resueltas.forEach((r) => {
    if (r.p && !r.p.dni) avisos.push(`${r.p.nombre} no tiene DNI cargado (completalo en Configuración › Personal).`)
    if (r.p && !r.p.telefono) avisos.push(`${r.p.nombre} no tiene teléfono cargado.`)
  })
  const usados = new Set(resueltas.map((r) => r.c?.nombre).filter(Boolean))
  combustibles
    .filter((c) => usados.has(c.nombre))
    .forEach((c) => {
      const dias = (Date.now() - new Date(c.updated_at).getTime()) / 86400000
      if (dias > DIAS_PRECIO_VIEJO)
        avisos.push(`El precio de ${c.nombre} no se actualiza desde el ${fechaCorta(c.updated_at)}.`)
    })

  const actualizar = (uid, cambios) => setLineas((ls) => ls.map((l) => (l.uid === uid ? { ...l, ...cambios } : l)))

  // Conductor habitual del vehículo (solo si sigue activo).
  const habitualDe = (v) =>
    v?.conductor_habitual_id && personalActivo.some((p) => p.id === v.conductor_habitual_id) ? v.conductor_habitual_id : null

  // Al elegir vehículo se sugiere su conductor habitual, pero solo si no hay
  // uno elegido a mano (nunca pisa una elección manual).
  function elegirVehiculo(uid, vehiculo) {
    setLineas((ls) =>
      ls.map((l) => {
        if (l.uid !== uid) return l
        const hab = habitualDe(vehiculo)
        const libre = !l.conductorId || l.conductorSugerido
        if (hab && libre) return { ...l, vehiculoId: vehiculo.id, conductorId: hab, conductorSugerido: true }
        if (!hab && l.conductorSugerido) return { ...l, vehiculoId: vehiculo.id, conductorId: '', conductorSugerido: false }
        return { ...l, vehiculoId: vehiculo.id }
      }),
    )
  }
  const agregar = () => setLineas((ls) => [...ls, lineaVacia(ls.at(-1))])
  const quitar = (uid) => setLineas((ls) => (ls.length > 1 ? ls.filter((l) => l.uid !== uid) : [lineaVacia()]))
  const confirmar = useConfirm()
  const nuevoPedido = async () => {
    if (await confirmar('¿Limpiar todas las cargas y empezar un pedido nuevo?', { textoOk: 'Limpiar todo', peligro: true })) {
      setLineas([lineaVacia()])
      setIntentoGenerar(false)
    }
  }

  async function generar() {
    setIntentoGenerar(true)
    setError('')
    if (hayErrores) {
      toast.error('Faltan datos en las cargas marcadas en rojo')
      return
    }
    setGenerando(true)
    try {
      const filas = resueltas.map((r) => ({
        vehiculo: r.v.modelo,
        patente: r.v.patente,
        conductor: r.p.nombre,
        dni: r.p.dni,
        telefono: r.p.telefono,
        fecha: r.l.fecha,
        obra: r.l.obra.trim().toUpperCase(),
        kmL: r.esBidon ? null : Number(r.v.km_l), // bidones: sin km/l ni km
        km: r.km,
        combustible: r.combustible,
        precio: Number(r.c.precio),
        litros: r.litros,
        monto: r.monto,
      }))
      const plantilla = await fetch('/plantilla-rpo-03-20.xlsx').then((res) => {
        if (!res.ok) throw new Error('No se encontró la plantilla del Excel')
        return res.arrayBuffer()
      })
      const { generarExcel, nombreArchivo } = await import('../lib/excel')
      const buffer = await generarExcel(plantilla, { filas, combustibles, personal: personalActivo })
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      setArchivo({ nombre: nombreArchivo(filas), blob })
      toast.success('Excel generado', { description: 'Envialo por WhatsApp o descargalo.' })
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerando(false)
    }
  }

  function descargar() {
    const url = URL.createObjectURL(archivo.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = archivo.nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  // WhatsApp. Ninguna página puede mandar un archivo sola a un contacto:
  // - Menú de compartir del sistema con el Excel adjunto: solo donde el
  //   navegador lo permite (Chromium no deja compartir .xlsx; Safari/iPhone sí).
  //   Si no, se abre la app de WhatsApp con el mensaje y se descarga el Excel.
  // - WhatsApp Web: no acepta archivos por link, así que se descarga el Excel
  //   y se abre WhatsApp Web con el mensaje para elegir el contacto.
  const esCelular = navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const file = archivo && new File([archivo.blob], archivo.nombre, { type: archivo.blob.type })
  const puedeCompartirArchivo = !!file && !!navigator.canShare?.({ files: [file] })
  const obras = [...new Set(lineas.map((l) => l.obra.trim().toUpperCase()).filter(Boolean))]
  const mensaje = [
    'Hola, ¿cómo estás? Te adjunto la solicitud de combustible (RPO 03 20).',
    `${lineas.length} ${lineas.length === 1 ? 'carga' : 'cargas'} · Total ${pesos(total)}`,
    `Obra: ${obras.join(', ')}`,
    '¡Gracias!',
  ].join('\n')
  const texto = encodeURIComponent(mensaje)

  function abrirWhatsappWeb() {
    setError('')
    descargar()
    if (esCelular) location.href = 'https://wa.me/?text=' + texto
    else window.open('https://web.whatsapp.com/send?text=' + texto, 'whatsapp')
    setAvisoWhatsapp('web')
  }

  // Sin menú de compartir (ej. Brave): abre la app de escritorio con el
  // mensaje y descarga el Excel para adjuntarlo.
  function abrirAppEscritorio() {
    descargar()
    location.href = 'whatsapp://send?text=' + texto
    setAvisoWhatsapp('app')
  }

  async function compartirArchivo() {
    setError('')
    if (!puedeCompartirArchivo) return esCelular ? abrirWhatsappWeb() : abrirAppEscritorio()
    try {
      await navigator.share({ files: [file], text: mensaje })
      setAvisoWhatsapp(null)
    } catch (e) {
      if (e.name === 'AbortError') return
      esCelular ? abrirWhatsappWeb() : abrirAppEscritorio()
    }
  }


  const etiquetaVehiculo = (v) => `${v.modelo}${v.patente ? ' · ' + v.patente : ''}`
  const gruposVehiculos = CATEGORIAS.map((cat) => ({
    titulo: cat.grupo,
    opciones: vehiculosActivos
      .filter((x) => categoriaDe(x) === cat.id)
      .map((x) => ({ valor: x.id, texto: x.modelo, detalle: x.patente ?? '' })),
  }))
  const gruposPersonal = [
    { opciones: personalActivo.map((p) => ({ valor: p.id, texto: p.nombre, detalle: p.dni ? '' : 'sin DNI' })) },
  ]
  const botonWhatsapp =
    'flex-1 border-transparent py-2.5 font-semibold text-white bg-[#1fa855] hover:bg-[#25c063] dark:bg-[#1fa855] dark:text-white dark:hover:bg-[#25c063]'

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-50">Solicitud de combustible</h2>
          <p className="text-xs text-gray-400">Cargá los vehículos y bidones; se genera el Excel RPO 03 20 para enviar por WhatsApp.</p>
        </div>
        <Button variante="secundario" onClick={nuevoPedido} className="shrink-0">
          <RiEraserLine className="size-4" /> <span className="hidden sm:inline">Limpiar todo</span>
        </Button>
      </div>

      {resueltas.map((r, i) => {
        const { l, v, c, esBidon } = r
        const habitual = habitualDe(v)
        const err = intentoGenerar ? r.errores : {}
        const conErrores = intentoGenerar && Object.keys(r.errores).length > 0
        return (
          <Card key={l.uid} className={cx(conErrores && 'border-red-900/70')}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-800 text-xs font-semibold text-gray-300">
                  {i + 1}
                </span>
                <h3 className="truncate text-sm font-semibold text-gray-200">{v ? etiquetaVehiculo(v) : 'Nueva carga'}</h3>
                {esBidon && <Badge color="ambar">bidón</Badge>}
              </div>
              <Button variante="fantasma" className="px-2 py-1 text-gray-400" onClick={() => quitar(l.uid)} aria-label="Quitar carga">
                <RiDeleteBinLine className="size-4" /> <span className="hidden sm:inline">Quitar</span>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo label={esBidon ? 'Vehículo / bidón' : 'Vehículo'} error={err.vehiculo} className="sm:col-span-2">
                <Combobox
                  valor={l.vehiculoId}
                  error={err.vehiculo}
                  placeholder="Buscar vehículo o patente…"
                  grupos={gruposVehiculos}
                  onCambio={(id) => elegirVehiculo(l.uid, vehiculos.find((x) => x.id === id))}
                  accion={{ texto: '+ Agregar vehículo nuevo…', onElegir: () => setDialogoPara(l.uid) }}
                />
              </Campo>
              <Campo label={esBidon ? 'Responsable' : 'Conductor'} error={err.conductor} className="sm:col-span-2">
                <Combobox
                  valor={l.conductorId}
                  error={err.conductor}
                  placeholder={esBidon ? 'Buscar responsable…' : 'Buscar conductor…'}
                  grupos={gruposPersonal}
                  onCambio={(id) => actualizar(l.uid, { conductorId: id, conductorSugerido: false })}
                />
                {!err.conductor && habitual && (
                  l.conductorSugerido && l.conductorId === habitual ? (
                    <span className="mt-1 block text-xs text-brand">
                      Sugerido: {esBidon ? 'responsable' : 'conductor'} habitual de este vehículo. Podés elegir otro.
                    </span>
                  ) : l.conductorId !== habitual ? (
                    <button
                      type="button"
                      className="mt-1 block text-xs text-brand hover:underline"
                      onClick={(e) => {
                        e.preventDefault()
                        actualizar(l.uid, { conductorId: habitual, conductorSugerido: true })
                      }}
                    >
                      Usar el habitual: {personal.find((p) => p.id === habitual)?.nombre}
                    </button>
                  ) : null
                )}
              </Campo>
              <Campo label="Fecha de carga" error={err.fecha}>
                <Input type="date" value={l.fecha} error={err.fecha} onChange={(e) => actualizar(l.uid, { fecha: e.target.value })} />
              </Campo>
              <Campo label="Obra" error={err.obra}>
                <Input value={l.obra} error={err.obra} placeholder="Ej: VGB E3" onChange={(e) => actualizar(l.uid, { obra: e.target.value })} />
              </Campo>
              {esBidon ? (
                <>
                  <Campo label="Combustible">
                    <Select value={l.combustible || v.combustible} onChange={(e) => actualizar(l.uid, { combustible: e.target.value })}>
                      {combustibles.map((x) => (
                        <option key={x.nombre}>{x.nombre}</option>
                      ))}
                    </Select>
                  </Campo>
                  <Campo label="Litros" error={err.litros}>
                    <Input
                      value={l.litros ?? ''}
                      error={err.litros}
                      inputMode="decimal"
                      placeholder="Litros a cargar"
                      onChange={(e) => actualizar(l.uid, { litros: e.target.value.replace(/[^\d,.]/g, '') })}
                    />
                  </Campo>
                </>
              ) : (
                <>
                  <Campo label="Tipo de carga">
                    <Segmentado
                      opciones={[
                        ['lleno', 'Tanque lleno'],
                        ['recarga', 'Recarga'],
                      ]}
                      valor={l.modo}
                      onCambio={(modo) => actualizar(l.uid, { modo })}
                    />
                  </Campo>
                  <Campo label="Km estimados" error={err.km}>
                    {l.modo === 'lleno' ? (
                      <Input value={`${numero(kmLleno)} km`} disabled />
                    ) : (
                      <Input
                        value={l.km}
                        error={err.km}
                        inputMode="numeric"
                        placeholder="Km a recorrer"
                        autoFocus
                        onChange={(e) => actualizar(l.uid, { km: e.target.value.replace(/[^\d]/g, '') })}
                      />
                    )}
                  </Campo>
                </>
              )}
            </div>
            {v && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-gray-950/60 px-3 py-2 text-xs text-gray-400">
                <span>{r.combustible}</span>
                {!esBidon && <span>{numero(Number(v.km_l))} km/l</span>}
                <span>{c ? pesos(Number(c.precio)) + '/l' : 'sin precio'}</span>
                <span>{numero(r.litros)} litros</span>
                <span className="ml-auto text-sm font-semibold text-gray-50 tabular-nums">{pesos(r.monto)}</span>
              </div>
            )}
          </Card>
        )
      })}

      <Button variante="secundario" onClick={agregar} className="w-full border-dashed py-2.5 text-gray-300">
        <RiAddLine className="size-4" /> Agregar otra carga
      </Button>

      {(avisos.length > 0 || archivo) && (
        <Card className="space-y-3">
          {avisos.length > 0 && (
            <Aviso tipo="alerta">
              <ul className="list-disc space-y-0.5 pl-4">
                {[...new Set(avisos)].map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Aviso>
          )}
          {archivo && (
            <Aviso tipo="alerta">
              <b>📎 Importante:</b> WhatsApp no adjunta el Excel automáticamente. Al tocar el botón se descarga el
              archivo y se abre WhatsApp con el mensaje: elegí el contacto y <b>adjuntá el Excel descargado</b>{' '}
              (arrastralo al chat o clip 📎 → Documento, desde la carpeta Descargas) antes de enviar.
            </Aviso>
          )}
          {avisoWhatsapp && (
            <Aviso tipo="info">
              ✅ Se descargó <b>{archivo.nombre}</b> en la carpeta Descargas. Adjuntalo en el chat de{' '}
              {avisoWhatsapp === 'web' ? 'WhatsApp Web' : 'WhatsApp'} antes de enviar.
              {avisoWhatsapp === 'app' && (
                <span className="mt-1 block text-xs opacity-80">
                  Si no se abrió WhatsApp, instalá la app de WhatsApp para Windows (Microsoft Store).
                </span>
              )}
            </Aviso>
          )}
        </Card>
      )}

      {/* Barra fija con el total y las acciones */}
      <div className="sticky bottom-3 z-30">
        <Card className="space-y-2 border-gray-700 bg-gray-900/95 p-3 shadow-2xl shadow-black/60 backdrop-blur sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-baseline justify-between gap-3">
              <span className="text-sm text-gray-400">
                {lineas.length} {lineas.length === 1 ? 'carga' : 'cargas'}
              </span>
              <span className="text-2xl font-semibold text-gray-50 tabular-nums">{pesos(total)}</span>
            </div>
            {!archivo && (
              <Button onClick={generar} isLoading={generando} loadingText="Generando…" className="w-full py-2.5 sm:w-52">
                <RiFileExcel2Line className="size-4" /> Generar Excel
              </Button>
            )}
          </div>
          {intentoGenerar && hayErrores && <Aviso tipo="error">Faltan datos en las cargas marcadas en rojo.</Aviso>}
          {error && <Aviso tipo="error">{error}</Aviso>}
          {archivo && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-brand">
                <RiFileExcel2Line className="size-4 shrink-0" />
                <span className="truncate">{archivo.nombre}</span>
                <Badge color="teal">listo</Badge>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                {esCelular ? (
                  <Button onClick={compartirArchivo} className={botonWhatsapp}>
                    <RiWhatsappLine className="size-4" /> Enviar por WhatsApp
                  </Button>
                ) : (
                  <>
                    <Button onClick={compartirArchivo} className={botonWhatsapp}>
                      <RiWhatsappLine className="size-4" /> WhatsApp escritorio
                    </Button>
                    <Button onClick={abrirWhatsappWeb} className={botonWhatsapp}>
                      <RiWhatsappLine className="size-4" /> WhatsApp Web
                    </Button>
                  </>
                )}
                <Button variante="secundario" onClick={descargar} className="flex-1 py-2.5">
                  <RiDownload2Line className="size-4" /> Descargar
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <VehiculoDialogo
        abierto={!!dialogoPara}
        vehiculo={null}
        personal={personal}
        combustibles={combustibles}
        onCerrar={() => setDialogoPara(null)}
        onGuardado={(v) => {
          onVehiculoNuevo(v)
          elegirVehiculo(dialogoPara, v)
          setDialogoPara(null)
          toast.success(`Vehículo agregado: ${v.modelo} ${v.patente ?? ''}`)
        }}
      />
    </div>
  )
}
