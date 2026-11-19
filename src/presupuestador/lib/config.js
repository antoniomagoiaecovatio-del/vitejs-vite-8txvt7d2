// Parámetros del Presupuestador de visitas / intervenciones postventa.
// Los valores iniciales son los de la planilla "Presupuestador_PostVenta" (hoja Configuración).
// Los vehículos, consumos y precios de combustible NO están acá: se leen de Solicitudes (ver flota.js).
// Se editan en la pestaña Configuración y se guardan compartidos para todo el equipo (ver datos.js).

export const CONFIG_INICIAL = {
  tipoCambio: '1510', // ARS por USD
  ganancia: '50', // % de recargo sobre el costo
  viaticoDia: '10000', // ARS por persona y por día
  alojamientoNoche: '60000', // ARS por persona y por noche
  peaje: '2500', // ARS por peaje
  moIngenieroUsd: '100', // USD por día
  moTecnicoUsd: '80', // USD por día
}

export const TIPOS_SERVICIO = ['Post Venta', 'Servicio', 'Relevamiento']

export const NOTAS_INICIALES = [
  'Valores expresados en Dólares Estadounidenses (USD).',
  'El servicio no incluye materiales adicionales no especificados.',
]

export const VALIDEZ_INICIAL = '15'

export const FILAS_REPUESTOS = 20

/** Datos de un presupuesto nuevo */
export function datosVacios(hoyISO) {
  return {
    cliente: '',
    fecha: hoyISO,
    obra: '',
    descripcion: '',
    tipo: 'Post Venta',
    vehiculo: '',
    km: '',
    peajes: '',
    ingenieros: '',
    diasIngenieros: '',
    tecnicos: '',
    diasTecnicos: '',
    noches: '',
    viaticos: true,
    validez: VALIDEZ_INICIAL,
    notas: [...NOTAS_INICIALES],
    repuestos: Array.from({ length: FILAS_REPUESTOS }, () => ({ desc: '', cant: '', precio: '' })),
  }
}
