// Categorías de obras (rango de potencia × implantación) y desvío de cada obra contra el promedio de su categoría.
// Mismos rangos y mismas reglas que el Estimador del tablero y el informe mensual.

export const RANGOS = [
  { id: 'micro', label: 'Micro (1–4 kWp)', corto: 'Micro', max: 4 },
  { id: 'pequena', label: 'Pequeña (5–12 kWp)', corto: 'Pequeña', max: 12 },
  { id: 'mediana', label: 'Mediana (13–40 kWp)', corto: 'Mediana', max: 40 },
  { id: 'grande', label: 'Grande (41–99 kWp)', corto: 'Grande', max: 99 },
  { id: 'muy_grande', label: 'Muy grande (100–300 kWp)', corto: 'Muy grande', max: 300 },
  { id: 'parque', label: 'Parque solar (>300 kWp)', corto: 'Parque', max: Infinity },
];
export const IMPLANTACIONES = ['En techo', 'En suelo', 'Cochera Solar', 'Residencial'];
export const SIN_IMPLANTACION = 'Sin implantación';

// Las obras "Alto" o "Crítico" (más de 12 Hs MO/kWp) no entran en el promedio de referencia.
export const UMBRAL_ATIPICA = 12;
// Con menos de 3 obras similares se amplía el criterio (solo rango; después, todas).
export const MIN_SIMILARES = 3;

export const rangoDe = (kwp) => RANGOS.find((r) => kwp <= r.max) || RANGOS[RANGOS.length - 1];

export const normalizarNombre = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Obras con indicador y potencia válidos, con su rango e implantación. */
export const prepararObras = (obras) =>
  (obras || [])
    .filter(
      (o) =>
        o.hs_mo_kwp !== null &&
        o.hs_mo_kwp !== undefined &&
        Number.isFinite(Number(o.hs_mo_kwp)) &&
        Number(o.kwp) > 0
    )
    .map((o) => ({
      nombre: o.nombre,
      kwp: Number(o.kwp),
      hs: Number(o.hs_mo_kwp),
      rango: rangoDe(Number(o.kwp)),
      impl: o.implantacion || '',
    }));

const promedioPonderado = (lista) => {
  const kwp = lista.reduce((s, o) => s + o.kwp, 0);
  return kwp > 0 ? lista.reduce((s, o) => s + o.hs * o.kwp, 0) / kwp : null;
};

/**
 * Para cada obra: desvío (%) de su Hs MO/kWp contra el promedio ponderado de su categoría
 * (mismo rango e implantación; si hay menos de 3 similares, solo el rango; si no, todas).
 * La referencia no incluye a la propia obra ni a las atípicas. Positivo = más horas por kWp = peor.
 * Devuelve un Map nombre -> { pct, ref, n, nivel, etiqueta }.
 */
export function calcularDesvios(obras) {
  const base = prepararObras(obras);
  const referencia = base.filter((o) => o.hs <= UMBRAL_ATIPICA);
  const out = new Map();
  base.forEach((o) => {
    const pool = referencia.filter((x) => x.nombre !== o.nombre);
    let nivel = 'categoria';
    let sim = o.impl ? pool.filter((x) => x.rango.id === o.rango.id && x.impl === o.impl) : [];
    let etiqueta = [o.impl, o.rango.corto].filter(Boolean).join(' · ');
    if (sim.length < MIN_SIMILARES) {
      nivel = 'rango';
      sim = pool.filter((x) => x.rango.id === o.rango.id);
      etiqueta = o.rango.corto;
    }
    if (sim.length < MIN_SIMILARES) {
      nivel = 'todas';
      sim = pool;
      etiqueta = 'todas las obras';
    }
    const ref = promedioPonderado(sim);
    out.set(o.nombre, {
      ref,
      n: sim.length,
      nivel,
      etiqueta,
      pct: ref > 0 ? ((o.hs - ref) / ref) * 100 : null,
    });
  });
  return out;
}
