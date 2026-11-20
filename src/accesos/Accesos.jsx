// "Accesos de usuarios": el administrador elige qué herramientas con clave puede usar cada persona.
// Los usuarios se crean en Supabase (Authentication → Users); acá solo se les autorizan herramientas.
// Solo lo abren los usuarios con el permiso 'admin' (ver auth/permisos.js y supabase-permisos.sql).
import React, { useCallback, useEffect, useState } from 'react'
import { RiLogoutBoxRLine, RiRefreshLine } from '@remixicon/react'
import { Toaster, toast } from 'sonner'
import RequiereLogin from '../auth/RequiereLogin'
import { MODO_DEMO } from '../auth/auth'
import { HERRAMIENTAS, guardarPermiso, listarUsuariosConPermisos } from '../auth/permisos'
import { Aviso, Button, Card, cx } from '../solicitudes/components/ui'

export default function Accesos() {
  return (
    <>
      <Toaster theme="dark" position="top-center" richColors closeButton />
      <RequiereLogin titulo="Accesos de usuarios" subtitulo="Solo administradores · acceso con usuario" herramienta="admin">
        {({ email, salir }) => <Contenido email={email} salir={salir} />}
      </RequiereLogin>
    </>
  )
}

const COLUMNAS = [...HERRAMIENTAS.map((h) => ({ id: h.id, texto: h.corto })), { id: 'admin', texto: 'Administrador' }]

const fechaCorta = (iso) => {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function Contenido({ email, salir }) {
  const [usuarios, setUsuarios] = useState(null)
  const [error, setError] = useState('')
  const [faltaSql, setFaltaSql] = useState(false)
  const [guardando, setGuardando] = useState('') // "email|permiso"
  const yo = String(email).toLowerCase()

  const cargar = useCallback(async () => {
    try {
      setUsuarios(await listarUsuariosConPermisos(email))
      setError('')
      setFaltaSql(false)
    } catch (e) {
      setUsuarios([])
      if (e.faltaSql) setFaltaSql(true)
      else setError('No se pudieron cargar los usuarios: ' + e.message)
    }
  }, [email])

  useEffect(() => {
    cargar()
  }, [cargar])

  const cambiar = async (u, permiso, activo) => {
    const clave = `${u.email}|${permiso}`
    setGuardando(clave)
    // Se refleja al instante y se vuelve atrás si falla
    setUsuarios((lista) => lista.map((x) => (x.email === u.email ? { ...x, permisos: activo ? [...x.permisos, permiso] : x.permisos.filter((p) => p !== permiso) } : x)))
    try {
      await guardarPermiso(u.email, permiso, activo)
    } catch (e) {
      toast.error('No se pudo guardar: ' + e.message)
      cargar()
    } finally {
      setGuardando('')
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] pb-10">
      <div className="mb-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">Accesos de usuarios</h2>
          <div className="truncate text-xs text-gray-400">Quién puede usar cada herramienta con clave{MODO_DEMO && ' · modo demo'}</div>
        </div>
        <span className="hidden max-w-[14rem] truncate text-xs text-gray-400 sm:inline" title={email}>{email}</span>
        <Button variante="secundario" onClick={salir} aria-label="Salir">
          <RiLogoutBoxRLine className="size-4" />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </div>

      {faltaSql && (
        <Aviso tipo="alerta" className="mb-4">
          Falta crear el sistema de accesos en Supabase: ejecutá una vez el archivo <b>supabase-permisos.sql</b> en el SQL Editor (y después tu email como administrador, según las
          instrucciones). Mientras no se haga, todas las herramientas están abiertas para cualquier usuario con sesión.
        </Aviso>
      )}
      {error && <Aviso tipo="error" className="mb-4">{error}</Aviso>}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-300">
            Tildá las herramientas que cada persona puede usar. El <b>Administrador</b> accede a todo y además puede cambiar esta pantalla.
          </p>
          <Button variante="secundario" onClick={cargar}><RiRefreshLine className="size-4" />Actualizar</Button>
        </div>
        {!usuarios ? (
          <div className="py-8 text-center text-sm text-gray-400">Cargando…</div>
        ) : usuarios.length === 0 && !faltaSql ? (
          <div className="py-8 text-center text-sm text-gray-400">No hay usuarios cargados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-[11px] font-medium text-gray-500">
                  <th className="py-2 pr-3">Usuario</th>
                  <th className="py-2 pr-3">Último acceso</th>
                  {COLUMNAS.map((c) => <th key={c.id} className="px-2 py-2 text-center">{c.texto}</th>)}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const esAdmin = u.permisos.includes('admin')
                  return (
                    <tr key={u.email} className="border-b border-gray-800/60 last:border-0">
                      <td className="py-2 pr-3">
                        <div className="text-gray-100">{u.email}</div>
                        {u.email === yo && <div className="text-[11px] text-gray-500">Vos</div>}
                      </td>
                      <td className="py-2 pr-3 tabular-nums text-gray-400">{fechaCorta(u.ultimoAcceso)}</td>
                      {COLUMNAS.map((c) => {
                        const marcado = u.permisos.includes(c.id) || (esAdmin && c.id !== 'admin')
                        // No se puede quitar el propio administrador (para no quedarse afuera) ni tildar lo que el administrador ya tiene
                        const bloqueado = (c.id === 'admin' && u.email === yo) || (esAdmin && c.id !== 'admin') || guardando === `${u.email}|${c.id}`
                        return (
                          <td key={c.id} className="px-2 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={marcado}
                              disabled={bloqueado}
                              onChange={(e) => cambiar(u, c.id, e.target.checked)}
                              aria-label={`${c.texto} para ${u.email}`}
                              className={cx('size-4 accent-[#95de1d]', bloqueado ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="mt-3 text-xs text-gray-500">
        Para dar de alta a una persona nueva, creala en Supabase (Authentication → Users → Add user) y después tocá Actualizar acá: aparece sin herramientas autorizadas.
        Para sacarle el acceso a alguien por completo, borrá su usuario en Supabase.
      </p>
    </div>
  )
}
