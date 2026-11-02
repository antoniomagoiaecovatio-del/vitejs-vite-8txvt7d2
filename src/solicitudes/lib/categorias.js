// Categorías de vehículo. `particular` se sigue guardando en la base
// (true solo para 'particular') para compatibilidad.
// 'bidon' no es un vehículo: son bidones para grupos electrógenos, se piden
// en litros y en el Excel salen como una fila más (sin km/l ni km).
export const CATEGORIAS = [
  { id: 'utilitario', grupo: 'Flota · Utilitarios', boton: 'Utilitario' },
  { id: 'camion', grupo: 'Flota · Camiones', boton: 'Camión' },
  { id: 'particular', grupo: 'Vehículos particulares', boton: 'Particular' },
  { id: 'bidon', grupo: 'Bidones (grupos electrógenos)', boton: 'Bidón' },
]

// Si la columna `categoria` todavía no tiene el valor, se deduce.
export const categoriaDe = (v) => {
  if (v.categoria && v.categoria !== 'utilitario') return v.categoria
  if (!v.patente && /^bid[oó]n/i.test(v.modelo ?? '')) return 'bidon'
  return v.categoria ?? (v.particular ? 'particular' : 'utilitario')
}
