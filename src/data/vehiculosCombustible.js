// Flota de vehículos y precio de combustible, para calcular el gasto de
// combustible de la calculadora de obras (solapa "Estimar duración de obras
// FV"). Copiado una sola vez, a mano, desde
// "HERRAMIENTASS/SOLICITUD DE COMBUSTIBLE/solicitud-combustible/BASE-DE-DATOS.md"
// (exportado de ese Supabase el 01/10/2026, tipo de cambio fijo US$ 1 = $ 1.545).
// No se vuelve a conectar con esa base: si cambian los vehículos o los
// precios, hay que actualizar este archivo a mano.
//
// Para actualizar: copiar los valores de "US$ / litro" de la tabla de precios
// de combustible de ese documento y el "km/l" y "Combustible" de cada
// vehículo en la tabla de la flota.
//
// Generalizado por modelo: los vehículos con la misma marca/modelo, el mismo
// consumo y el mismo combustible se muestran una sola vez (ej. las 3 Fiat
// Fiorino son un solo ítem); "cantidad" en el formulario reemplaza a elegir
// cada patente. "unidades" es solo informativo: cuántas hay en la flota.
// No se incluyen los vehículos particulares (Chevrolet Corsa, Ford Focus,
// VW Gol Trend): no entran en esta calculadora.

// Precio del combustible en USD por litro (tipo de cambio 1.545, fijo).
export const PRECIO_COMBUSTIBLE_USD_LITRO = {
  'Nafta Súper': 1.421,
  'Nafta Infinia': 1.583,
  'Diesel Común': 1.595,
  'Diesel Infinia': 1.729,
  GNC: 0.407,
};

export const VEHICULOS_FLOTA = [
  // ── Utilitarios ──
  { id: 'fiat-fiorino', nombre: 'Fiat Fiorino', unidades: 3, kmPorLitro: 12, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { id: 'fiat-uno', nombre: 'Fiat Uno', unidades: 1, kmPorLitro: 13, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { id: 'ford-f100', nombre: 'Ford F-100', unidades: 1, kmPorLitro: 9, combustible: 'Diesel Común', categoria: 'Utilitarios' },
  { id: 'ford-ranger', nombre: 'Ford Ranger', unidades: 1, kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },
  { id: 'renault-clio', nombre: 'Renault Clio', unidades: 1, kmPorLitro: 13, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { id: 'renault-kangoo', nombre: 'Renault Kangoo', unidades: 3, kmPorLitro: 11, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { id: 'toyota-hilux', nombre: 'Toyota Hilux', unidades: 4, kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },

  // ── Camiones ──
  { id: 'ford-f4000', nombre: 'Ford F-4000', unidades: 1, kmPorLitro: 6, combustible: 'Diesel Común', categoria: 'Camiones' },
  // Iveco Daily: 3 unidades andan con Diesel Infinia y 1 con Diesel Común
  // (distinto gasto por litro) — quedan como dos ítems separados.
  { id: 'iveco-daily-infinia', nombre: 'Iveco Daily', unidades: 3, kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Camiones' },
  { id: 'iveco-daily-comun', nombre: 'Iveco Daily', unidades: 1, kmPorLitro: 10, combustible: 'Diesel Común', categoria: 'Camiones' },
  { id: 'iveco-tector', nombre: 'Iveco Tector', unidades: 1, kmPorLitro: 4, combustible: 'Diesel Infinia', categoria: 'Camiones' },
  { id: 'mercedes-atego', nombre: 'Mercedes-Benz Atego', unidades: 1, kmPorLitro: 4, combustible: 'Diesel Infinia', categoria: 'Camiones' },
].map((v) => ({
  ...v,
  precioLitroUsd: PRECIO_COMBUSTIBLE_USD_LITRO[v.combustible],
}));

export const CATEGORIAS_VEHICULOS = ['Utilitarios', 'Camiones'];
