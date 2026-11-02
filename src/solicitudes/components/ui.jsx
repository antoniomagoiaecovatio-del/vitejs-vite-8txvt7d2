// Componentes base de la app. Por dentro usan los componentes Tremor del
// Panel de Obras Solares (src/tremor) para que las dos apps se vean iguales.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Command } from 'cmdk'
import { RiArrowDownSLine, RiCheckLine, RiSearchLine } from '@remixicon/react'
import { cx } from '../utils/cx'
import { Button as TButton } from '../tremor/Button'
import { Input as TInput } from '../tremor/Input'
import { SelectNative } from '../tremor/SelectNative'
import { Card as TCard } from '../tremor/Card'
import { Badge as TBadge } from '../tremor/Badge'
import { Callout } from '../tremor/Callout'
import { focusInput } from '../utils/focusInput'
import { hasErrorInput } from '../utils/hasErrorInput'

export { cx }

// ------------------------------------------------------------------ básicos

const VARIANTES = { primario: 'primary', secundario: 'secondary', fantasma: 'ghost', peligro: 'destructive', suave: 'light' }

export const Button = React.forwardRef(function Button({ variante = 'primario', type = 'button', className, ...props }, ref) {
  return <TButton ref={ref} type={type} variant={VARIANTES[variante] ?? 'primary'} className={cx('gap-1.5', className)} {...props} />
})

export const Input = React.forwardRef(function Input({ error, className, ...props }, ref) {
  return <TInput ref={ref} hasError={!!error} enableStepper={false} inputClassName={className} {...props} />
})

export function Select({ error, className, children, ...props }) {
  return (
    <SelectNative hasError={!!error} className={className} {...props}>
      {children}
    </SelectNative>
  )
}

export function Campo({ label, error, ayuda, children, className }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-red-400">{error}</span>
      ) : ayuda ? (
        <span className="mt-1 block text-xs text-gray-500">{ayuda}</span>
      ) : null}
    </label>
  )
}

export function Card({ className, ...props }) {
  return <TCard className={cx('p-4 sm:p-5', className)} {...props} />
}

export function Seccion({ titulo, extra, children, className }) {
  return (
    <Card className={className}>
      {(titulo || extra) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-gray-200">{titulo}</h3>
          {extra}
        </div>
      )}
      {children}
    </Card>
  )
}

const BADGES = { gris: 'neutral', ambar: 'warning', rojo: 'error', teal: 'success' }
export function Badge({ color = 'gris', ...props }) {
  return <TBadge variant={BADGES[color] ?? 'neutral'} {...props} />
}

const AVISOS = { info: 'success', alerta: 'warning', error: 'error', neutro: 'neutral' }
export function Aviso({ tipo = 'info', children, className }) {
  return (
    <Callout variant={AVISOS[tipo] ?? 'default'} className={cx('p-3', className)}>
      {children}
    </Callout>
  )
}

// Botonera de dos o más opciones (ej: Tanque lleno / Recarga)
export function Segmentado({ opciones, valor, onCambio, className }) {
  return (
    <div className={cx('grid gap-1 rounded-md border border-gray-800 bg-gray-950 p-1', className)} style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map(([id, texto]) => (
        <button
          key={id}
          type="button"
          onClick={() => onCambio(id)}
          className={cx(
            'rounded px-2 py-1 text-sm transition',
            valor === id ? 'bg-brand font-semibold text-gray-950' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200',
          )}
        >
          {texto}
        </button>
      ))}
    </div>
  )
}

// ------------------------------------------------------------------ diálogo

export function Dialogo({ abierto, titulo, onCerrar, children, ancho = 'sm:max-w-lg' }) {
  useEffect(() => {
    if (!abierto) return
    const esc = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [abierto, onCerrar])
  if (!abierto) return null
  return (
    <div
      className="animate-dialog-overlay-show fixed inset-0 z-50 flex items-end justify-center bg-gray-950/80 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={onCerrar}
    >
      <div
        className={cx(
          'animate-dialog-content-show max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-gray-800 bg-gray-900 p-5 shadow-2xl shadow-black/50 sm:rounded-xl',
          ancho,
        )}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={titulo}
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-50">{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

// Confirmación con diseño propio (reemplaza window.confirm).
const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [pedido, setPedido] = useState(null) // { mensaje, textoOk, peligro, resolver }
  const confirmar = useCallback(
    (mensaje, { textoOk = 'Aceptar', peligro = false } = {}) =>
      new Promise((resolver) => setPedido({ mensaje, textoOk, peligro, resolver })),
    [],
  )
  const cerrar = (resultado) => {
    pedido?.resolver(resultado)
    setPedido(null)
  }
  return (
    <ConfirmContext.Provider value={confirmar}>
      {children}
      <Dialogo abierto={!!pedido} titulo="Confirmar" onCerrar={() => cerrar(false)} ancho="sm:max-w-sm">
        <p className="text-sm text-gray-300">{pedido?.mensaje}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variante="secundario" onClick={() => cerrar(false)}>Cancelar</Button>
          <Button variante={pedido?.peligro ? 'peligro' : 'primario'} onClick={() => cerrar(true)} autoFocus>
            {pedido?.textoOk}
          </Button>
        </div>
      </Dialogo>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = () => useContext(ConfirmContext)

// ------------------------------------------------------------------ dinero

const formatearMiles = (crudo) => {
  if (crudo == null || crudo === '') return ''
  const neg = crudo.startsWith('-')
  const [ent, dec] = crudo.replace('-', '').split(',')
  const entFmt = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return (neg ? '-' : '') + entFmt + (dec !== undefined ? ',' + dec : '')
}

// Campo de dinero: muestra "280.000" pero guarda "280000" (coma = decimales).
export function MoneyInput({ value, onChange, negativo = false, decimales = false, prefijo = '$', className, ...props }) {
  const limpiar = (texto) => {
    let s = texto.replace(/\./g, '').replace(decimales ? /[^\d,-]/g : /[^\d-]/g, '')
    s = negativo ? s.replace(/(?!^)-/g, '') : s.replace(/-/g, '')
    if (decimales) {
      const [a, ...b] = s.split(',')
      s = b.length ? `${a},${b.join('').slice(0, 2)}` : a
    }
    return s
  }
  return (
    <div className="relative">
      {prefijo && (
        <span className="pointer-events-none absolute top-1/2 left-2.5 z-10 -translate-y-1/2 text-sm text-gray-500">{prefijo}</span>
      )}
      <Input
        value={formatearMiles(value ?? '')}
        onChange={(e) => onChange(limpiar(e.target.value))}
        inputMode={decimales ? 'decimal' : 'numeric'}
        className={cx(prefijo && (prefijo.length > 1 ? 'pl-10' : 'pl-6'), 'tabular-nums', className)}
        {...props}
      />
    </div>
  )
}

// ------------------------------------------------------------------ selector con buscador

const normalizar = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

/**
 * Lista desplegable con buscador.
 * grupos: [{ titulo?, opciones: [{ valor, texto, detalle? }] }]
 * accion: { texto, onElegir } — opción extra al final (ej: "+ Agregar vehículo")
 */
export function Combobox({ valor, onCambio, grupos, placeholder = 'Elegir…', error, accion, vacio = 'Sin resultados' }) {
  const [abierto, setAbierto] = useState(false)
  const opciones = useMemo(() => grupos.flatMap((g) => g.opciones), [grupos])
  const elegida = opciones.find((o) => o.valor === valor)
  const ref = useRef(null)
  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button
          ref={ref}
          type="button"
          className={cx(
            'relative flex w-full items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm shadow-xs outline-hidden transition',
            'border-gray-800 bg-gray-950 text-gray-50 hover:border-gray-700',
            focusInput,
            error && hasErrorInput,
          )}
        >
          <span className={cx('truncate', !elegida && 'text-gray-500')}>
            {elegida ? (
              <>
                {elegida.texto}
                {elegida.detalle && <span className="ml-2 text-xs text-gray-500">{elegida.detalle}</span>}
              </>
            ) : (
              placeholder
            )}
          </span>
          <RiArrowDownSLine className="size-4 shrink-0 text-gray-500" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="animate-slide-down-and-fade z-50 w-[var(--radix-popover-trigger-width)] min-w-64 overflow-hidden rounded-md border border-gray-800 bg-gray-900 shadow-xl shadow-black/50"
        >
          <Command filter={(v, busca) => (normalizar(v).includes(normalizar(busca)) ? 1 : 0)}>
            <div className="flex items-center gap-2 border-b border-gray-800 px-2.5">
              <RiSearchLine className="size-4 text-gray-500" />
              <Command.Input
                autoFocus
                placeholder="Buscar…"
                className="w-full bg-transparent py-2 text-sm text-gray-50 outline-hidden placeholder:text-gray-500"
              />
            </div>
            <Command.List className="max-h-72 overflow-y-auto p-1">
              <Command.Empty className="px-2 py-3 text-center text-sm text-gray-500">{vacio}</Command.Empty>
              {grupos.map((g, i) =>
                g.opciones.length ? (
                  <Command.Group
                    key={g.titulo ?? i}
                    heading={g.titulo}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-gray-500 [&_[cmdk-group-heading]]:uppercase"
                  >
                    {g.opciones.map((o) => (
                      <Command.Item
                        key={o.valor}
                        value={`${o.texto} ${o.detalle ?? ''} ${o.valor}`}
                        onSelect={() => {
                          onCambio(o.valor)
                          setAbierto(false)
                        }}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-sm text-gray-200 data-[selected=true]:bg-gray-800 data-[selected=true]:text-gray-50"
                      >
                        <span className="truncate">
                          {o.texto}
                          {o.detalle && <span className="ml-2 text-xs text-gray-500">{o.detalle}</span>}
                        </span>
                        {o.valor === valor && <RiCheckLine className="size-4 shrink-0 text-brand" />}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null,
              )}
              {accion && (
                <Command.Group forceMount>
                  <Command.Item
                    forceMount
                    value="__accion__"
                    onSelect={() => {
                      setAbierto(false)
                      accion.onElegir()
                    }}
                    className="mt-1 cursor-pointer rounded border-t border-gray-800 px-2 py-1.5 text-sm text-brand data-[selected=true]:bg-gray-800"
                  >
                    {accion.texto}
                  </Command.Item>
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

// ------------------------------------------------------------------ carga

export function Esqueleto({ className }) {
  return <div className={cx('animate-pulse rounded-md bg-gray-800/60', className)} />
}
