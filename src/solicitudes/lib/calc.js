export const normalizarPatente = (s) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export const redondear2 = (n) => Math.round(n * 100) / 100

// Litros = km / (km/l); Monto = precio × litros, en pesos enteros.
// El monto se calcula sobre los litros ya redondeados para que en el Excel
// se cumpla Precio × Litros ≈ Monto.
export function calcularCarga({ km, kmL, precio }) {
  if (!(km > 0) || !(kmL > 0) || !(precio >= 0)) return { litros: null, monto: null }
  const litros = redondear2(km / kmL)
  return { litros, monto: Math.round(precio * litros) }
}

const fmtPesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const fmtNum = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

export const pesos = (n) => (n == null ? '—' : fmtPesos.format(n))
export const numero = (n) => (n == null ? '—' : fmtNum.format(n))

// Fecha local (no UTC) en formato YYYY-MM-DD.
export const fechaLocalISO = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const hoyISO = () => fechaLocalISO()

// Acepta 'YYYY-MM-DD' o un timestamp ISO completo (que se pasa a hora local).
export const fechaCorta = (iso) => {
  if (!iso) return ''
  const dia = iso.length > 10 ? fechaLocalISO(new Date(iso)) : iso
  const [y, m, d] = dia.split('-')
  return `${d}/${m}/${y}`
}
