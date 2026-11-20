// Registro de uso de Soltrack: cada vez que alguien genera algo (un presupuesto, una solicitud, un informe) se guarda
// una fila en la tabla `registro_uso` de Supabase (ver supabase-registro-uso.sql). Solo los administradores pueden
// leerla (pestaña "Uso del programa" de Accesos y uso). Se guarda quién, qué y cuándo; en `detalle` solo datos
// chicos y no sensibles (por ejemplo el tipo de servicio o la cantidad de cargas), nunca montos ni nombres de clientes.
//
// Registrar nunca debe romper una herramienta: todo es "disparar y olvidar" y los errores se ignoran.

/** Qué se cuenta: herramienta + acción → rótulo de la columna. */
export const CONCEPTOS = [
  { k: 'estimador.calculo', t: 'Estimador: estimaciones', c: 'Estimaciones calculadas con el Estimador de obras FV' },
  { k: 'estimador.pdf', t: 'Estimador: PDF', c: 'Informes PDF exportados del Estimador' },
  { k: 'solicitudes.combustible', t: 'Combustible', c: 'Solicitudes de combustible (Excel generado)' },
  { k: 'solicitudes.viaticos', t: 'Viáticos', c: 'Solicitudes de viáticos (Excel descargado)' },
  { k: 'cables.pdf', t: 'Cables: informes', c: 'Informes PDF de dimensionamiento de cables' },
  { k: 'presupuestador.pdf_cliente', t: 'Postventa: PDF cliente', c: 'Presupuestos de visitas postventa (PDF para el cliente)' },
  { k: 'presupuestador.pdf_interno', t: 'Postventa: PDF interno', c: 'PDF internos del presupuestador postventa' },
  { k: 'presupuestador.excel', t: 'Postventa: Excel', c: 'Excel del presupuestador postventa' },
]

const DEMO = 'demo-registro-uso'

/** Anota un uso. `detalle` es un objeto chico (opcional). Nunca lanza errores. */
export function registrarUso(herramienta, accion, detalle = null) {
  import('./auth')
    .then(async ({ MODO_DEMO, supabase, sesionActual }) => {
      const sesion = await sesionActual()
      if (!sesion?.email) return
      const fila = { email: String(sesion.email).toLowerCase(), herramienta, accion, detalle }
      if (MODO_DEMO) {
        const lista = JSON.parse(localStorage.getItem(DEMO) || '[]')
        lista.push({ ...fila, created_at: new Date().toISOString() })
        localStorage.setItem(DEMO, JSON.stringify(lista.slice(-2000)))
        return
      }
      await supabase.from('registro_uso').insert(fila)
    })
    .catch(() => {
      /* el registro nunca debe molestar al usuario */
    })
}

/** Para administradores: usos desde una fecha (ISO). @returns {{ filas: object[], falta: boolean }} */
export async function leerUso(desdeISO) {
  const { MODO_DEMO, supabase } = await import('./auth')
  if (MODO_DEMO) {
    const lista = JSON.parse(localStorage.getItem(DEMO) || '[]')
    return { filas: lista.filter((f) => f.created_at >= desdeISO).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)), falta: false }
  }
  const { data, error } = await supabase
    .from('registro_uso')
    .select('created_at,email,herramienta,accion,detalle')
    .gte('created_at', desdeISO)
    .order('created_at', { ascending: false })
    .limit(20000)
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /does not exist|Could not find the table/i.test(error.message || '')) {
      return { filas: [], falta: true }
    }
    throw new Error(error.message)
  }
  return { filas: data, falta: false }
}
