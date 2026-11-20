// "Uso del programa": cuántas veces usa cada persona cada herramienta, por semana o por mes.
// Los datos salen de la tabla `registro_uso` (ver auth/registroUso.js y supabase-registro-uso.sql).
import React, { useEffect, useMemo, useState } from 'react'
import { RiRefreshLine } from '@remixicon/react'
import { Aviso, Button, Card, Segmentado, Select, cx } from '../solicitudes/components/ui'
import { CONCEPTOS, leerUso } from '../auth/registroUso'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const dd = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
const ddmmaa = (d) => `${dd(d)}/${d.getFullYear()}`

// Lunes de la semana de una fecha (hora local)
function lunesDe(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

// Lista de períodos, del más reciente al más viejo
function armarPeriodos(agrupar, cantidad) {
  const hoy = new Date()
  const lista = []
  for (let i = 0; i < cantidad; i++) {
    if (agrupar === 'semana') {
      const ini = lunesDe(hoy)
      ini.setDate(ini.getDate() - 7 * i)
      const fin = new Date(ini)
      fin.setDate(fin.getDate() + 7)
      const domingo = new Date(fin)
      domingo.setDate(domingo.getDate() - 1)
      lista.push({ ini, fin, etiqueta: `${dd(ini)} al ${dd(domingo)}`, largo: `Semana del ${dd(ini)} al ${ddmmaa(domingo)}${i === 0 ? ' (actual)' : ''}` })
    } else {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1)
      lista.push({ ini, fin, etiqueta: `${MESES[ini.getMonth()]} ${ini.getFullYear()}`, largo: `${MESES[ini.getMonth()]} ${ini.getFullYear()}${i === 0 ? ' (actual)' : ''}` })
    }
  }
  return lista
}

const cuenta = (filas) => {
  const m = {}
  filas.forEach((f) => {
    const k = `${f.herramienta}.${f.accion}`
    m[k] = (m[k] || 0) + 1
  })
  return m
}

function Tabla({ titulo, ayuda, filas, primeraColumna, totales }) {
  return (
    <Card>
      <h3 className="text-sm font-semibold tracking-wide text-gray-200">{titulo}</h3>
      {ayuda && <p className="mb-3 mt-0.5 text-xs text-gray-500">{ayuda}</p>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-[11px] font-medium text-gray-500">
              <th className="py-2 pr-3 text-left">{primeraColumna}</th>
              {CONCEPTOS.map((c) => (
                <th key={c.k} title={c.c} className="px-2 py-2 text-center leading-tight">{c.t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.clave} className="border-b border-gray-800/60 last:border-0">
                <td className="py-2 pr-3 text-gray-100">{f.etiqueta}</td>
                {CONCEPTOS.map((c) => {
                  const n = f.cuentas[c.k] || 0
                  return <td key={c.k} className={cx('px-2 py-2 text-center tabular-nums', n ? 'font-semibold text-gray-50' : 'text-gray-600')}>{n || '·'}</td>
                })}
              </tr>
            ))}
          </tbody>
          {totales && (
            <tfoot>
              <tr className="border-t border-gray-700">
                <td className="py-2 pr-3 text-xs font-bold uppercase tracking-wide text-gray-400">Total</td>
                {CONCEPTOS.map((c) => (
                  <td key={c.k} className="px-2 py-2 text-center font-bold tabular-nums text-[#95de1d]">{totales[c.k] || 0}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </Card>
  )
}

export default function Uso() {
  const [agrupar, setAgrupar] = useState('semana')
  const [indice, setIndice] = useState(0)
  const [datos, setDatos] = useState(null) // { filas, falta }
  const [error, setError] = useState('')

  const periodos = useMemo(() => armarPeriodos(agrupar, 12), [agrupar])
  const periodo = periodos[Math.min(indice, periodos.length - 1)]

  const cargar = async () => {
    setError('')
    try {
      // Se traen los últimos 12 meses (alcanza para 12 meses y para 12 semanas)
      const d = new Date()
      d.setMonth(d.getMonth() - 12)
      setDatos(await leerUso(d.toISOString()))
    } catch (e) {
      setDatos({ filas: [], falta: false })
      setError('No se pudo leer el registro de uso: ' + e.message)
    }
  }
  useEffect(() => {
    cargar()
  }, [])
  useEffect(() => setIndice(0), [agrupar])

  const filas = useMemo(() => (datos?.filas || []).map((f) => ({ ...f, fecha: new Date(f.created_at) })), [datos])
  const dentro = (lista, p) => lista.filter((f) => f.fecha >= p.ini && f.fecha < p.fin)

  // Tabla 1: por usuario en el período elegido
  const delPeriodo = periodo ? dentro(filas, periodo) : []
  const usuarios = [...new Set(delPeriodo.map((f) => f.email))].sort()
  const porUsuario = usuarios.map((u) => ({ clave: u, etiqueta: u, cuentas: cuenta(delPeriodo.filter((f) => f.email === u)) }))
  const totalPeriodo = cuenta(delPeriodo)

  // Tabla 2: evolución (todas las personas)
  const evol = periodos.slice(0, agrupar === 'semana' ? 8 : 6).map((p) => ({ clave: p.etiqueta, etiqueta: p.etiqueta, cuentas: cuenta(dentro(filas, p)) }))

  const ultimos = filas.slice(0, 25)
  const nombreConcepto = (f) => CONCEPTOS.find((c) => c.k === `${f.herramienta}.${f.accion}`)?.t || `${f.herramienta} · ${f.accion}`

  return (
    <div className="grid gap-4">
      {datos?.falta && (
        <Aviso tipo="alerta">
          Todavía no existe el registro de uso en Supabase. Ejecutá una vez el archivo <b>supabase-registro-uso.sql</b> en el SQL Editor; desde ese momento se empieza a registrar.
          No se pueden recuperar usos anteriores.
        </Aviso>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <div className="mb-1 text-xs font-medium text-gray-400">Ver por</div>
            <Segmentado className="w-56" opciones={[['semana', 'Semana'], ['mes', 'Mes']]} valor={agrupar} onCambio={setAgrupar} />
          </div>
          <div className="min-w-[14rem] flex-1">
            <div className="mb-1 text-xs font-medium text-gray-400">Período</div>
            <Select value={String(indice)} onChange={(e) => setIndice(Number(e.target.value))}>
              {periodos.map((p, i) => <option key={i} value={i}>{p.largo}</option>)}
            </Select>
          </div>
          <Button variante="secundario" onClick={cargar}><RiRefreshLine className="size-4" />Actualizar</Button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Se cuenta cada vez que alguien genera algo: una estimación, un PDF, un Excel o una solicitud. Los usos se empiezan a registrar desde que está activo el registro.
        </p>
      </Card>

      {!datos ? (
        <div className="py-8 text-center text-sm text-gray-400">Cargando…</div>
      ) : (
        <>
          <Tabla
            titulo={`Por persona · ${periodo?.largo || ''}`}
            primeraColumna="Persona"
            filas={porUsuario.length ? porUsuario : []}
            totales={porUsuario.length ? totalPeriodo : null}
          />
          {porUsuario.length === 0 && <p className="-mt-2 px-1 text-sm text-gray-500">Sin actividad registrada en este período.</p>}

          <Tabla
            titulo={agrupar === 'semana' ? 'Evolución por semana (todas las personas)' : 'Evolución por mes (todas las personas)'}
            primeraColumna={agrupar === 'semana' ? 'Semana (lunes a domingo)' : 'Mes'}
            filas={evol}
          />

          <Card>
            <h3 className="mb-2 text-sm font-semibold tracking-wide text-gray-200">Últimos movimientos</h3>
            {ultimos.length === 0 ? (
              <p className="text-sm text-gray-500">Todavía no hay movimientos registrados.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[30rem] text-sm">
                  <tbody>
                    {ultimos.map((f, i) => (
                      <tr key={i} className="border-b border-gray-800/60 last:border-0">
                        <td className="py-1.5 pr-3 tabular-nums text-gray-400">{ddmmaa(f.fecha)} {String(f.fecha.getHours()).padStart(2, '0')}:{String(f.fecha.getMinutes()).padStart(2, '0')}</td>
                        <td className="py-1.5 pr-3 text-gray-100">{f.email}</td>
                        <td className="py-1.5 text-gray-300">{nombreConcepto(f)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
