// Datos del modo demo (solo desarrollo local). Espejo de supabase/schema.sql.
const hoy = new Date().toISOString()

const CAMIONES = ['PHM752', 'NQH984', 'AC892EQ']
const v = (modelo, patente, km_l, combustible, particular = false) => ({
  id: crypto.randomUUID(), modelo, patente, km_l, combustible, particular, activo: true,
  categoria: particular ? 'particular' : !patente ? 'bidon' : CAMIONES.includes(patente) || modelo === 'Iveco Daily' ? 'camion' : 'utilitario',
})
const p = (nombre, dni, telefono) => ({
  id: crypto.randomUUID(), nombre, dni, telefono, activo: true,
  apellido: nombre.split(' ').at(-1),
})

export const seed = {
  combustibles: [
    { nombre: 'Nafta Súper', precio: 2017, orden: 1, updated_at: hoy },
    { nombre: 'Nafta Infinia', precio: 2148, orden: 2, updated_at: hoy },
    { nombre: 'Diesel Común', precio: 2181, orden: 3, updated_at: hoy },
    { nombre: 'Diesel Infinia', precio: 2296, orden: 4, updated_at: hoy },
    { nombre: 'GNC', precio: 629, orden: 5, updated_at: hoy },
  ],
  ajustes: [
    { clave: 'km_tanque_lleno', valor: '900' },
    { clave: 'viatico_dia', valor: '10000' },
    { clave: 'viatico_pernocte', valor: '30000' },
    { clave: 'viatico_regreso', valor: '20000' },
    { clave: 'comision_transferencia', valor: '8' },
  ],
  vehiculos: [
    v('Toyota Hilux', 'AG672WD', 10, 'Diesel Infinia'),
    v('Renault Clio', 'PLS555', 13, 'Nafta Súper'),
    v('Ford F-100', 'BJP664', 9, 'Diesel Común'),
    v('Ford F-4000', 'PHM752', 6, 'Diesel Común'),
    v('Iveco Daily', 'GLY209', 9, 'Diesel Común'),
    v('Fiat Fiorino', 'AB666JB', 12, 'Nafta Súper'),
    v('Fiat Fiorino', 'AB929RE', 12, 'Nafta Súper'),
    v('Fiat Fiorino', 'NNS221', 12, 'Nafta Súper'),
    v('Ford Ranger', 'OAO960', 10, 'Diesel Infinia'),
    v('Iveco Daily', 'AA316TH', 9, 'Diesel Infinia'),
    v('Iveco Daily', 'AG220DI', 9, 'Diesel Infinia'),
    v('Iveco Daily', 'AB352DT', 9, 'Diesel Infinia'),
    v('Renault Kangoo', 'AB412MK', 11, 'Nafta Súper'),
    v('Renault Kangoo', 'AB412ML', 11, 'Nafta Súper'),
    v('Renault Kangoo', 'AB853XI', 11, 'Nafta Súper'),
    v('Toyota Hilux', 'AA053EX', 10, 'Diesel Infinia'),
    v('Toyota Hilux', 'AG138OO', 10, 'Diesel Infinia'),
    v('Toyota Hilux', 'AG303HR', 10, 'Diesel Infinia'),
    v('VW Gol Trend', 'AB923AH', 12, 'Nafta Infinia', true),
    v('Bidones de nafta', null, 13, 'Nafta Súper'),
    v('Iveco Tector', 'NQH984', 4, 'Diesel Infinia'),
    v('Mercedes-Benz Atego', 'AC892EQ', 4, 'Diesel Infinia'),
    v('Fiat Uno', 'NMQ238', 13, 'Nafta Súper'),
    v('Chevrolet Corsa', 'GOG235', 12.5, 'Nafta Súper', true),
    v('Ford Focus', 'HBU804', 12.5, 'Nafta Súper', true),
  ],
  // Datos de prueba inventados: el personal real vive solo en Supabase.
  personal: [
    p('Persona de Prueba Uno', '00000001', '0000-000001'),
    p('Persona de Prueba Dos', '00000002', '0000-000002'),
    p('Persona de Prueba Tres', '00000003', '0000-000003'),
    p('Persona de Prueba Cuatro', null, '0000-000004'),
    p('Persona de Prueba Cinco', null, '0000-000005'),
  ],
}

const HABITUALES = { AG138OO: 'Persona de Prueba Uno', AB666JB: 'Persona de Prueba Dos' }
for (const veh of seed.vehiculos) {
  const nombre = HABITUALES[veh.patente]
  veh.conductor_habitual_id = nombre ? seed.personal.find((x) => x.nombre === nombre).id : null
}
