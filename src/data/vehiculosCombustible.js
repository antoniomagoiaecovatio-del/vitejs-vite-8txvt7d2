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

// Precio del combustible en USD por litro (tipo de cambio 1.545, fijo).
export const PRECIO_COMBUSTIBLE_USD_LITRO = {
  'Nafta Súper': 1.421,
  'Nafta Infinia': 1.583,
  'Diesel Común': 1.595,
  'Diesel Infinia': 1.729,
  GNC: 0.407,
};

// No incluye "Bidón de Nafta" (grupo electrógeno: se pide en litros, no
// tiene km/l ni viaja).
export const VEHICULOS_FLOTA = [
  // ── Utilitarios ──
  { nombre: 'Fiat Fiorino', patente: 'AB666JB', kmPorLitro: 12, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Fiat Fiorino', patente: 'AB929RE', kmPorLitro: 12, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Fiat Fiorino', patente: 'NNS221', kmPorLitro: 12, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Fiat Uno', patente: 'NMQ238', kmPorLitro: 13, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Ford F-100', patente: 'BJP664', kmPorLitro: 9, combustible: 'Diesel Común', categoria: 'Utilitarios' },
  { nombre: 'Ford Ranger', patente: 'OAO960', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },
  { nombre: 'Renault Clio', patente: 'PLS555', kmPorLitro: 13, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Renault Kangoo', patente: 'AB412MK', kmPorLitro: 11, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Renault Kangoo', patente: 'AB412ML', kmPorLitro: 11, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Renault Kangoo', patente: 'AB853XI', kmPorLitro: 11, combustible: 'Nafta Súper', categoria: 'Utilitarios' },
  { nombre: 'Toyota Hilux', patente: 'AA053EX', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },
  { nombre: 'Toyota Hilux', patente: 'AG138OO', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },
  { nombre: 'Toyota Hilux', patente: 'AG303HR', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },
  { nombre: 'Toyota Hilux', patente: 'AG672WD', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Utilitarios' },

  // ── Camiones ──
  { nombre: 'Ford F-4000', patente: 'PHM752', kmPorLitro: 6, combustible: 'Diesel Común', categoria: 'Camiones' },
  { nombre: 'Iveco Daily', patente: 'AA316TH', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Camiones' },
  { nombre: 'Iveco Daily', patente: 'AB352DT', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Camiones' },
  { nombre: 'Iveco Daily', patente: 'AG220DI', kmPorLitro: 10, combustible: 'Diesel Infinia', categoria: 'Camiones' },
  { nombre: 'Iveco Daily', patente: 'GLY209', kmPorLitro: 10, combustible: 'Diesel Común', categoria: 'Camiones' },
  { nombre: 'Iveco Tector', patente: 'NQH984', kmPorLitro: 4, combustible: 'Diesel Infinia', categoria: 'Camiones' },
  { nombre: 'Mercedes-Benz Atego', patente: 'AC892EQ', kmPorLitro: 4, combustible: 'Diesel Infinia', categoria: 'Camiones' },

  // ── Vehículos particulares ──
  { nombre: 'Chevrolet Corsa', patente: 'GOG235', kmPorLitro: 12.5, combustible: 'Nafta Súper', categoria: 'Particulares' },
  { nombre: 'Ford Focus', patente: 'HBU804', kmPorLitro: 12.5, combustible: 'Nafta Súper', categoria: 'Particulares' },
  { nombre: 'VW Gol Trend', patente: 'AB923AH', kmPorLitro: 12, combustible: 'Nafta Infinia', categoria: 'Particulares' },
].map((v) => ({
  ...v,
  precioLitroUsd: PRECIO_COMBUSTIBLE_USD_LITRO[v.combustible],
}));

export const CATEGORIAS_VEHICULOS = ['Utilitarios', 'Camiones', 'Particulares'];
