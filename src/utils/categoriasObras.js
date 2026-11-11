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

// ---------------------------------------------------------------------------------------------
//  Paleta de colores (de peor a mejor): rojo → naranja → amarillo → verde, con muchos tonos.
// ---------------------------------------------------------------------------------------------
export const PALETA = ['#d62839', '#f0483e', '#ff7a3d', '#ffa62b', '#ffd93d', '#c5e04a', '#8fd63d', '#4cc93f', '#1fae52'];

const aRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mezclarColores = (a, b, t) => {
  const [x, y] = [aRgb(a), aRgb(b)];
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
export const aclarar = (hex, k) => mezclarColores(hex, '#ffffff', k);

/** t entre 0 (mejor = verde) y 1 (peor = rojo). */
export const colorEscala = (t) => {
  const x = (1 - Math.min(1, Math.max(0, t))) * (PALETA.length - 1);
  const i = Math.floor(x);
  return mezclarColores(PALETA[i], PALETA[Math.min(i + 1, PALETA.length - 1)], x - i);
};

const interpolar = (v, puntos) => {
  if (v <= puntos[0][0]) return puntos[0][1];
  for (let i = 1; i < puntos.length; i++) {
    if (v <= puntos[i][0]) {
      const [x0, y0] = puntos[i - 1];
      const [x1, y1] = puntos[i];
      return y0 + ((v - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return puntos[puntos.length - 1][1];
};

// Puntos de anclaje de la escala: valor → posición en la paleta (0 mejor, 1 peor).
export const PUNTOS_HS = [[2, 0], [3.5, 0.18], [5, 0.36], [7, 0.55], [9, 0.75], [12, 1]];   // las obras de más de 12 quedan fuera de los promedios del tablero
export const PUNTOS_DESVIO = [[-30, 0], [-10, 0.2], [0, 0.4], [10, 0.6], [25, 0.85], [50, 1]];
export const tHs = (v) => interpolar(v, PUNTOS_HS);
export const tDesvio = (pct) => interpolar(pct, PUNTOS_DESVIO);
