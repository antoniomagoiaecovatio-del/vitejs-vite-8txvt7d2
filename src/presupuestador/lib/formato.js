// Formatos de número y fecha (es-AR) del presupuestador.
const nf = (d) => new Intl.NumberFormat('es-AR', { minimumFractionDigits: d, maximumFractionDigits: d })
export const f0 = nf(0)
export const f1 = nf(1)
export const f2 = nf(2)

export const usd = (v) => (Number.isFinite(v) ? `USD ${f2.format(v)}` : '—')
export const ars = (v) => (Number.isFinite(v) ? `ARS ${f0.format(v)}` : '—')

/** "2026-11-19" → "19/11/2026" */
export function fechaCorta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''))
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** Fecha de hoy en formato ISO local (no UTC) */
export function hoyISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const slug = (s) =>
  String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)

/** Descarga un Blob / ArrayBuffer como archivo */
export function descargarArchivo(datos, nombre, tipo) {
  const blob = datos instanceof Blob ? datos : new Blob([datos], { type: tipo })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
