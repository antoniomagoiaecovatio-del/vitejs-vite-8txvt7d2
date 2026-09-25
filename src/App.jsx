import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as Recharts from 'recharts';

import { Card } from './components/Card/Card';
import { Badge } from './components/Badge/Badge';
import { Button } from './components/Button/Button';
import { Callout } from './components/Callout/Callout';
import { SelectNative } from './components/SelectNative/SelectNative';
import { Input } from './components/Input/Input';
import { Checkbox } from './components/Checkbox/Checkbox';
import { TabNavigation, TabNavigationLink } from './components/TabNavigation/TabNavigation';
import { cx } from './utils/cx';
import {
  RiBuilding2Line,
  RiFlashlightLine,
  RiSunLine,
  RiDashboardLine,
  RiTrophyLine,
  RiAlarmWarningLine,
  RiHammerLine,
  RiBarChartBoxLine,
  RiPieChartLine,
  RiListCheck,
  RiTimerLine,
  RiTeamLine,
  RiTimerFlashLine,
  RiCalendarLine,
  RiCalculatorLine,
  RiMapPinLine,
} from '@remixicon/react';

const {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  ReferenceArea,
  Sector,
  LabelList,
  ComposedChart,
  Area,
  AreaChart,
  Line,
  LineChart,



} = Recharts;

const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx8LT6AEIsYWbVKx6S3_Jp8jO8_5OPaBHsSnWqI-SJhYHOEvYnX7jg0wA0usewxdF6AZg/exec';

  const POTENCIA_INSTALADA_API_URL =
  APPS_SCRIPT_URL + '?action=potencia_instalada';

  const PERSONAL_OPERACIONES_API_URL =
  APPS_SCRIPT_URL + '?action=personal_operaciones';

  const ESTADO_PROYECTOS_BASE_URL =
  'https://script.google.com/macros/s/AKfycbyveaP6XNxwnwh7zbGwnOvxFBLUyZFHXAnlRT_k-bM1n3SIhE8LlOhbzSPbWQUR50El/exec';

const ESTADO_PROYECTOS_API_URL =
  ESTADO_PROYECTOS_BASE_URL + '?action=estado_proyectos';

const COMPARATIVA_MO_API_URL =
  ESTADO_PROYECTOS_BASE_URL + '?action=comparativa_mo';

const INDICADOR_ESTRUCTURA_BIPOSTE = 1.15;

const esObraTercerizada = (nombre) => {
  const key = normalizeKey(nombre);
  return OBRAS_TERCERIZADAS.some((t) => key.includes(t));
};

// Obras ejecutadas por terceros: su potencia se muestra aparte y no entra en
// kWp/persona ni en la correlación con la dotación propia. Se detectan si el
// nombre de la obra contiene alguno de estos textos (sin tildes ni mayúsculas).
const OBRAS_TERCERIZADAS = ['teknal'];
const OBRAS_TERCERIZADAS_LABEL = 'Teknal';
const POTENCIA_TODOS_LOS_MESES = 'todos';
const PERSONAL_TODOS_LOS_MESES = 'todos';
const PERSONAL_TODOS_LOS_ANIOS = 'todos';



const VISTA_POTENCIA_POR_OBRA = 'por_obra';
const VISTA_POTENCIA_RELACION_PERSONAL = 'relacion_personal';

const ETAPAS_COLS = [
  { key: 'a', label: 'Relevamiento' },
  { key: 'b', label: 'Ingeniería' },
  { key: 'c', label: 'Planos' },
  { key: 'd', label: 'Mat. Primarios' },
  { key: 'f', label: 'Mat. Secundarios' },
  { key: 'g', label: 'Obra Civil' },
  { key: 'h', label: 'Armado y Montaje de Estructuras' },
  { key: 'j', label: 'Cableado de CC' },
  { key: 'k', label: 'Montaje de Inversores y Tableros' },
  { key: 'l', label: 'Cableado de CA' },
  { key: 'm', label: 'Puesta en Marcha' },
];

const DASHBOARD_TABS = [
  ['dashboard', 'KPIs de Obras', RiBarChartBoxLine],
  ['estadoProyectos', 'Estado de Proyectos FV', RiListCheck],
  ['potenciaInstalada', 'Potencia Instalada por año', RiSunLine],
  ['personalOperaciones', 'Personal Operaciones', RiTeamLine],
  ['comparativaMO', 'Comparativa MO', RiPieChartLine],
  ['estimador', 'Estimar duración de obras FV', RiCalculatorLine],
];

const HsMoColor = (val) => {
  if (val === null || val === undefined) return '#8fa6a9';
  if (val <= 5) return '#95de1d';
  if (val <= 8) return '#c7ee8a';
  if (val <= 12) return '#ffc933';
  if (val <= 18) return '#ff9f4a';
  return '#ff5f5f';
};

const TIPO_COLORS = {
  'En techo': '#4fc3f7',
  'En suelo': '#ffc933',
  'Cochera Solar': '#22d3c5',
  Residencial: '#9b7bff',
  Industrial: '#4fc3f7',
  Comercio: '#22d3c5',
  Agro: '#ff8fb1',
  'Parque solar': '#ffc933',
  'Sector público': '#ff5f5f',
  'Sector publico': '#ff5f5f',
};
const OBRA_COLORS = [
  '#4fc3f7',
  '#95de1d',
  '#ff9f4a',
  '#a855f7',
  '#ff5f5f',
  '#14b8a6',
  '#ffc933',
  '#ff8fb1',
  '#06b6d4',
  '#84cc16',
  '#6366f1',
  '#f43f5e',
  '#22d3c5',
  '#eab308',
  '#9b7bff',
  '#0ea5e9',
  '#65a30d',
  '#dc2626',
  '#7c3aed',
  '#0891b2',
  '#92400e',
  '#be123c',
  '#166534',
  '#1d4ed8',
  '#4c1d95',
  '#78350f',
];

const getObraColor = (obra, index = 0) => {
  const key = cleanText(obra);
  let hash = 0;

  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash + index) % OBRA_COLORS.length;
  return OBRA_COLORS[colorIndex];
};
const formatKwp = (v) => {
  const n = Number(v) || 0;

  if (n >= 1000) {
    return `${(n / 1000).toFixed(2)} MWp`;
  }

  return `${Math.round(n)} kWp`;
};

const formatPercent = (v) => {
  const n = Number(v) || 0;
  return `${n.toFixed(1).replace('.0', '')}%`;
};

const calcularPorcentajesEnteros = (items) => {
  const total = items.reduce((acc, item) => acc + Number(item.value || 0), 0);

  if (total <= 0) {
    return items.map((item) => ({
      ...item,
      porcentaje: 0,
      porcentajeEntero: 0,
    }));
  }

  const data = items.map((item) => ({
    ...item,
    porcentaje: (Number(item.value || 0) / total) * 100,
  }));

  const redondeados = data.map((item) => ({
    ...item,
    porcentajeEntero: Math.round(item.porcentaje),
  }));

  const sumaRedondeada = redondeados.reduce(
    (acc, item) => acc + item.porcentajeEntero,
    0
  );

  const diferencia = 100 - sumaRedondeada;

  if (diferencia !== 0 && redondeados.length > 0) {
    const indexMayor = redondeados.reduce(
      (maxIndex, item, index, array) =>
        Number(item.value || 0) > Number(array[maxIndex].value || 0)
          ? index
          : maxIndex,
      0
    );

    redondeados[indexMayor] = {
      ...redondeados[indexMayor],
      porcentajeEntero:
        redondeados[indexMayor].porcentajeEntero + diferencia,
    };
  }

  return redondeados;
};

// Kernel gaussiano estándar, usado por la estimación de densidad (KDE).
const gaussianoKernel = (u) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);

// Ancho de banda por la regla de Silverman: h = 0.9 · desvío · n^(-1/5), con
// un piso mínimo para que nunca sea 0 (obras con valor casi idéntico) ni tan
// angosto que la curva se vea con un pico por cada obra en vez de una
// campana suavizada.
const calcularAnchoBanda = (valores) => {
  const n = valores.length;
  if (n < 2) return 0;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  if (min === max) return 0;

  const media = valores.reduce((s, v) => s + v, 0) / n;
  const varianza =
    valores.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1);
  const desvio = Math.sqrt(varianza);

  return Math.max(0.9 * desvio * Math.pow(n, -1 / 5), (max - min) / 40);
};

// Densidad KDE en un punto x dado un ancho de banda h ya calculado.
const densidadKDE = (x, valores, h) => {
  const n = valores.length;
  if (h === 0) return valores.includes(x) ? 1 : 0;
  return (
    valores.reduce((acc, v) => acc + gaussianoKernel((x - v) / h), 0) /
    (n * h)
  );
};

// Encuentra el pico (la "moda") de la curva de densidad, escaneando todo el
// rango de los datos con margen. Es el valor donde se concentra la mayoría
// de los casos — a diferencia del promedio simple, no se deja arrastrar por
// 1 o 2 obras atípicas (muy simples o muy complejas).
const encontrarPicoDensidad = (valores, h, pasos = 200) => {
  const min = Math.min(...valores);
  const max = Math.max(...valores);

  if (min === max) return min;

  const margen = (max - min) * 0.15 + h;
  const desde = min - margen;
  const hasta = max + margen;
  const paso = (hasta - desde) / pasos;

  let pico = { x: desde, densidad: -Infinity };

  for (let i = 0; i <= pasos; i++) {
    const x = desde + i * paso;
    const densidad = densidadKDE(x, valores, h);
    if (densidad > pico.densidad) pico = { x, densidad };
  }

  return pico.x;
};

// Genera los puntos de la curva de densidad solo entre "desde" y "hasta"
// (para graficar únicamente el tramo que interesa: entre el mejor caso y
// el típico, no toda la cola de obras más complejas).
const curvaDensidadEntre = (valores, h, desde, hasta, pasos = 50) => {
  if (desde >= hasta) {
    return [{ x: desde, densidad: densidadKDE(desde, valores, h) }];
  }

  const paso = (hasta - desde) / pasos;
  const puntos = [];

  for (let i = 0; i <= pasos; i++) {
    const x = desde + i * paso;
    puntos.push({ x, densidad: densidadKDE(x, valores, h) });
  }

  return puntos;
};

const formatDias = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return `${Number(v).toFixed(1).replace('.0', '')} días`;
};

const formatSignedDias = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1).replace('.0', '')} días`;
};

const formatUsdAbs = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';

  return `USD ${Math.abs(Number(v)).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
};



// "+USD 715" / "−USD 5.720" (positivo = gastó de más).
const formatUsdSigned = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';

  const n = Number(v);
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';

  return `${sign}USD ${Math.abs(n).toLocaleString('es-AR', {
    maximumFractionDigits: 0,
  })}`;
};

// Para ejes: 18070 -> "18k", -5720 -> "−5,7k".
const formatUsdK = (v) => {
  const n = Number(v);

  if (!Number.isFinite(n)) return '';
  if (n === 0) return '0';

  const abs = Math.abs(n);
  const texto =
    abs >= 1000
      ? `${(abs / 1000).toFixed(1).replace('.0', '').replace('.', ',')}k`
      : String(Math.round(abs));

  return `${n < 0 ? '−' : ''}${texto}`;
};

const formatMeses = (v) => {
  if (v === null || v === undefined || v === '') return '—';

  const n = Number(v);

  if (Number.isNaN(n)) return '—';

  return `${n.toFixed(1).replace('.0', '')} meses`;
};

const formatRotacion = (v) => {
  if (v === null || v === undefined || v === '') return '—';

  const n = Number(v);

  if (Number.isNaN(n)) return '—';

  return `${n.toFixed(1).replace('.0', '')}%`;
};
const getYearFromDateText = (value) => {
  if (!value) return null;

  const txt = String(value).trim();

  // Formato esperado: dd/mm/yyyy
  const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  return Number(match[3]);
};
const parseDateText = (value) => {
  if (!value) return null;

  const txt = String(value).trim();
  const match = txt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) return null;

  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const anio = Number(match[3]);

  return new Date(anio, mes - 1, dia);
};

const toInputDate = (value) => {
  const d = parseDateText(value);
  if (!d) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getMonthLabel = (value) => {
  const d = parseDateText(value);
  if (!d) return 'Sin fecha';

  return d.toLocaleDateString('es-AR', {
    month: 'short',
    year: '2-digit',
  });
};

const getMonthKey = (value) => {
  const d = parseDateText(value);
  if (!d) return '9999-99';

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const getPowerRange = (kwp) => {
  if (kwp === null || kwp === undefined || kwp === '') return 'sin_dato';

  const n = Number(kwp);

  if (Number.isNaN(n) || n <= 0) return 'sin_dato';
  if (n <= 4) return 'micro';
  if (n <= 12) return 'pequena';
  if (n <= 40) return 'mediana';
  if (n <= 99) return 'grande';
  if (n <= 300) return 'muy_grande';
  return 'parque';
};

const getPowerRangeLabel = (range) => {
  switch (range) {
    case 'micro':
      return 'Micro (1–4 kWp)';
    case 'pequena':
      return 'Pequeña (5–12 kWp)';
    case 'mediana':
      return 'Mediana (13–40 kWp)';
    case 'grande':
      return 'Grande (41–99 kWp)';
    case 'muy_grande':
      return 'Muy grande (100–300 kWp)';
    case 'parque':
      return 'Parque solar (>300 kWp)';
    default:
      return 'Sin rango';
  }
};
const getDeviationPct = (real, referencia) => {
  // Number(null) es 0: sin este control, un dato faltante daba -100%.
  if (real === null || real === undefined || real === '') return null;
  if (referencia === null || referencia === undefined || referencia === '')
    return null;

  const r = Number(real);
  const ref = Number(referencia);

  if (Number.isNaN(r) || Number.isNaN(ref) || ref === 0) return null;

  return ((r - ref) / ref) * 100;
};

const formatSignedPercent = (v) => {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';

  const n = Number(v);
  const sign = n > 0 ? '+' : '';

  return `${sign}${n.toFixed(1).replace('.0', '')}%`;
};

const parseNum = (v) => {
  if (v === null || v === undefined || v === '') return NaN;

  let s = String(v).trim();

  if (!s || s.toLowerCase() === 'n/a') return NaN;

  s = s.replace(/[^\d,.-]/g, '');

  if (!s || s === '-' || s === ',' || s === '.') return NaN;

  const hasComma = s.includes(',');
  const hasDot = s.includes('.');

  // Formato argentino: 18.000,50 => 18000.50
  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.');
    return Number(s);
  }

  // Si hay puntos y el último grupo tiene 3 dígitos,
  // asumimos separador de miles: 18.000 => 18000
  if (hasDot) {
    const parts = s.split('.');
    const last = parts[parts.length - 1];

    if (parts.length > 2 || last.length === 3) {
      s = s.replace(/\./g, '');
      return Number(s);
    }

    return Number(s);
  }

  return Number(s);
};

const cleanText = (v) => {
  if (v === null || v === undefined) return '';
  const txt = String(v).trim();
  if (!txt || txt.toLowerCase() === 'undefined' || txt.toLowerCase() === 'null')
    return '';
  return txt;
};

const normalizeKey = (v) =>
  cleanText(v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const canonicalFromList = (v, list) => {
  const key = normalizeKey(v);
  return list.find((x) => normalizeKey(x) === key) || '';
};

const IMPLANTACIONES_VALIDAS = [
  'En techo',
  'En suelo',
  'Cochera Solar',
  'Residencial',
];

const TIPOS_CLIENTE_VALIDOS = [
  'Industrial',
  'Residencial',
  'Comercio',
  'Agro',
  'Parque solar',
  'Sector público',
  'Sector publico',
];

const ESTRUCTURAS_VALIDAS = [
  'Perfil C',
  'Coplanar',
  'Perfil P37 / P38',
  'Estructura Baratec',
  'Regulable',
  'Triangular c/ contrapesos',
  'Estructura BT roscada',
  'RS10',
  'Estructura BT cementada',
  'Estructura  BT cementada',
  'Estructura BT Hincada',
  'Triangular',
  'Telescópica',
];

const isImplantacion = (v) => !!canonicalFromList(v, IMPLANTACIONES_VALIDAS);
const isEstructura = (v) => !!canonicalFromList(v, ESTRUCTURAS_VALIDAS);

// Los números JSON se respetan tal cual (parseNum interpretaría 1.125 como
// 1125); los textos con formato regional pasan por parseNum.
const toFiniteNumber = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : parseNum(v);
  return Number.isFinite(n) ? n : null;
};

const normalizarObra = (o) => {
  const tipo = cleanText(o.tipo);
  const implantacionOriginal = cleanText(o.implantacion);
  const estructuraOriginal = cleanText(o.estructura);
  const tipoClienteOriginal = cleanText(o.tipo_cliente);

  const posiblesValores = [
    tipo,
    implantacionOriginal,
    estructuraOriginal,
    tipoClienteOriginal,
  ];

  const implantacion =
    posiblesValores
      .map((v) => canonicalFromList(v, IMPLANTACIONES_VALIDAS))
      .find(Boolean) || '';

  const estructura =
    posiblesValores
      .map((v) => canonicalFromList(v, ESTRUCTURAS_VALIDAS))
      .find(Boolean) || '';

  const tipo_cliente =
    posiblesValores
      .map((v) => canonicalFromList(v, TIPOS_CLIENTE_VALIDOS))
      .find(Boolean) || '';

  return {
    ...o,
    nombre: cleanText(o.nombre),
    kwp: toFiniteNumber(o.kwp) ?? 0,
    estado: cleanText(o.estado),
    avance: toFiniteNumber(o.avance) ?? 0,
    hs_mo_kwp: toFiniteNumber(o.hs_mo_kwp),
    tipo,
    implantacion,
    estructura,
    tipo_cliente,
  };
};

const parseProjectPercent = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = toFiniteNumber(v) ?? 0;
  return Math.max(0, Math.min(100, n));
};

const normalizarEstadoProyecto = (p) => {
  const etapasLista = Array.isArray(p.etapas_lista)
    ? p.etapas_lista
    : Object.entries(p.etapas || {}).map(([key, avance]) => ({
        key,
        nombre: key,
        avance,
      }));

      return {
        id_proyecto: cleanText(p.id_proyecto || p.id || p.codigo),
      
        nombre_proyecto: cleanText(
          p.nombre_proyecto || p.nombre || p.proyecto
        ),
      
        fecha_venta: cleanText(
          p.fecha_venta ||
            p.fechaVenta ||
            p['Fecha de Venta'] ||
            p['Fecha Venta']
        ),
      
        ubicacion: cleanText(
          p.ubicacion || p.lugar || p.localidad
        ),

    capacidad_kwp: (() => {
      const posiblesCampos = [
        'capacidad_kwp',
        'capacidad_kWp',
        'capacidadKwp',
        'capacidad',
        'kwp',
        'kWp',
        'KWP',
        'potencia_kwp',
        'potencia_kWp',
        'potenciaKwp',
        'potencia',
        'Capacidad kWp',
        'Capacidad KWP',
        'CAPACIDAD KWP',
        'Capacidad',
        'Potencia kWp',
        'Potencia KWP',
        'POTENCIA KWP',
        'Potencia',
      ];

      for (const campo of posiblesCampos) {
        const n = toFiniteNumber(p[campo]);
        if (n !== null) return n;
      }

      const campoDetectado = Object.keys(p).find((key) => {
        const k = normalizeKey(key);
        return (
          (k.includes('capacidad') &&
            (k.includes('kwp') || k.includes('kw'))) ||
          (k.includes('potencia') && (k.includes('kwp') || k.includes('kw')))
        );
      });

      if (campoDetectado) {
        const n = toFiniteNumber(p[campoDetectado]);
        if (n !== null) return n;
      }

      return null;
    })(),

    estado: cleanText(p.estado),
    avance: parseProjectPercent(p.avance),
    etapas_lista: etapasLista.map((etapa) => ({
      key: cleanText(etapa.key || etapa.nombre),
      nombre: cleanText(etapa.nombre || etapa.key),
      avance: parseProjectPercent(etapa.avance),
    })),
  };
};

const normalizarComparativaMO = (p) => {
  // Los números JSON no pasan por parseNum: 81.075 se leería como 81075.
  const toNumberOrNull = (v) => toFiniteNumber(v);

  /*
   * DATOS ECONÓMICOS DE MANO DE OBRA
   *
   * Se aceptan tanto los nombres originales del Apps Script
   * como los alias utilizados por el dashboard.
   */

  const presupuestoMoUsd = toNumberOrNull(
    p.presupuesto_mo_usd ??
      p.monto_presupuestado_mo ??
      p['PRESUPUESTO MO (USD)'] ??
      p['Presupuesto MO (USD)'] ??
      p['MONTO PRESUPUESTADO MO'] ??
      p['MONTO PRESUPUESTADO MO (USD)'] ??
      null
  );

  const gastoMoRealUsd = toNumberOrNull(
    p.gasto_mo_real_usd ??
      p.monto_gastado_mo ??
      p['COSTO REAL MO (USD)'] ??
      p['GASTO REAL MO (USD)'] ??
      p['MONTO GASTADO MO'] ??
      p['MONTO GASTADO MO (USD)'] ??
      null
  );

  const diferenciaMonto = toNumberOrNull(
    p.diferencia_con_presupuesto_monto ??
      p.diferencia_presupuesto_monto ??
      p['DIFERENCIA CON PRESUPUESTO (MONTO)'] ??
      p['Diferencia con presupuesto (monto)'] ??
      null
  );

  const diferenciaPct = toNumberOrNull(
    p.desvio_costo_mo_pct ??
      p.diferencia_presupuesto_pct ??
      p['DIFERENCIA CON PRESUPUESTO (%)'] ??
      p['DIFERENCIA CON PRESUPUESTO (PORCENTAJE)'] ??
      null
  );

  return {
    id: p.id,

    obra: cleanText(
      p.obra ||
        p.nombre ||
        p.proyecto
    ),

    fecha_inicio: cleanText(
      p.fecha_inicio ||
        p.fecha ||
        p.inicio
    ),

    potencia_kwp: toNumberOrNull(
      p['POTENCIA SOLAR (kWp)'] ??
        p['POTENCIA SOLAR (KWP)'] ??
        p['Potencia solar (kWp)'] ??
        p.potencia_kwp ??
        p.potencia_kWp ??
        p.potencia ??
        p.kwp ??
        null
    ),

    dias_presupuestados: toNumberOrNull(
      p.dias_presupuestados
    ),

    dias_planificados: toNumberOrNull(
      p.dias_planificados
    ),

    dias_reales: toNumberOrNull(
      p.dias_reales
    ),

    diferencia_real_vs_presupuesto: toNumberOrNull(
      p.diferencia_real_vs_presupuesto
    ),

    diferencia_real_vs_planificado: toNumberOrNull(
      p.diferencia_real_vs_planificado
    ),

    desvio_real_vs_presupuesto_pct: toNumberOrNull(
      p.desvio_real_vs_presupuesto_pct
    ),

    desvio_real_vs_planificado_pct: toNumberOrNull(
      p.desvio_real_vs_planificado_pct
    ),

    /*
     * Campos económicos normalizados.
     * Estos son los nombres utilizados posteriormente
     * por las tarjetas globales.
     */

    presupuesto_mo_usd: presupuestoMoUsd,

    gasto_mo_real_usd: gastoMoRealUsd,

    diferencia_con_presupuesto_monto:
      diferenciaMonto,

    diferencia_presupuesto_pct:
      diferenciaPct,

    costo_instalador_dia: toNumberOrNull(
      p.costo_instalador_dia
    ),

    estado_dias: cleanText(
      p.estado_dias ||
        p.estado ||
        'Sin estado'
    ),
  };
};

const esComparativaMOReal = (p) => Boolean(cleanText(p.obra));

const esProyectoReal = (p) =>
  Boolean(cleanText(p.nombre_proyecto) && cleanText(p.estado));

// Estado de Proyectos tarda ~30 s en el Apps Script, por eso el margen amplio.
const JSONP_TIMEOUT_MS = 90000;

// Google Apps Script devuelve a veces un error transitorio ("No se pudo abrir
// el archivo en este momento"). Se reintenta antes de mostrar el error.
const fetchJsonp = async (url, intentos = 3) => {
  for (let i = 0; i < intentos; i++) {
    try {
      return await fetchJsonpUnaVez(url);
    } catch (e) {
      if (!e.reintentable || i === intentos - 1) throw e;
      await new Promise((resolve) => window.setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  return null;
};

const fetchJsonpUnaVez = (url) => {
  return new Promise((resolve, reject) => {
    const callbackName = `jsonpCallback_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;
    const script = document.createElement('script');
    const separator = url.includes('?') ? '&' : '?';
    script.src = `${url}${separator}callback=${callbackName}&t=${Date.now()}`;
    script.async = true;

    const timeout = window.setTimeout(() => {
      cleanup();
      // Si la respuesta llega tarde, evita "callback is not a function".
      window[callbackName] = () => {
        delete window[callbackName];
      };
      reject(
        new Error(
          `Timeout JSONP: la API no respondió en ${JSONP_TIMEOUT_MS / 1000} segundos.`
        )
      );
    }, JSONP_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    }

    window[callbackName] = (payload) => {
      cleanup();
      resolve(payload);
    };
    script.onerror = () => {
      cleanup();
      const err = new Error('No se pudo cargar JSONP desde Apps Script.');
      err.reintentable = true;
      reject(err);
    };
    document.body.appendChild(script);
  });
};

// Dado un proyecto, devuelve el avance (0-100 | null) para una letra de etapa (a, b, c...)
const getEtapaAvance = (etapas_lista, letraKey) => {
  if (!etapas_lista || !etapas_lista.length) return null;
  const match = etapas_lista.find((e) => {
    const k = normalizeKey(e.key || e.nombre);
    return (
      k.startsWith(letraKey + '_') ||
      k.startsWith(letraKey + ' ') ||
      k === letraKey
    );
  });
  return match !== undefined ? Number(match.avance) : null;
};

// Colores sólidos (no tintes al 10%) para que cada etapa se distinga de
// un vistazo, tipo "barra de datos" de Sheets/Excel: el color llena la
// celda en proporción al avance.
const etapaCellStyle = (val) => {
  if (val === null) return { fill: 'transparent', border: '#2c5059' };

  if (val >= 100) return { fill: '#16a34a', border: '#95de1d' };
  if (val >= 60) return { fill: '#2563eb', border: '#4fc3f7' };
  if (val >= 20) return { fill: '#e5a91c', border: '#ffc933' };

  // 1-19% y 0%: mismo color de alerta.
  return { fill: '#dc2626', border: '#ff5f5f' };
};

function HsLabel({ value, color = '#f4f8f8' }) {
  return (
    <span>
      <span className="font-extrabold" style={{ color }}>
        {value}
      </span>
      <span className="ml-1 text-[0.75em] font-light text-gray-400 dark:text-gray-500">
        HS MO / kWp
      </span>
    </span>
  );
}

const ESTADO_OBRA_BADGE_VARIANT = {
  'En marcha': 'success',
  'En obra': 'warning',
  'Parte solar finalizada': 'default',
  'Sin empezar': 'neutral',
};

function EstadoBadge({ estado }) {
  return (
    <Badge variant={ESTADO_OBRA_BADGE_VARIANT[estado] || 'neutral'}>
      {estado || '—'}
    </Badge>
  );
}

const ESTADO_PROYECTO_BADGE_VARIANT = {
  Finalizado: 'success',
  'En Ejecución': 'default',
  'En ejecucion': 'default',
  Pendiente: 'warning',
  Demorado: 'error',
};

function EstadoProyectoBadge({ estado }) {
  return (
    <Badge
      variant={ESTADO_PROYECTO_BADGE_VARIANT[estado] || 'neutral'}
      className="whitespace-nowrap"
    >
      {estado || 'Sin estado'}
    </Badge>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 max-w-[180px] text-gray-400">{label}</p>
      <p className="m-0 text-white">
        <span className="font-bold">
          {Number(payload[0].value).toFixed(2)}
        </span>
        <span className="ml-1 font-light text-gray-400">
          HS MO / kWp instalados
        </span>
      </p>
    </div>
  );
}


const renderPiePercentLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  payload,
}) => {
  const porcentaje = payload?.porcentajeEntero ?? 0;

  if (porcentaje < 4) return null; // Oculta etiquetas muy chicas

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#f4f8f8"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 12, fontWeight: 700 }}
    >
      {`${porcentaje}%`}
    </text>
  );
};

const pctFmt = (a, b) =>
  b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '—';

// Donut interactivo: al pasar el mouse por un sector, ese sector se agranda
// (los demás se atenúan) y el centro muestra su nombre, valor y porcentaje.
const DonutInteractivo = ({
  data,
  height = 220,
  innerRadius = 62,
  outerRadius = 88,
  fmtValor,
  centroBig,
  centroSmall,
}) => {
  const [activo, setActivo] = useState(null);
  const total = data.reduce((t, d) => t + (Number(d.value) || 0), 0);
  const d = activo !== null ? data[activo] : null;
  const pctDe = (x) =>
    x.porcentajeEntero != null
      ? `${x.porcentajeEntero}%`
      : total > 0
      ? `${Math.round((x.value / total) * 100)}%`
      : '—';

  return (
    <div
      className="donut-int"
      style={{ position: 'relative' }}
      onMouseLeave={() => setActivo(null)}
    >
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={4}
            cornerRadius={7}
            stroke="none"
            isAnimationActive={false}
            activeIndex={activo === null ? undefined : activo}
            activeShape={(props) => (
              <Sector
                {...props}
                outerRadius={props.outerRadius + 12}
                innerRadius={props.innerRadius - 3}
                style={{
                  filter: `drop-shadow(0 0 10px ${props.fill}aa)`,
                  cursor: 'pointer',
                }}
              />
            )}
            onMouseEnter={(_, i) => setActivo(i)}
          >
            {data.map((e, i) => (
              <Cell
                key={`${e.name}-${i}`}
                fill={e.fill}
                fillOpacity={activo === null || activo === i ? 1 : 0.3}
                style={{ transition: 'fill-opacity 150ms' }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          textAlign: 'center',
          padding: '0 24%',
        }}
      >
        {d ? (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: d.fill,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: 1.15,
              }}
            >
              {d.name}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>
              {pctDe(d)}
            </div>
            <div style={{ fontSize: 11, color: '#b9c7c9' }}>
              {fmtValor(d.value)}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>
              {centroBig}
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#8fa6a9',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {centroSmall}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Ventana emergente reutilizable para las tarjetas de KPIs.
const VentanaKpi = ({ titulo, subtitulo, onClose, children }) => (
  <div
    className="fixed inset-0 z-50 flex animate-dialog-overlay-show items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => e.stopPropagation()}
      className="modal-pop max-h-[85vh] w-full max-w-[640px] overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl shadow-black/60"
    >
      <div
        className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4"
        style={{
          background:
            'linear-gradient(110deg, #123138 0%, #1d4a50 60%, #24604f 100%)',
        }}
      >
        <div>
          <div className="text-base font-bold">{titulo}</div>
          {subtitulo && <div className="text-xs text-gray-400">{subtitulo}</div>}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-8 items-center justify-center rounded-lg text-lg text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          ✕
        </button>
      </div>
      <div className="max-h-[calc(85vh-72px)] space-y-3 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  </div>
);

const S = {
  app: {
    minHeight: '100vh',
    background: '#16323a',
    color: '#f4f8f8',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    background: '#1d3c44',
    borderBottom: '1px solid #2c5059',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoIcon: {
    width: 32,
    height: 32,
    background: '#e5a91c',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  main: {
    maxWidth: 1500,
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  tabBar: {
    maxWidth: 1500,
    margin: '0 auto',
    padding: '16px 24px 0',
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    overflowX: 'auto',
  },
  tabBtn: {
    border: '1px solid #3b5d65',
    borderRadius: 10,
    padding: '9px 14px',
    fontSize: 13,
    color: '#e3eaea',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  kpis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4,1fr)',
    gap: 16,
  },
  kpi: {
    background: '#1d3c44',
    border: '1px solid #2c5059',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow:
      '0 10px 15px -3px rgba(0,0,0,0.35), 0 4px 6px -4px rgba(0,0,0,0.35)',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  row3: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 },
  card: {
    background: '#1d3c44',
    border: '1px solid #2c5059',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow:
      '0 10px 15px -3px rgba(0,0,0,0.35), 0 4px 6px -4px rgba(0,0,0,0.35)',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 16,
    color: '#b9c7c9',
  },
  input: {
    background: '#16323a',
    border: '1px solid #3b5d65',
    borderRadius: 8,
    padding: '6px 10px',
    fontSize: 12,
    color: '#e3eaea',
    outline: 'none',
  },
  estimatorInput: {
    background: '#16323a',
    border: '1px solid #3b5d65',
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 13,
    color: '#e3eaea',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#f4f8f8',
    fontWeight: 700,
    marginBottom: 4,
  },
  help: { fontSize: 11, color: '#8fa6a9', marginTop: 4, lineHeight: 1.35 },
  btn: {
    background: '#16323a',
    border: '1px solid #3b5d65',
    borderRadius: 8,
    padding: '7px 13px',
    fontSize: 12,
    color: '#e3eaea',
    cursor: 'pointer',
  },
  primaryBtn: {
    background: '#e5a91c',
    border: '1px solid #ffc933',
    borderRadius: 8,
    padding: '11px 16px',
    fontSize: 13,
    color: '#fff',
    cursor: 'pointer',
    fontWeight: 700,
    boxShadow: '0 6px 16px -4px rgba(217,119,6,0.45)',
  },
  secondaryBtn: {
    background: '#16323a',
    border: '1px solid #4fc3f7',
    borderRadius: 8,
    padding: '11px 16px',
    fontSize: 13,
    color: '#4fc3f7',
    cursor: 'pointer',
    fontWeight: 700,
  },
  thead: {
    display: 'grid',
    gridTemplateColumns: '2fr .8fr 1.1fr .8fr 1fr 1fr 1.2fr 1.5fr',
    gap: 8,
    fontSize: 10,
    color: '#8fa6a9',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    padding: '10px 16px',
    borderBottom: '1px solid #2c5059',
  },
  trow: {
    display: 'grid',
    gridTemplateColumns: '2fr .8fr 1.1fr .8fr 1fr 1fr 1.2fr 1.5fr',
    gap: 8,
    fontSize: 12,
    padding: '9px 16px',
    alignItems: 'center',
  },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    textAlign: 'left',
    color: '#b9c7c9',
    borderBottom: '1px solid #3b5d65',
    padding: '8px',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  td: { borderBottom: '1px solid #2c5059', padding: '8px', color: '#e3eaea' },
};
function PotenciaInstaladaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const visibles = payload
    .filter((p) => Number(p.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value));

  if (!visibles.length) return null;

  return (
    <div
      style={{
        background: '#2c5059',
        border: '1px solid #3b5d65',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12,
        maxWidth: 300,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {visibles.slice(0, 12).map((p) => {
          const color = p.color || p.fill || '#b9c7c9';

          return (
            <div
              key={p.name}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 14,
                color: '#e3eaea',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 2,
                    background: color,
                    flexShrink: 0,
                  }}
                />

                <span
                  style={{
                    color: '#b9c7c9',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    minWidth: 0,
                  }}
                >
                  {p.name}
                </span>
              </span>

              <strong style={{ color: '#f4f8f8', whiteSpace: 'nowrap' }}>
                {formatKwp(p.value)}
              </strong>
            </div>
          );
        })}

        {visibles.length > 12 && (
          <div style={{ color: '#8fa6a9', marginTop: 4 }}>
            + {visibles.length - 12} obras más
          </div>
        )}
      </div>
    </div>
  );
}

function PotenciaPersonalTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload || {};

  return (
    <div
      style={{
        background: '#2c5059',
        border: '1px solid #3b5d65',
        borderRadius: 8,
        padding: '10px 12px',
        fontSize: 12,
        minWidth: 220,
      }}
    >
      <div
        style={{
          color: '#b9c7c9',
          marginBottom: 8,
          fontWeight: 700,
        }}
      >
        {label}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <span style={{ color: '#b9c7c9' }}>Potencia Ecovatio</span>
          <strong style={{ color: '#4fc3f7' }}>
            {formatKwp(row.kwp_propio ?? row.total_kwp)}
          </strong>
        </div>

        {Number(row.kwp_tercerizado) > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <span style={{ color: '#b9c7c9' }}>Tercerizada</span>
            <strong style={{ color: '#9b7bff' }}>
              {formatKwp(row.kwp_tercerizado)}
            </strong>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <span style={{ color: '#b9c7c9' }}>Dotación promedio</span>
          <strong style={{ color: '#ffc933' }}>
            {row.dotacion_promedio != null
              ? Number(row.dotacion_promedio).toFixed(1).replace('.0', '')
              : '—'}
          </strong>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 14,
          }}
        >
          <span style={{ color: '#b9c7c9' }}>kWp por persona</span>
          <strong style={{ color: '#95de1d' }}>
            {row.kwp_por_persona != null
              ? formatKwp(row.kwp_por_persona)
              : '—'}
          </strong>
        </div>
      </div>
    </div>
  );
}
// Semáforo de desvío (real vs previsto): rojo = más de +10%, azul = dentro de
// ±10%, verde = más de 10% por debajo, gris = sin dato.
const colorDesvioMO = (pct) => {
  if (pct === null || pct === undefined || !Number.isFinite(Number(pct)))
    return '#8fa6a9';
  if (pct > 10) return '#ff5f5f';
  if (pct < -10) return '#95de1d';
  return '#4fc3f7';
};

const OPCIONES_POTENCIA_LABELS = [
  'micro',
  'pequena',
  'mediana',
  'grande',
  'muy_grande',
  'parque',
].map(getPowerRangeLabel);

// ── Estimador de obras: jornadas, calendario y costo de mano de obra ──
const HORAS_JORNADA_DIA = 8; // 8 a 17 hs con 1 h de almuerzo
const HORAS_SABADO = 4; // sábado 8 a 12 hs
// Los domingos que pasan en el lugar se pagan al doble aunque no trabajen.
const PAGO_DOMINGO_EN_LUGAR = 2;

// Reglas de las jornadas:
// - Se trabaja de lunes a viernes de 8 a 17 hs (8 hs efectivas).
// - Los viajes (ida y vuelta) se hacen SIEMPRE de lunes a viernes, dentro del
//   horario de trabajo, y se descuentan de las horas efectivas del día.
// - Los descansos en el lugar son SIEMPRE sábado o domingo.
const JORNADAS_OBRA = {
  lv: {
    label: 'Lunes a viernes, 8 a 17 hs',
    detalle:
      'Jornada estándar. Los traslados se hacen dentro del horario de 8 a 17 hs y se descuentan de las horas efectivas.',
    trabajaSabado: false,
    seQuedaEnLugar: false,
  },
  lv_descanso: {
    label: 'Lunes a viernes, 8 a 17 hs, con fin de semana de descanso en el lugar',
    detalle:
      'Se quedan en el lugar dos semanas seguidas (el fin de semana descansan allí; el domingo se paga doble) y vuelven el viernes de la 2ª semana.',
    trabajaSabado: false,
    seQuedaEnLugar: true,
  },
  lv_sab: {
    label: 'Lunes a viernes, 8 a 17 hs + sábado 8 a 12 hs, en el lugar',
    detalle:
      'Trabajan también el sábado de la 1ª semana de 8 a 12 hs; el domingo descansan en el lugar (se paga doble) y vuelven el viernes de la 2ª semana.',
    trabajaSabado: true,
    seQuedaEnLugar: true,
  },
  lv_sab_vuelta_sab: {
    label:
      'Lunes a viernes, 8 a 17 hs + sábado 8 a 12 hs, en el lugar, con vuelta el sábado al finalizar',
    detalle:
      'Igual que la 3, pero si la obra termina un sábado vuelven ese mismo sábado (dentro de las 4 hs de 8 a 12) en vez de esperar al lunes. Solo es posible si el viaje de vuelta más el traslado al alojamiento entra en esas 4 hs.',
    trabajaSabado: true,
    seQuedaEnLugar: true,
    vueltaSabado: true,
  },
};

const NOMBRES_DIA_SEMANA = [
  'domingo',
  'lunes',
  'martes',
  'miércoles',
  'jueves',
  'viernes',
  'sábado',
];

// Arma el calendario de la obra día por día a partir del primer día de trabajo
// y suma las horas efectivas de cada día (8 hs, sábado 4 hs, menos traslados).
//
// - Jornada 1 (modalidad diaria): ida y vuelta todos los días.
// - Jornada 1 (modalidad semanal): ida el primer día laborable de la semana y
//   vuelta el viernes (o el último día de la obra); cada día se viaja entre el
//   alojamiento y la obra.
// - Jornadas 2 y 3: estadías de 2 semanas corridas. Ida el primer día
//   laborable, descanso en el lugar el sábado y el domingo entre la 1ª y la 2ª
//   semana, vuelta el viernes de la 2ª semana. Si al terminar la 1ª semana ya
//   no queda trabajo, esa última estadía es una "semana suelta" en modalidad 1
//   (vuelven el último día y el fin de semana lo pasan en casa).
//
// Los viajes son siempre de lunes a viernes y los descansos, sábado o domingo.
const generarPlanObra = (
  diasTrabajo,
  jornada,
  modalidad,
  G,
  H,
  fechaInicioTexto,
  conDetalle,
  usarVueltaSabado = true
) => {
  let inicio = null;

  if (fechaInicioTexto) {
    const [a, m, d] = String(fechaInicioTexto).split('-').map(Number);
    if (a && m && d) inicio = new Date(a, m - 1, d);
  }

  // Sin fecha se simula desde un lunes cualquiera: solo interesa contar días.
  const conFecha = inicio !== null;
  const cursor = conFecha ? new Date(inicio) : new Date(2024, 0, 1);

  // Si la fecha cae en fin de semana, se corre al lunes siguiente.
  while (cursor.getDay() === 6 || cursor.getDay() === 0) {
    cursor.setDate(cursor.getDate() + 1);
  }

  const primerDia = new Date(cursor);
  const diaInicio = cursor.getDay();
  const seQueda = jornada.seQuedaEnLugar;
  // Vuelta el sábado: solo si el viaje (vuelta + alojamiento) entra en las 4 hs.
  const permiteVueltaSabado =
    seQueda &&
    jornada.vueltaSabado &&
    usarVueltaSabado &&
    G + H <= HORAS_SABADO + 1e-9;

  let dia = diaInicio; // 0 = domingo ... 6 = sábado
  let estado = 'casa'; // 'casa' | 'estadia'
  let semanaEnBloque = 0;
  let bloqueId = 0;
  let nuevaSemana = true;
  let trabajados = 0;
  let pagados = 0;
  let descansoEnLugar = 0;
  let domingosEnLugar = 0;
  let horasEfectivas = 0;
  let diasSoloViaje = 0;
  let desplazamiento = 0;
  let desplazamientoUltimoTrabajo = 0;
  let guardia = 0;
  const celdas = [];

  // Días de la semana anteriores al primer día de trabajo (columnas vacías).
  if (conDetalle) {
    for (let i = 0; i < (diaInicio + 6) % 7; i++) {
      celdas.push({ tipo: 'fin', texto: '', fecha: null });
    }
  }

  while (trabajados < diasTrabajo && guardia++ < 20000) {
    const laborable = dia >= 1 && dia <= 5;

    // Lunes: la estadía en curso pasa a su 2ª semana.
    if (seQueda && dia === 1 && estado === 'estadia') semanaEnBloque = 2;
    if (!seQueda && dia === 1) nuevaSemana = true;

    let nuevoBloque = false;

    if (seQueda && estado === 'casa' && laborable) {
      estado = 'estadia';
      semanaEnBloque = 1;
      bloqueId += 1;
      nuevoBloque = true;
    }

    // El sábado solo se trabaja si la estadía sigue después: no se viaja los
    // sábados, salvo en la jornada con vuelta el sábado (donde puede ser el
    // último día de la obra, en la 1ª o en la 2ª semana de la estadía).
    const sabadoEsUltimo = trabajados + 1 === diasTrabajo;
    const sabadoTrabajado =
      seQueda &&
      jornada.trabajaSabado &&
      estado === 'estadia' &&
      dia === 6 &&
      ((semanaEnBloque === 1 && (!sabadoEsUltimo || permiteVueltaSabado)) ||
        (semanaEnBloque === 2 && sabadoEsUltimo && permiteVueltaSabado));

    let celda = null;

    if (laborable || sabadoTrabajado) {
      trabajados += 1;
      pagados += 1;
      desplazamientoUltimoTrabajo = desplazamiento;

      let esPrimero;
      let esUltimo;

      if (seQueda) {
        esPrimero = nuevoBloque;
        // Viernes de la 2ª semana: vuelven, salvo que quede un solo día de
        // trabajo y se pueda terminar el sábado y volver ese día.
        esUltimo =
          trabajados === diasTrabajo ||
          (semanaEnBloque === 2 &&
            dia === 5 &&
            !(permiteVueltaSabado && diasTrabajo - trabajados === 1));
      } else if (modalidad === '1') {
        esPrimero = true;
        esUltimo = true;
      } else {
        esPrimero = nuevaSemana;
        esUltimo = dia === 5 || trabajados === diasTrabajo;
        nuevaSemana = false;
      }

      const tipo =
        esPrimero && esUltimo
          ? 'idavuelta'
          : esPrimero
          ? 'ida'
          : esUltimo
          ? 'vuelta'
          : 'trabajo';

      const horasBase = dia === 6 ? HORAS_SABADO : HORAS_JORNADA_DIA;
      const perdida =
        tipo === 'idavuelta' ? 2 * G : tipo === 'trabajo' ? 2 * H : G + H;

      horasEfectivas += Math.max(horasBase - perdida, 0);

      // Día en el que el viaje consume toda la jornada.
      if (horasBase - perdida <= 1e-9) diasSoloViaje += 1;

      if (conDetalle) {
        const base = dia === 6 ? 'Trabajo 8 a 12 hs' : 'Trabajo';

        celda = {
          tipo,
          dia,
          bloqueId: seQueda ? bloqueId : null,
          semana: seQueda ? semanaEnBloque : null,
          texto:
            !seQueda && modalidad === '1'
              ? 'Ida + trabajo + vuelta'
              : tipo === 'idavuelta'
              ? `Ida, ${base.toLowerCase()} y vuelta`
              : tipo === 'ida'
              ? `Ida + ${base.toLowerCase()}`
              : tipo === 'vuelta'
              ? `${base} + vuelta a casa`
              : base,
        };
      }

      // Viernes de la 2ª semana: vuelven a casa.
      if (seQueda && esUltimo && semanaEnBloque === 2) estado = 'casa';
    } else if (
      seQueda &&
      estado === 'estadia' &&
      semanaEnBloque === 1 &&
      (dia === 6 || dia === 0)
    ) {
      // Fin de semana entre la 1ª y la 2ª semana: descansan en el lugar.
      pagados += 1;
      descansoEnLugar += 1;
      if (dia === 0) domingosEnLugar += 1;

      if (conDetalle) {
        celda = {
          tipo: 'descanso',
          dia,
          bloqueId,
          semana: semanaEnBloque,
          texto: dia === 0 ? 'Descanso (se paga doble)' : 'Descanso en el lugar',
        };
      }
    } else if (conDetalle) {
      celda = { tipo: 'casa', dia, bloqueId: null, semana: null, texto: 'En casa' };
    }

    if (conDetalle) {
      celda.fecha = conFecha
        ? new Date(
            primerDia.getFullYear(),
            primerDia.getMonth(),
            primerDia.getDate() + desplazamiento
          )
        : null;
      celdas.push(celda);
    }

    desplazamiento += 1;
    dia = (dia + 1) % 7;
  }

  const diasCorridos = desplazamientoUltimoTrabajo + 1;
  const ultimoTrabajo = new Date(
    primerDia.getFullYear(),
    primerDia.getMonth(),
    primerDia.getDate() + desplazamientoUltimoTrabajo
  );

  const resultado = {
    horasEfectivas,
    diasSoloViaje,
    diasPagados: pagados,
    diasDescansoEnLugar: descansoEnLugar,
    domingosEnLugar,
    // Días de pago: el domingo en el lugar cuenta doble.
    diasPagoEquivalentes:
      pagados + domingosEnLugar * (PAGO_DOMINGO_EN_LUGAR - 1),
    diasCorridos,
    fechaInicio: conFecha ? primerDia : null,
    fechaFin: conFecha ? ultimoTrabajo : null,
  };

  if (!conDetalle) return resultado;

  // Completa la última semana con días fuera de la obra.
  while (celdas.length % 7 !== 0) {
    celdas.push({ tipo: 'fin', texto: '', fecha: null });
  }

  // Última estadía: ¿fue una semana suelta o llegó a la 2ª semana?
  const trabajos = celdas.filter((c) => ['ida', 'trabajo', 'vuelta', 'idavuelta'].includes(c.tipo));
  const ultimaCelda = trabajos[trabajos.length - 1];
  const ultimoBloqueEsSuelto =
    seQueda && ultimaCelda && ultimaCelda.semana === 1;
  const terminaEnSabado = Boolean(ultimaCelda && ultimaCelda.dia === 6);
  const bloqueCompleto = Boolean(
    ultimaCelda &&
      ultimaCelda.semana === 2 &&
      (ultimaCelda.dia === 5 || ultimaCelda.dia === 6)
  );

  const cronograma = [];

  for (let i = 0; i < celdas.length; i += 7) {
    const semanaCeldas = celdas.slice(i, i + 7);
    const conBloque = semanaCeldas.find((c) => c.bloqueId);
    let etiqueta = '';

    if (seQueda && conBloque) {
      etiqueta =
        conBloque.bloqueId === bloqueId && ultimoBloqueEsSuelto
          ? terminaEnSabado
            ? 'Semana suelta · vuelta el sábado'
            : 'Semana suelta · modalidad 1'
          : `Estadía · semana ${conBloque.semana} de 2`;
    } else if (!seQueda && semanaCeldas.some((c) => c.dia)) {
      etiqueta = 'Lunes a viernes';
    }

    cronograma.push({ numero: i / 7 + 1, etiqueta, celdas: semanaCeldas });
  }

  let composicion;

  if (seQueda) {
    const completos = bloqueCompleto ? bloqueId : bloqueId - 1;
    const partes = [];

    if (completos > 0) {
      partes.push(
        `${completos} ${completos === 1 ? 'estadía' : 'estadías'} de 2 semanas`
      );
    }
    if (ultimoBloqueEsSuelto) {
      partes.push(
        terminaEnSabado
          ? '1 semana suelta de lunes a sábado (vuelven el sábado, sin descanso en el lugar)'
          : '1 semana suelta en modalidad 1 (lunes a viernes, el fin de semana en casa)'
      );
    } else if (ultimaCelda && !bloqueCompleto) {
      partes.push(
        `1 estadía de 2 semanas con la 2ª semana parcial (hasta el ${
          NOMBRES_DIA_SEMANA[ultimaCelda.dia]
        })`
      );
    }

    composicion = partes.join(' + ');
  } else {
    const semanasObra = cronograma.filter((sem) => sem.etiqueta).length;

    composicion = `${semanasObra} ${
      semanasObra === 1 ? 'semana' : 'semanas'
    } de lunes a viernes`;
  }

  return {
    ...resultado,
    semanas: cronograma.length,
    cronograma,
    composicion,
    terminaEnSabado,
  };
};

// Los traslados se hacen siempre dentro del horario de trabajo (8 a 17 hs):
// tienen que caber en las horas del día en que se realizan.
const errorDeCabida = (jornada, modalidad, G, H) => {
  if (!jornada.seQuedaEnLugar && modalidad === '1') {
    return 2 * G > HORAS_JORNADA_DIA
      ? 'El traslado diario (ida y vuelta) no cabe en la jornada de 8 hs.'
      : null;
  }

  // El sábado trabajado (4 hs) es un día intermedio: el traslado diario
  // alojamiento ↔ obra tiene que caber en esas horas.
  const horasDiaCorto = jornada.trabajaSabado ? HORAS_SABADO : HORAS_JORNADA_DIA;

  if (G + H > HORAS_JORNADA_DIA) {
    return 'El día de ida y el de vuelta no alcanzan para viajar y trasladarse al alojamiento dentro de la jornada de 8 hs.';
  }
  if (2 * H > horasDiaCorto) {
    return `El traslado diario alojamiento ↔ obra no cabe en la jornada${
      jornada.trabajaSabado ? ' del sábado (4 hs)' : ''
    }.`;
  }

  return null;
};

const LIMITE_DIAS_OBRA = 5000;

// Cálculo completo:
// 1. Horas por operario = potencia × indicador ÷ operarios.
// 2. Días de trabajo: se suman las horas efectivas de cada día del calendario
//    (descontando los viajes de ida, de vuelta y al alojamiento) hasta cubrir
//    las horas por operario.
// 3. Coeficiente de seguridad sobre esos días (siempre hacia arriba).
// 4. Con los días finales se arma el calendario y se cuentan los días de pago.
const calcularPlanObra = (p) => {
  const jornada = JORNADAS_OBRA[p.jornada] || JORNADAS_OBRA.lv;
  const modalidad = jornada.seQuedaEnLugar ? '2' : p.modalidad;

  const errorCabida = errorDeCabida(jornada, modalidad, p.G, p.H);

  if (errorCabida) return { error: errorCabida };

  const horasTotales = p.B * p.D;
  const horasPorOperario = horasTotales / p.C;

  // Jornada con vuelta el sábado: es una posibilidad, no una obligación. Se
  // evalúa el plan con y sin vuelta el sábado y se usa el que convenga
  // (terminar un sábado rinde solo las horas de la mañana, pero ahorra días).
  const variantes =
    jornada.vueltaSabado && p.G + p.H <= HORAS_SABADO + 1e-9
      ? [false, true]
      : [true];

  const generar = (n, conDetalle, usarVueltaSabado) =>
    generarPlanObra(
      n,
      jornada,
      modalidad,
      p.G,
      p.H,
      p.fechaInicio,
      conDetalle,
      usarVueltaSabado
    );

  const horasMaximas = (n) =>
    Math.max(...variantes.map((v) => generar(n, false, v).horasEfectivas));

  let diasNecesarios = 0;
  let horasPlanBase = 0;

  for (let n = 1; n <= LIMITE_DIAS_OBRA; n++) {
    const horas = horasMaximas(n);

    if (horas + 1e-9 >= horasPorOperario) {
      diasNecesarios = n;
      horasPlanBase = horas;
      break;
    }
  }

  if (!diasNecesarios) {
    return { error: 'El traslado consume todas las horas laborales.' };
  }

  // Prueba de que N es el mínimo: con un día menos no alcanzan las horas.
  const horasUnDiaMenos = diasNecesarios > 1 ? horasMaximas(diasNecesarios - 1) : 0;

  const factorSeguridad = 1 + p.XS / 100;
  const diasConSeguridad = Math.ceil(diasNecesarios * factorSeguridad);
  const diasHombre = diasConSeguridad * p.C;

  // Entre las variantes que cubren las horas se elige la de menos días de pago
  // y, a igualdad, la más corta en el calendario.
  const candidatos = variantes.map((v) => generar(diasConSeguridad, true, v));
  const suficientes = candidatos.filter(
    (c) => c.horasEfectivas + 1e-9 >= horasPorOperario
  );
  const calendario = (suficientes.length ? suficientes : candidatos).reduce(
    (mejor, c) =>
      c.diasPagoEquivalentes < mejor.diasPagoEquivalentes ||
      (c.diasPagoEquivalentes === mejor.diasPagoEquivalentes &&
        c.diasCorridos < mejor.diasCorridos)
        ? c
        : mejor
  );

  let costo = null;

  if (Number.isFinite(p.tarifaInstalador)) {
    const instaladores =
      p.C * p.tarifaInstalador * calendario.diasPagoEquivalentes;
    const supervisor =
      p.supervisor && Number.isFinite(p.tarifaSupervisor)
        ? p.tarifaSupervisor * calendario.diasPagoEquivalentes
        : 0;
    const total = instaladores + supervisor;

    costo = {
      instaladores,
      supervisor,
      total,
      porKwp: total / p.B,
      tarifaInstalador: p.tarifaInstalador,
      tarifaSupervisor: p.supervisor ? p.tarifaSupervisor : null,
    };
  }

  return {
    jornada: p.jornada,
    modalidad,
    horasTotales,
    horasPorOperario,
    horasDiarias: horasPlanBase / diasNecesarios,
    horasPlanBase,
    horasUnDiaMenos,
    diasNecesarios,
    diasConSeguridad,
    diasHombre,
    factorSeguridad,
    calendario,
    costo,
    // Solo para la jornada con vuelta el sábado (null en las demás).
    vueltaSabadoDisponible: jornada.vueltaSabado
      ? p.G + p.H <= HORAS_SABADO + 1e-9
      : null,
  };
};

// Cuándo se viaja de ida y de vuelta según la jornada. Todos los traslados se
// hacen dentro del horario de trabajo y se descuentan de las horas efectivas.
const descripcionViaje = (clave, modalidad) => {
  if (clave === 'lv_descanso') {
    return 'Ida el lunes de la 1ª semana y vuelta el viernes de la 2ª semana, dentro del horario de 8 a 17 hs. El sábado y el domingo de la 1ª semana descansan en el lugar. Si la obra dura más, el ciclo se repite.';
  }

  if (clave === 'lv_sab') {
    return 'Ida el lunes de la 1ª semana y vuelta el viernes de la 2ª semana, dentro del horario de 8 a 17 hs. El sábado de la 1ª semana trabajan de 8 a 12 hs y el domingo descansan en el lugar. Si la obra dura más, el ciclo se repite.';
  }

  if (clave === 'lv_sab_vuelta_sab') {
    return 'Ida el lunes de la 1ª semana y vuelta el viernes de la 2ª semana, dentro del horario de 8 a 17 hs. El sábado de la 1ª semana trabajan de 8 a 12 hs y el domingo descansan en el lugar. Si la obra termina un sábado, vuelven ese mismo sábado (dentro de las 4 hs de 8 a 12) en lugar de esperar al lunes. Si la obra dura más, el ciclo se repite.';
  }

  return modalidad === '1'
    ? 'Ida y vuelta todos los días, dentro del horario de 8 a 17 hs.'
    : 'Ida el lunes y vuelta el viernes, dentro del horario de 8 a 17 hs. Cada día se viaja entre el alojamiento y la obra. Sábado y domingo en casa.';
};

const TIPOS_CRONOGRAMA = {
  ida: { color: '#4fc3f7', leyenda: 'Ida a la obra' },
  vuelta: { color: '#9b7bff', leyenda: 'Vuelta a casa' },
  idavuelta: { color: '#4fc3f7', leyenda: 'Ida y vuelta' },
  trabajo: { color: '#95de1d', leyenda: 'Trabajo' },
  descanso: { color: '#ffc933', leyenda: 'Descanso en el lugar' },
  casa: { color: '#8fa6a9', leyenda: 'En casa' },
  fin: { color: '#3b5d65', leyenda: 'Fuera de la obra' },
};

// Semanas de la jornada, día por día (lunes a domingo).
const cronogramaJornada = (clave, modalidad) => {
  const c = (tipo, texto) => ({ tipo, texto });
  const trabajo = c('trabajo', 'Trabajo');
  const casa = c('casa', 'En casa');

  if (clave === 'lv_descanso') {
    return [
      [
        c('ida', 'Ida + trabajo'),
        trabajo,
        trabajo,
        trabajo,
        trabajo,
        c('descanso', 'Descanso en el lugar'),
        c('descanso', 'Descanso (se paga doble)'),
      ],
      [
        trabajo,
        trabajo,
        trabajo,
        trabajo,
        c('vuelta', 'Trabajo + vuelta a casa'),
        casa,
        casa,
      ],
    ];
  }

  if (clave === 'lv_sab') {
    return [
      [
        c('ida', 'Ida + trabajo'),
        trabajo,
        trabajo,
        trabajo,
        trabajo,
        c('trabajo', 'Trabajo 8 a 12 hs'),
        c('descanso', 'Descanso (se paga doble)'),
      ],
      [
        trabajo,
        trabajo,
        trabajo,
        trabajo,
        c('vuelta', 'Trabajo + vuelta a casa'),
        casa,
        casa,
      ],
    ];
  }

  if (clave === 'lv_sab_vuelta_sab') {
    return [
      [
        c('ida', 'Ida + trabajo'),
        trabajo,
        trabajo,
        trabajo,
        trabajo,
        c('trabajo', 'Trabajo 8 a 12 hs'),
        c('descanso', 'Descanso (se paga doble)'),
      ],
      [
        trabajo,
        trabajo,
        trabajo,
        trabajo,
        c('vuelta', 'Trabajo + vuelta a casa'),
        c('vuelta', 'Si la obra termina: trabajo 8 a 12 hs + vuelta'),
        casa,
      ],
    ];
  }

  if (modalidad === '1') {
    const idaVuelta = c('idavuelta', 'Ida + trabajo + vuelta');

    return [[idaVuelta, idaVuelta, idaVuelta, idaVuelta, idaVuelta, casa, casa]];
  }

  return [
    [
      c('ida', 'Ida + trabajo'),
      trabajo,
      trabajo,
      trabajo,
      c('vuelta', 'Trabajo + vuelta a casa'),
      casa,
      casa,
    ],
  ];
};

const formatFechaCorta = (fecha) =>
  fecha
    ? fecha.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

// ── Informe imprimible de la estimación (PDF) ──
const NOMBRES_CORTOS_JORNADA = {
  lv: 'Lunes a viernes, 8 a 17 hs',
  lv_descanso: 'L–V 8 a 17 hs · estadía de 2 semanas, descanso en el lugar',
  lv_sab: 'L–V 8 a 17 hs + sábado 8 a 12 hs · estadía de 2 semanas',
  lv_sab_vuelta_sab:
    'L–V 8 a 17 hs + sábado 8 a 12 hs · estadía de 2 semanas, vuelta el sábado al finalizar',
};

// Resumen breve de cuándo se viaja (el detalle está en el calendario).
const viajeResumen = (r) => {
  if (r.jornada === 'lv') {
    return String(r.modalidad) === '1'
      ? 'Ida y vuelta todos los días, dentro del horario de 8 a 17 hs.'
      : 'Ida el lunes y vuelta el viernes; a diario se viaja entre el alojamiento y la obra.';
  }

  return `Ida el lunes y vuelta el viernes de la 2ª semana${
    r.jornada === 'lv_sab_vuelta_sab'
      ? ' (o el sábado, si la obra termina ese día)'
      : ''
  }. Fines de semana en el lugar, dentro de cada estadía.`;
};

const construirHtmlInforme = (r) => {
  const esc = (v) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const num = (v, dec = 1) =>
    Number(v || 0).toLocaleString('es-AR', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
  const ent = (v) => num(v, 0);
  const usd = (v) => `USD ${ent(v)}`;

  const jornada = JORNADAS_OBRA[r.jornada] || JORNADAS_OBRA.lv;
  const cal = r.calendario;
  const costo = r.costo;
  const unidad = jornada.trabajaSabado ? 'días de trabajo' : 'días hábiles';
  const fecha = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  const plural = (n, uno, varios) => (Number(n) === 1 ? uno : varios);

  // ── Datos del proyecto ──
  const hechos = [
    ['Potencia', `${num(r.potencia, 2)} kWp`],
    ...(r.tipoClienteRef && r.tipoClienteRef !== 'Todos los clientes'
      ? [['Tipo de cliente', r.tipoClienteRef]]
      : []),
    ...(r.implantacionRef && r.implantacionRef !== 'Todas las implantaciones'
      ? [['Implantación', r.implantacionRef]]
      : []),
    ...(r.estructuraRef && r.estructuraRef !== 'Todas las estructuras'
      ? [['Estructura', r.estructuraRef]]
      : []),
    ['Indicador de mano de obra', `${num(r.indicador, 2)} hs MO/kWp`],
    ['Coeficiente de seguridad', `${num(r.seguridad, 0)}%`],
    ['Jornada', NOMBRES_CORTOS_JORNADA[r.jornada] || jornada.label],
    [
      'Traslados',
      String(r.modalidad) === '1'
        ? `${num(r.trasladoEmpresa, 1)} hs por tramo`
        : `${num(r.trasladoEmpresa, 1)} hs empresa ↔ obra · ${num(
            r.trasladoAlojamiento,
            1
          )} hs alojamiento ↔ obra`,
    ],
  ];

  // Los datos se acomodan solos en filas y se estiran para no dejar huecos.
  const hechosHtml = hechos
    .map(
      ([l, v]) =>
        `<div class="hecho${l === 'Jornada' ? ' j' : ''}${
          l === 'Traslados' ? ' t' : ''
        }"><div class="l">${esc(l)}</div><div class="v">${esc(v)}</div></div>`
    )
    .join('');

  // ── Pasos del cálculo del plazo ──
  const sinMargen = Number(r.seguridad) === 0;
  const pasos = [
    [
      'Horas de mano de obra',
      `${num(r.horasTotales, 1)} hs`,
      `${num(r.potencia, 2)} kWp × ${num(r.indicador, 2)} hs MO/kWp`,
    ],
    [
      'Horas por operario',
      `${num(r.horasPorOperario, 1)} hs`,
      `${num(r.horasTotales, 1)} hs ÷ ${ent(r.operarios)} ${plural(
        r.operarios,
        'operario',
        'operarios'
      )}`,
    ],
    [
      'Días necesarios',
      `${ent(r.diasNecesarios)} ${plural(r.diasNecesarios, 'día', 'días')}`,
      `En ${ent(r.diasNecesarios)} días se acumulan ${num(
        r.horasPlanBase,
        1
      )} hs efectivas${
        r.diasNecesarios > 1
          ? `; con ${ent(r.diasNecesarios - 1)}, ${num(r.horasUnDiaMenos, 1)} hs (no alcanza)`
          : ''
      }`,
    ],
    [
      sinMargen ? 'Plazo final' : 'Con margen de seguridad',
      `${ent(r.diasConSeguridad)} ${plural(r.diasConSeguridad, 'día', 'días')}`,
      sinMargen
        ? `${ent(r.diasHombre)} días-hombre`
        : `+${num(r.seguridad, 0)}% · ${ent(r.diasHombre)} días-hombre`,
    ],
  ];

  // ── Calendario ──
  const tiposUsados = [
    ...new Set(cal.cronograma.flatMap((sem) => sem.celdas.map((c) => c.tipo))),
  ].filter((t) => t !== 'fin');

  const filasCalendario = cal.cronograma
    .map((sem) => {
      const celdas = sem.celdas
        .map((c) => {
          if (c.tipo === 'fin') return '<td class="vacia"></td>';

          const color = TIPOS_CRONOGRAMA[c.tipo].color;
          const dia = c.fecha
            ? `<span class="fd">${c.fecha.getDate()}/${c.fecha.getMonth() + 1}</span>`
            : '';

          return `<td style="background:${color}22;border:1px solid ${color}70">${dia}${esc(
            c.texto
          )}</td>`;
        })
        .join('');

      return `<tr><td class="sem"><b>Semana ${sem.numero}</b><span>${esc(
        sem.etiqueta
      )}</span></td>${celdas}</tr>`;
    })
    .join('');

  const leyenda = tiposUsados
    .map(
      (t) =>
        `<span><i style="background:${TIPOS_CRONOGRAMA[t].color}"></i>${TIPOS_CRONOGRAMA[t].leyenda}</span>`
    )
    .join('');

  // ── Costo ──
  const diasTrabajo = cal.diasPagados - cal.diasDescansoEnLugar;
  const recargoDomingos = cal.domingosEnLugar * (PAGO_DOMINGO_EN_LUGAR - 1);
  const totalPago = cal.diasPagoEquivalentes;

  const segmentos = [
    ['Días de trabajo', diasTrabajo, '#95de1d'],
    ['Descanso en el lugar', cal.diasDescansoEnLugar, '#ffc933'],
    ['Recargo domingos (pago doble)', recargoDomingos, '#ff9f4a'],
  ].filter((seg) => seg[1] > 0);

  const barraPago = segmentos
    .map(
      (seg) =>
        `<div style="flex:${seg[1]};background:${seg[2]}" title="${seg[0]}"></div>`
    )
    .join('');

  const detallePago = segmentos
    .map(
      (seg) =>
        `<div><i style="background:${seg[2]}"></i><span>${seg[0]}</span><b>${ent(seg[1])}</b></div>`
    )
    .join('');

  const seccionCosto = costo
    ? `
    <section class="sec costo">
      <div class="sec-t">Costo estimado de mano de obra</div>

      <div class="caja">
        <div class="fila">
          <div class="f-nombre">Instaladores</div>
          <div class="f-det">${ent(r.operarios)} ${plural(r.operarios, 'persona', 'personas')} × ${usd(
        costo.tarifaInstalador
      )} por día × ${ent(totalPago)} días de pago</div>
          <div class="f-imp">${usd(costo.instaladores)}</div>
        </div>

        <div class="fila">
          <div class="f-nombre">Supervisor</div>
          <div class="f-det">${
            r.conSupervisor
              ? `1 persona × ${usd(costo.tarifaSupervisor)} por día × ${ent(
                  totalPago
                )} días de pago`
              : 'No incluido'
          }</div>
          <div class="f-imp">${r.conSupervisor ? usd(costo.supervisor) : '—'}</div>
        </div>

        <div class="fila total">
          <div class="f-nombre">Total mano de obra</div>
          <div class="f-det"></div>
          <div class="f-imp">${usd(costo.total)}</div>
        </div>

        <div class="fila">
          <div class="f-nombre">Costo por kWp</div>
          <div class="f-det">${usd(costo.total)} ÷ ${num(r.potencia, 2)} kWp</div>
          <div class="f-imp">${usd(costo.porKwp)} / kWp</div>
        </div>
      </div>

      <div class="pago">
        <div class="pago-t">De dónde salen los <b>${ent(totalPago)} días de pago</b></div>
        <div class="barra">${barraPago}</div>
        <div class="pago-l">${detallePago}</div>
      </div>
    </section>`
    : `
    <section class="sec costo">
      <div class="sec-t">Costo estimado de mano de obra</div>
      <div class="aviso">No se calculó el costo: falta ingresar el valor de mano de obra por día en la calculadora.</div>
    </section>`;

  const incluye = costo
    ? `Mano de obra ${
        r.conSupervisor ? 'de instaladores y supervisor' : 'de instaladores'
      }: días trabajados y de descanso en el lugar${
        cal.domingosEnLugar > 0 ? ', con los domingos en el lugar al doble' : ''
      }.`
    : 'Plazo de ejecución estimado.';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Estimación de obra - ${esc(r.nombre)}</title>
  <style>
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      color: #243238;
      font-size: 10.5px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    b, strong { color: #173f44; }

    .top {
      position: relative; overflow: hidden;
      background: #173f44; color: #fff; border-radius: 14px;
      padding: 18px 22px 17px; margin-bottom: 12px;
      display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: end;
    }
    .top::after {
      content: ""; position: absolute; top: -50px; right: -30px;
      width: 240px; height: 170px; background: rgba(255,255,255,.06);
      transform: rotate(-16deg); border-radius: 28px;
    }
    .top > * { position: relative; z-index: 1; }
    .brand { color: #9be21b; font-weight: 800; letter-spacing: .24em; font-size: 17px; margin-bottom: 11px; }
    .top h1 { margin: 0; font-size: 19px; font-weight: 750; line-height: 1.15; }
    .top .sub { color: #c5d6d8; font-size: 10px; margin-top: 3px; }
    .meta { text-align: right; color: #c5d6d8; font-size: 10px; }
    .meta strong { display: block; color: #fff; font-size: 12.5px; }

    .kpis { display: grid; grid-template-columns: 1.55fr 1fr 1fr; gap: 10px; }
    .kpi { border: 1px solid #dfe8e7; border-radius: 12px; padding: 13px 15px; }
    .kpi.main { background: #f2f8e8; border-color: #d7e9ba; border-left: 6px solid #9be21b; }
    .lab { font-size: 8px; font-weight: 800; letter-spacing: .11em; text-transform: uppercase; color: #56706b; margin-bottom: 4px; }
    .val { font-size: 25px; font-weight: 800; color: #173f44; line-height: 1.1; letter-spacing: -.01em; }
    .val small { font-size: 12px; font-weight: 700; color: #56706b; letter-spacing: 0; }
    .kpi .s { font-size: 9.5px; color: #647572; margin-top: 5px; line-height: 1.4; }
    .kpi .s b { color: #173f44; }

    .sec { margin-top: 15px; break-inside: avoid; }
    .sec-t {
      display: flex; align-items: center; gap: 7px; margin-bottom: 8px;
      font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #173f44;
    }
    .sec-t::before { content: ""; width: 7px; height: 7px; border-radius: 2px; background: #9be21b; }
    .nota { color: #647572; font-size: 9px; margin-top: 6px; line-height: 1.45; }

    .hechos { display: flex; flex-wrap: wrap; gap: 1px; background: #e6eeed; border: 1px solid #e6eeed; border-radius: 12px; overflow: hidden; }
    .hecho { background: #fff; padding: 8px 12px; flex: 1 1 22%; min-width: 0; }
    .hecho.j { flex: 2.4 1 45%; }
    .hecho.t { flex: 1 1 100%; }
    .hecho .l { font-size: 7.5px; text-transform: uppercase; letter-spacing: .07em; color: #72817e; }
    .hecho .v { font-weight: 700; color: #173f44; font-size: 10px; line-height: 1.3; }

    .pasos { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #dfe8e7; border-radius: 12px; overflow: hidden; }
    .paso { padding: 11px 12px; border-right: 1px solid #eaf0ef; }
    .paso:last-child { border-right: none; background: #f7faf3; }
    .paso .n { color: #8fcf18; font-size: 8px; font-weight: 800; }
    .paso .t { font-size: 8.5px; color: #647572; margin: 1px 0 3px; }
    .paso .v { font-size: 17px; font-weight: 800; color: #173f44; line-height: 1.1; }
    .paso .d { font-size: 8.3px; color: #72817e; margin-top: 4px; line-height: 1.35; }

    .cal { width: 100%; border-collapse: separate; border-spacing: 3px; table-layout: fixed; }
    .cal th { font-size: 8px; color: #72817e; font-weight: 700; padding-bottom: 2px; }
    .cal td { font-size: 8px; line-height: 1.2; text-align: center; padding: 4px 3px; border-radius: 6px; color: #243238; height: 34px; vertical-align: middle; }
    .cal td.vacia { border: 1px dashed #e3eaea; }
    .cal td.sem { text-align: left; width: 82px; padding-left: 0; color: #647572; }
    .cal td.sem b { display: block; font-size: 8px; }
    .cal td.sem span { display: block; font-size: 7px; line-height: 1.2; }
    .cal tr { break-inside: avoid; }
    .fd { display: block; font-size: 7px; color: #72817e; }
    .leyenda { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 8px; font-size: 8.5px; color: #647572; }
    .leyenda i { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }

    .caja { border: 1px solid #dfe8e7; border-radius: 12px; overflow: hidden; }
    .fila { display: grid; grid-template-columns: 135px 1fr auto; gap: 14px; align-items: center; padding: 11px 15px; border-bottom: 1px solid #eaf0ef; }
    .fila:last-child { border-bottom: none; }
    .f-nombre { font-weight: 700; color: #173f44; }
    .f-det { color: #647572; font-size: 9.5px; }
    .f-imp { font-weight: 800; color: #173f44; font-size: 12px; text-align: right; white-space: nowrap; }
    .fila.total { background: #173f44; }
    .fila.total .f-nombre { color: #fff; font-size: 12.5px; white-space: nowrap; }
    .fila.total .f-imp { font-size: 15px; }
    .fila.total .f-imp { color: #9be21b; }

    .pago { margin-top: 12px; border: 1px solid #dfe8e7; border-radius: 12px; padding: 12px 15px; }
    .pago-t { color: #647572; font-size: 9.5px; margin-bottom: 7px; }
    .barra { display: flex; gap: 2px; height: 9px; border-radius: 5px; overflow: hidden; }
    .pago-l { display: flex; gap: 18px; flex-wrap: wrap; margin-top: 8px; font-size: 9px; color: #647572; }
    .pago-l div { display: flex; align-items: center; gap: 5px; }
    .pago-l i { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
    .pago-l b { margin-left: 2px; }

    .aviso { border: 1px dashed #cfdcdb; border-radius: 12px; padding: 14px 16px; color: #647572; }

    .dos { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .bloque { border: 1px solid #dfe8e7; border-radius: 12px; padding: 11px 14px; font-size: 9.5px; color: #4d615f; }
    .bloque .lab { margin-bottom: 3px; }
    .consideracion { margin-top: 10px; border-left: 3px solid #9be21b; background: #f7f9f9; padding: 9px 12px; font-size: 8.8px; color: #596b68; line-height: 1.5; }

    .pie { margin-top: 14px; padding-top: 8px; border-top: 1px solid #dfe8e7; display: flex; justify-content: space-between; align-items: flex-end; font-size: 8px; color: #70807d; }
    .pie .marca { color: #78b409; font-weight: 800; letter-spacing: .1em; }
  </style>
</head>

<body>
  <main>
    <header class="top">
      <div>
        <div class="brand">ECOVATIO</div>
        <h1>Estimación de obra fotovoltaica</h1>
        <div class="sub">Duración y costo de mano de obra · para planificación y cotización</div>
      </div>
      <div class="meta">
        <strong>${esc(r.nombre)}</strong>
        ${esc(r.lugar)}<br />
        Generado el ${fecha}
      </div>
    </header>

    <section class="kpis">
      <div class="kpi main">
        <div class="lab">Plazo de ejecución</div>
        <div class="val">${ent(r.diasConSeguridad)} <small>${unidad}</small></div>
        <div class="s"><b>${ent(cal.diasCorridos)} días corridos</b> · ${ent(cal.semanas)} ${plural(
    cal.semanas,
    'semana',
    'semanas'
  )}${
    cal.fechaInicio
      ? `<br />${formatFechaCorta(cal.fechaInicio)} → ${formatFechaCorta(cal.fechaFin)}`
      : ''
  }</div>
      </div>

      <div class="kpi">
        <div class="lab">Mano de obra</div>
        <div class="val">${costo ? usd(costo.total) : '—'}</div>
        <div class="s">${
          costo ? `<b>${usd(costo.porKwp)}</b> por kWp` : 'Sin valor de MO ingresado'
        }</div>
      </div>

      <div class="kpi">
        <div class="lab">Cuadrilla</div>
        <div class="val">${ent(r.operarios)} <small>${plural(
    r.operarios,
    'operario',
    'operarios'
  )}</small></div>
        <div class="s">${
          r.conSupervisor ? '+ 1 supervisor' : 'Sin supervisor'
        }<br /><b>${ent(r.diasHombre)}</b> días-hombre</div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-t">El proyecto</div>
      <div class="hechos">
        ${hechosHtml}
      </div>
    </section>

    <section class="sec">
      <div class="sec-t">Cómo se calculó el plazo</div>
      <div class="pasos">
        ${pasos
          .map(
            ([t, v, d], i) => `
        <div class="paso">
          <div class="n">0${i + 1}</div>
          <div class="t">${esc(t)}</div>
          <div class="v">${esc(v)}</div>
          <div class="d">${esc(d)}</div>
        </div>`
          )
          .join('')}
      </div>
      <div class="nota">Las horas efectivas descuentan el tiempo de viaje (ida, vuelta y traslado diario al alojamiento), que se hace dentro del horario de trabajo.${
        cal.diasSoloViaje > 0
          ? ` ${cal.diasSoloViaje} de los ${ent(r.diasConSeguridad)} días son de solo viaje, sin horas efectivas de trabajo.`
          : ''
      }</div>
    </section>

    ${seccionCosto}

    <section class="sec">
      <div class="dos">
        <div class="bloque">
          <div class="lab">Incluye</div>
          ${esc(incluye)}
        </div>
        <div class="bloque">
          <div class="lab">No incluye</div>
          Materiales, alojamiento, viáticos ni gastos de traslado.
        </div>
      </div>
    </section>

    <section class="sec">
      <div class="sec-t">Cómo se compone la obra</div>
      <div class="nota" style="margin:0 0 7px">${esc(cal.composicion)}. ${esc(
    viajeResumen(r)
  )}</div>
      <table class="cal">
        <thead>
          <tr><th></th><th>Lun</th><th>Mar</th><th>Mié</th><th>Jue</th><th>Vie</th><th>Sáb</th><th>Dom</th></tr>
        </thead>
        <tbody>${filasCalendario}</tbody>
      </table>
      <div class="leyenda">${leyenda}</div>
    </section>

    <div class="consideracion">
      <strong>Consideración comercial:</strong> estimación basada en indicadores históricos de obras
      fotovoltaicas ejecutadas y en las condiciones ingresadas. El plazo puede variar por condiciones
      del sitio, clima, accesos, disponibilidad de materiales, interferencias con terceros o cambios
      en el alcance.
    </div>

    <footer class="pie">
      <div>Uso interno · Áreas Comercial, Ingeniería y Operaciones<br />Documento generado desde el Panel de Obras Solares.</div>
      <div class="marca">ECOVATIO</div>
    </footer>
  </main>

  <script>
    window.onload = function () {
      window.setTimeout(function () { window.print(); }, 300);
    };
  </script>
</body>
</html>`;
};

// Cronograma semanal: filas = semanas, columnas = lunes a domingo.
// `semanas` = [{ etiqueta?, celdas: [{ tipo, texto, fecha? }] }]
function CronogramaSemanas({ semanas }) {
  const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const conEtiquetas = semanas.some((sem) => sem.etiqueta);
  const conNumeros = semanas.length > 1;
  const columnaIzquierda = conEtiquetas ? '118px' : '58px';
  const tiposUsados = [
    ...new Set(semanas.flatMap((sem) => sem.celdas.map((c) => c.tipo))),
  ].filter((tipo) => tipo !== 'fin');

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: conNumeros
              ? `${columnaIzquierda} repeat(7, minmax(64px, 1fr))`
              : 'repeat(7, minmax(64px, 1fr))',
            gap: 4,
            minWidth: 520,
          }}
        >
          {conNumeros && <div />}
          {dias.map((d) => (
            <div
              key={d}
              style={{
                textAlign: 'center',
                fontSize: 10,
                color: '#8fa6a9',
                fontWeight: 700,
              }}
            >
              {d}
            </div>
          ))}

          {semanas.map((sem, i) => (
            <React.Fragment key={i}>
              {conNumeros && (
                <div
                  style={{
                    fontSize: 10,
                    color: '#b9c7c9',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    lineHeight: 1.3,
                  }}
                >
                  <strong style={{ color: '#d5dfe0' }}>Semana {i + 1}</strong>
                  {sem.etiqueta && <span>{sem.etiqueta}</span>}
                </div>
              )}

              {sem.celdas.map((celda, j) => {
                const { color } = TIPOS_CRONOGRAMA[celda.tipo];
                const vacia = celda.tipo === 'fin';

                return (
                  <div
                    key={j}
                    style={{
                      background: vacia ? 'transparent' : `${color}22`,
                      border: vacia ? '1px dashed #2c5059' : `1px solid ${color}66`,
                      borderRadius: 6,
                      padding: '4px 3px',
                      fontSize: 10,
                      lineHeight: 1.25,
                      textAlign: 'center',
                      color: '#e3eaea',
                      minHeight: 44,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                    }}
                  >
                    {celda.fecha && (
                      <span style={{ fontSize: 9, color: '#b9c7c9' }}>
                        {celda.fecha.getDate()}/{celda.fecha.getMonth() + 1}
                      </span>
                    )}
                    {celda.texto}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 10,
          fontSize: 11,
          color: '#b9c7c9',
        }}
      >
        {tiposUsados.map((tipo) => (
          <span key={tipo} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: TIPOS_CRONOGRAMA[tipo].color,
              }}
            />
            {TIPOS_CRONOGRAMA[tipo].leyenda}
          </span>
        ))}
      </div>
    </>
  );
}

// Filtro desplegable con selección múltiple. Lista vacía = "todos".
function MultiSelectFilter({
  allLabel,
  options,
  selected,
  onChange,
  align = 'left',
  minWidth = 170,
  searchable = false,
}) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const opcionesVisibles = searchable
    ? options.filter((o) => normalizeKey(o).includes(normalizeKey(query)))
    : options;

  useEffect(() => {
    if (!open) return undefined;

    const cerrarAlClickearAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };

    document.addEventListener('mousedown', cerrarAlClickearAfuera);
    return () =>
      document.removeEventListener('mousedown', cerrarAlClickearAfuera);
  }, [open]);

  const toggle = (opcion) =>
    onChange(
      selected.includes(opcion)
        ? selected.filter((item) => item !== opcion)
        : [...selected, opcion]
    );

  const resumen =
    selected.length === 0
      ? allLabel
      : selected.length === 1
      ? selected[0]
      : `${selected.length} seleccionados`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery('');
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{ minWidth }}
        className={cx(
          'flex h-8 items-center justify-between gap-3 truncate rounded-md border px-2.5 text-left text-sm shadow-xs outline-hidden transition-all',
          'bg-white dark:bg-gray-950',
          'text-gray-900 dark:text-gray-50',
          'hover:bg-gray-50 dark:hover:bg-gray-950/50',
          selected.length > 0
            ? 'border-amber-500 text-amber-600 dark:border-amber-500 dark:text-amber-500'
            : 'border-gray-300 dark:border-gray-800',
        )}
        title="Seleccionar una o varias opciones"
      >
        <span className="truncate">{resumen}</span>
        <span className="text-gray-400 dark:text-gray-600">▾</span>
      </button>

      {open && (
        <div
          style={{ minWidth: Math.max(minWidth, 230) }}
          className={cx(
            'absolute top-[calc(100%+6px)] z-50 max-h-80 overflow-y-auto rounded-md border p-2 shadow-lg',
            'border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-950',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          <label className="mb-1 flex cursor-pointer items-center gap-2 border-b border-gray-200 px-2 py-1.5 text-sm dark:border-gray-800">
            <Checkbox
              checked={selected.length === 0}
              onCheckedChange={() => onChange([])}
            />
            <span className="text-gray-900 dark:text-gray-50">{allLabel}</span>
          </label>

          {searchable && (
            <Input
              autoFocus
              placeholder="Buscar..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="my-1.5"
            />
          )}

          {opcionesVisibles.map((opcion) => (
            <label
              key={opcion}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <Checkbox
                checked={selected.includes(opcion)}
                onCheckedChange={() => toggle(opcion)}
              />
              <span className="text-gray-900 dark:text-gray-50">{opcion}</span>
            </label>
          ))}

          {opcionesVisibles.length === 0 && (
            <div className="p-2 text-sm text-gray-500 dark:text-gray-500">
              Sin opciones disponibles.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [potenciaInstalada, setPotenciaInstalada] = useState([]);
const [aniosPotencia, setAniosPotencia] = useState([]);
const [anioPotenciaSeleccionado, setAnioPotenciaSeleccionado] = useState('');
const [loadingPotencia, setLoadingPotencia] = useState(false);
const [errorPotencia, setErrorPotencia] = useState(null);
const [lastUpdatePotencia, setLastUpdatePotencia] = useState(null);
const [vistaPotencia, setVistaPotencia] = useState(
  VISTA_POTENCIA_POR_OBRA
);
const [personalOperaciones, setPersonalOperaciones] = useState({
  resumen: null,
  actuales: [],
  bajas: [],
  bajas_historicas: [],
  dotacion_mensual: [],
});

const [comparativaMO, setComparativaMO] = useState([]);
const [loadingComparativaMO, setLoadingComparativaMO] = useState(false);
const [errorComparativaMO, setErrorComparativaMO] = useState(null);
const [lastUpdateComparativaMO, setLastUpdateComparativaMO] = useState(null);
const [busquedaComparativaMO, setBusquedaComparativaMO] = useState('');
const [obrasExcluidasComparativaMO, setObrasExcluidasComparativaMO] =
  useState([]);

const [refComparativaMO, setRefComparativaMO] = useState('presupuesto');
const [ordenMO, setOrdenMO] = useState({ campo: 'fecha_input', dir: 'desc' });
const [ordenGraficoMO, setOrdenGraficoMO] = useState('desvio');
const [metricaMO, setMetricaMO] = useState('usd');


  const [fechaDesdeComparativaMO, setFechaDesdeComparativaMO] = useState('');
const [fechaHastaComparativaMO, setFechaHastaComparativaMO] = useState('');
const [rangoPotenciaComparativaMO, setRangoPotenciaComparativaMO] = useState(
  []
);

const [loadingPersonal, setLoadingPersonal] = useState(false);
const [errorPersonal, setErrorPersonal] = useState(null);
const [lastUpdatePersonal, setLastUpdatePersonal] = useState(null);
const [anioPersonalSeleccionado, setAnioPersonalSeleccionado] = useState(
  PERSONAL_TODOS_LOS_MESES
);
const [anioTablaPersonalSeleccionado, setAnioTablaPersonalSeleccionado] =
  useState(PERSONAL_TODOS_LOS_ANIOS);
  const [tabActiva, setTabActiva] = useState('dashboard');
  const [obras, setObras] = useState([]);
  const [proyectosEstado, setProyectosEstado] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loadingProyectos, setLoadingProyectos] = useState(false);
  const [errorProyectos, setErrorProyectos] = useState(null);
  const [lastUpdateProyectos, setLastUpdateProyectos] = useState(null);
  // Filtros de la tabla de obras: listas de valores elegidos ([] = todos).
  const [filtroEstado, setFiltroEstado] = useState([]);
  const [filtroTipoCliente, setFiltroTipoCliente] = useState([]);
  const [filtroImplantacion, setFiltroImplantacion] = useState([]);
  const [filtroEstructura, setFiltroEstructura] = useState([]);
  const [filtroObras, setFiltroObras] = useState([]);
  const [filtroPotencia, setFiltroPotencia] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [
    filtrosEstadoProyecto,
    setFiltrosEstadoProyecto,
  ] = useState([]);

  const [
    filtrosEstadoTablaProyecto,
    setFiltrosEstadoTablaProyecto,
  ] = useState([]);

const [busquedaProyecto, setBusquedaProyecto] = useState('');
  const [sortField, setSortField] = useState('hs_mo_kwp');
  const [sortDir, setSortDir] = useState('asc');
  const [criterioGraficoKwp, setCriterioGraficoKwp] =
  useState('implantacion');

  // Obra de referencia resaltada al pasar el mouse por una barra de la campana.
  const [refHover, setRefHover] = useState(null);
  // Ventana abierta desde una tarjeta de KPIs: 'activas' | 'hs' | 'capacidad'.
  const [modalKpi, setModalKpi] = useState(null);
  useEffect(() => {
    if (!modalKpi) return undefined;
    const alTeclear = (e) => {
      if (e.key === 'Escape') setModalKpi(null);
    };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [modalKpi]);
  const [formEstimacion, setFormEstimacion] = useState({
    nombre: '',
    potencia: '',
    operarios: '',
    indicador: '',
    lugar: '',
    modalidad: '1',
    trasladoEmpresa: '',
    trasladoAlojamiento: 'N/A',
    seguridad: '10',
    jornada: 'lv',
    supervisor: 'no',
    tarifaInstalador: '',
    tarifaSupervisor: '',
    fechaInicio: '',
    tipoClienteRef: 'Todos los clientes',
    implantacionRef: 'Todas las implantaciones',
    estructuraRef: 'Todas las estructuras',
    potenciaRef: 'Todas las potencias',
  });
  const [resultadoEstimacion, setResultadoEstimacion] = useState(null);
  const [errorEstimacion, setErrorEstimacion] = useState('');
  const [simOperarios, setSimOperarios] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.obras?.length) {
        setObras(json.obras.map(normalizarObra));
        setLastUpdate(new Date(json.timestamp).toLocaleString('es-AR'));
        setError(null);
      } else {
        setError('La fuente de datos de obras respondió sin obras.');
      }
    } catch (e) {
      setError('No se pudo conectar con la fuente de datos de obras.');
    } finally {
      setLoading(false);
    }
  };

  const fetchEstadoProyectos = async () => {
    setLoadingProyectos(true);

    try {
      const json = await fetchJsonp(ESTADO_PROYECTOS_API_URL);

      if (json && json.ok === false) {
        throw new Error(json.error || 'La API devolvió ok=false.');
      }

      const rows = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.proyectos)
        ? json.proyectos
        : Array.isArray(json?.rows)
        ? json.rows
        : Array.isArray(json)
        ? json
        : [];

        

      const proyectosNormalizados = rows
        .map(normalizarEstadoProyecto)
        .filter(esProyectoReal);

      setProyectosEstado(proyectosNormalizados);

      setLastUpdateProyectos(
        json?.updated_at || json?.timestamp
          ? new Date(json.updated_at || json.timestamp).toLocaleString('es-AR')
          : new Date().toLocaleString('es-AR')
      );

      setErrorProyectos(
        proyectosNormalizados.length
          ? null
          : 'La API conecta, pero no hay proyectos reales. Revisá en consola si llegan nombre_proyecto y estado.'
      );
    } catch (e) {
      console.error('Error Estado Proyectos:', e);
      // Se conservan los últimos datos cargados (si los hay) en vez de vaciar la pantalla.
      setErrorProyectos(
        `No se pudo actualizar Estado de Proyectos (Google no respondió). Si ya había datos, se muestran los últimos cargados. ${e?.message || ''}`
      );
    } finally {
      setLoadingProyectos(false);
    }
  };

  const fetchPotenciaInstalada = async () => {
    setLoadingPotencia(true);
  
    try {
      const json = await fetchJsonp(POTENCIA_INSTALADA_API_URL);

      if (json && json.ok === false) {
        throw new Error(json.error || 'La API devolvió ok=false.');
      }
  
      if (json?.obras && json?.costos && !json?.data) {
        throw new Error(
          'La API respondió el dashboard normal, no potencia_instalada. Revisá que el doGet esté leyendo action=potencia_instalada y que la Web App esté publicada con la última versión.'
        );
      }
  
      const data = Array.isArray(json?.data) ? json.data : [];
      const anios = Array.isArray(json?.anios_disponibles)
        ? json.anios_disponibles
        : data.map((x) => x.anio).filter(Boolean);
  
      setPotenciaInstalada(data);
      setAniosPotencia(anios);
  
      setAnioPotenciaSeleccionado((prev) => {
        if (prev === POTENCIA_TODOS_LOS_MESES) return prev;
        if (prev && anios.includes(Number(prev))) return prev;
        return anios.length ? String(Math.max(...anios)) : '';
      });
  
      setLastUpdatePotencia(
        json?.timestamp
          ? new Date(json.timestamp).toLocaleString('es-AR')
          : new Date().toLocaleString('es-AR')
      );
  
      if (!data.length) {
        const hojas = Array.isArray(json?.hojas_detectadas)
          ? json.hojas_detectadas.join(', ')
          : 'ninguna';
  
        setErrorPotencia(
          `La API conecta, pero no hay datos de potencia instalada. Hojas detectadas: ${hojas}.`
        );
      } else {
        setErrorPotencia(null);
      }
    } catch (e) {
      console.error('Error Potencia Instalada:', e);
  
      // Se conservan los últimos datos cargados (si los hay).
      setErrorPotencia(
        `No se pudo actualizar potencia instalada (Google no respondió). Si ya había datos, se muestran los últimos cargados. ${e?.message || ''}`
      );
    } finally {
      setLoadingPotencia(false);
    }
  };

  const fetchPersonalOperaciones = async () => {
    setLoadingPersonal(true);
  
    try {
      const json = await fetchJsonp(PERSONAL_OPERACIONES_API_URL);

      if (json && json.ok === false) {
        throw new Error(json.error || 'La API devolvió ok=false.');
      }
  
      if (json?.obras && json?.costos && !json?.data) {
        throw new Error(
          'La API respondió el dashboard normal, no personal_operaciones. Revisá que la URL tenga action=personal_operaciones y que la Web App esté publicada con la última versión.'
        );
      }

      
  


      const data = json?.data || {
        resumen: null,
        actuales: [],
        bajas: [],
        bajas_historicas: [],
        dotacion_mensual: [],
      };
      
      setPersonalOperaciones({
        resumen: data.resumen || null,
        actuales: Array.isArray(data.actuales) ? data.actuales : [],
        bajas: Array.isArray(data.bajas) ? data.bajas : [],
        bajas_historicas: Array.isArray(data.bajas_historicas)
          ? data.bajas_historicas
          : [],
        dotacion_mensual: Array.isArray(data.dotacion_mensual)
          ? data.dotacion_mensual
          : [],
      });
  
      setLastUpdatePersonal(
        json?.timestamp
          ? new Date(json.timestamp).toLocaleString('es-AR')
          : new Date().toLocaleString('es-AR')
      );
  
      setErrorPersonal(null);
    } catch (e) {
      console.error('Error Personal Operaciones:', e);
  
      // Se conservan los últimos datos cargados (si los hay).
      setErrorPersonal(
        `No se pudo actualizar la información de personal (Google no respondió). Si ya había datos, se muestran los últimos cargados. ${e?.message || ''}`
      );
    } finally {
      setLoadingPersonal(false);
    }
  };

  const fetchComparativaMO = async () => {
    setLoadingComparativaMO(true);
  
    try {
      const json = await fetchJsonp(COMPARATIVA_MO_API_URL);

      if (json && json.ok === false) {
        throw new Error(json.error || 'La API devolvió ok=false.');
      }
  
      const rows = Array.isArray(json?.data)
        ? json.data
        : Array.isArray(json?.rows)
        ? json.rows
        : Array.isArray(json)
        ? json
        : [];
  
       
   


      const data = rows
        .map(normalizarComparativaMO)
        .filter(esComparativaMOReal);



      setComparativaMO(data);
  
      setLastUpdateComparativaMO(
        json?.updated_at || json?.timestamp
          ? new Date(json.updated_at || json.timestamp).toLocaleString('es-AR')
          : new Date().toLocaleString('es-AR')
      );
  
      setErrorComparativaMO(
        data.length
          ? null
          : 'La API conecta, pero no hay obras reales para comparar.'
      );
    } catch (e) {
      console.error('Error Comparativa MO:', e);
  
      // Se conservan los últimos datos cargados (si los hay).
      setErrorComparativaMO(
        `No se pudo actualizar la comparativa de mano de obra (Google no respondió). Si ya había datos, se muestran los últimos cargados. ${
          e?.message || ''
        }`
      );
    } finally {
      setLoadingComparativaMO(false);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchData(),
      fetchPotenciaInstalada(),
      fetchPersonalOperaciones(),
      // Mismo Apps Script: primero la rápida, después la lenta, para que
      // Estado de Proyectos no retrase a Comparativa MO.
      (async () => {
        await fetchComparativaMO();
        await fetchEstadoProyectos();
      })(),
    ]);
  };

  useEffect(() => {
    fetchAllData();
    const iv = setInterval(() => {
      // No refresca con la pestaña del navegador oculta.
      if (!document.hidden) fetchAllData();
    }, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const indicadoresHistoricos = useMemo(() => {
    const valores = obras
      .map((o) => o.hs_mo_kwp)
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(Number(v)))
      .map(Number);
    if (!valores.length) return { promedio: null, mejor: null, peor: null };
    return {
      promedio: valores.reduce((s, v) => s + v, 0) / valores.length,
      mejor: Math.min(...valores),
      peor: Math.max(...valores),
    };
  }, [obras]);

  const estados = useMemo(
    () => [
      'Todos los estados',
      ...new Set(obras.map((o) => o.estado).filter(Boolean)),
    ],
    [obras]
  );
  const tiposCliente = useMemo(
    () => [
      'Todos los clientes',
      ...new Set(
        obras.map((o) => o.tipo_cliente).filter((v) => v && v !== 'undefined')
      ),
    ],
    [obras]
  );
  const implantaciones = useMemo(
    () => [
      'Todas las implantaciones',
      ...new Set(
        obras.map((o) => o.implantacion).filter((v) => v && isImplantacion(v))
      ),
    ],
    [obras]
  );

  const opcionesObrasDashboard = useMemo(
    () =>
      [...new Set(obras.map((o) => o.nombre).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [obras]
  );

  const estructurasDashboard = useMemo(() => {
    const filtradas = obras.filter((o) => {
      const coincideCliente =
        filtroTipoCliente.length === 0 ||
        filtroTipoCliente.includes(o.tipo_cliente);
      const coincideImplantacion =
        filtroImplantacion.length === 0 ||
        filtroImplantacion.includes(o.implantacion);
      return coincideCliente && coincideImplantacion && o.estructura;
    });
    return [
      ...new Set(
        filtradas.map((o) => o.estructura).filter((v) => v && isEstructura(v))
      ),
    ];
  }, [obras, filtroTipoCliente, filtroImplantacion]);

  // Si al cambiar cliente/implantación una estructura elegida deja de existir,
  // se quita de la selección.
  useEffect(() => {
    setFiltroEstructura((seleccionadas) => {
      const vigentes = seleccionadas.filter((e) =>
        estructurasDashboard.includes(e)
      );
      return vigentes.length === seleccionadas.length
        ? seleccionadas
        : vigentes;
    });
  }, [estructurasDashboard]);

  const estructurasEstimador = useMemo(() => {
    const filtradas = obras.filter((o) => {
      const coincideCliente =
        formEstimacion.tipoClienteRef === 'Todos los clientes' ||
        o.tipo_cliente === formEstimacion.tipoClienteRef;
      const coincideImplantacion =
        formEstimacion.implantacionRef === 'Todas las implantaciones' ||
        o.implantacion === formEstimacion.implantacionRef;
      return coincideCliente && coincideImplantacion && o.estructura;
    });
    return [
      'Todas las estructuras',
      ...new Set(
        filtradas.map((o) => o.estructura).filter((v) => v && isEstructura(v))
      ),
    ];
  }, [obras, formEstimacion.tipoClienteRef, formEstimacion.implantacionRef]);

  useEffect(() => {
    if (!estructurasEstimador.includes(formEstimacion.estructuraRef))
      setFormEstimacion((p) => ({
        ...p,
        estructuraRef: 'Todas las estructuras',
      }));
  }, [estructurasEstimador, formEstimacion.estructuraRef]);

  const indicadorSugerido = useMemo(() => {
    const similares = obras.filter((o) => {
      const coincideCliente =
        formEstimacion.tipoClienteRef === 'Todos los clientes' ||
        o.tipo_cliente === formEstimacion.tipoClienteRef;
      const coincideImplantacion =
        formEstimacion.implantacionRef === 'Todas las implantaciones' ||
        o.implantacion === formEstimacion.implantacionRef;
      const coincideEstructura =
        formEstimacion.estructuraRef === 'Todas las estructuras' ||
        o.estructura === formEstimacion.estructuraRef;
      const coincidePotencia =
        formEstimacion.potenciaRef === 'Todas las potencias' ||
        getPowerRangeLabel(getPowerRange(o.kwp)) === formEstimacion.potenciaRef;
      return (
        coincideCliente &&
        coincideImplantacion &&
        coincideEstructura &&
        coincidePotencia &&
        o.hs_mo_kwp != null &&
        !Number.isNaN(Number(o.hs_mo_kwp)) &&
        // Se descartan las obras "Alto" (12-18) y "Crítico" (>18) del
        // gráfico de Hs MO/kWp por obra (naranja y rojo): son casos
        // atípicos que no deberían influir en la sugerencia de cotización.
        Number(o.hs_mo_kwp) <= 12
      );
    });
    const valores = similares.map((o) => Number(o.hs_mo_kwp));
    if (!valores.length)
      return {
        cantidad: 0,
        promedio: null,
        sugerido: null,
        mejor: null,
        peor: null,
        curva: [],
        referencias: [],
      };

    const mejor = Math.min(...valores);
    const peor = Math.max(...valores);
    const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;
    const h = calcularAnchoBanda(valores);

    // "Sugerido" es el promedio ponderado por kWp de las obras similares
    // (ya sin las "Alto" y "Crítico"): cada obra pesa según su potencia, así
    // que equivale a las Hs MO totales sobre los kWp totales. Es estable
    // aunque haya pocas obras y siempre queda entre el Mejor y el Peor.
    const pesos = similares.map((o) => {
      const w = Number(o.kwp);
      return Number.isFinite(w) && w > 0 ? w : 0;
    });
    const sumaPesos = pesos.reduce((s, w) => s + w, 0);
    const sugerido =
      sumaPesos > 0
        ? valores.reduce((s, v, i) => s + v * pesos[i], 0) / sumaPesos
        : promedio;

    // Campana completa (con margen a los costados), no acotada a
    // Mejor-Peor.
    const margen = (peor - mejor) * 0.15 + h;
    const puntos = curvaDensidadEntre(
      valores,
      h,
      mejor - margen,
      peor + margen,
      60
    );

    // Obras históricas que entran en el cálculo (se muestran en segundo plano
    // dentro de la campana para que se vea de dónde sale el Sugerido).
    const referencias = similares
      .map((o, i) => ({
        nombre: o.nombre,
        valor: valores[i],
        kwp: pesos[i],
      }))
      .sort((a, b) => a.valor - b.valor);

    return {
      cantidad: valores.length,
      promedio,
      mejor,
      sugerido,
      peor,
      curva: puntos,
      referencias,
    };
  }, [
    obras,
    formEstimacion.tipoClienteRef,
    formEstimacion.implantacionRef,
    formEstimacion.estructuraRef,
    formEstimacion.potenciaRef,
  ]);

  const obrasFiltradas = useMemo(
    () =>
      obras
        .filter(
          (o) =>
            (filtroEstado.length === 0 || filtroEstado.includes(o.estado)) &&
            (filtroTipoCliente.length === 0 ||
              filtroTipoCliente.includes(o.tipo_cliente)) &&
            (filtroImplantacion.length === 0 ||
              filtroImplantacion.includes(o.implantacion)) &&
            (filtroEstructura.length === 0 ||
              filtroEstructura.includes(o.estructura)) &&
            (filtroObras.length === 0 || filtroObras.includes(o.nombre)) &&
            (filtroPotencia.length === 0 ||
              filtroPotencia.includes(
                getPowerRangeLabel(getPowerRange(o.kwp))
              )) &&
            (busqueda === '' ||
              o.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        )
        .sort((a, b) => {
          const av = a[sortField] ?? Infinity;
          const bv = b[sortField] ?? Infinity;
          if (typeof av === 'string' || typeof bv === 'string')
            return sortDir === 'asc'
              ? String(av).localeCompare(String(bv))
              : String(bv).localeCompare(String(av));
          return sortDir === 'asc' ? av - bv : bv - av;
        }),
    [
      obras,
      filtroEstado,
      filtroTipoCliente,
      filtroImplantacion,
      filtroEstructura,
      filtroObras,
      filtroPotencia,
      busqueda,
      sortField,
      sortDir,
    ]
  );

  const resumenTabla = useMemo(() => {
    const totalKwpTabla = obrasFiltradas.reduce(
      (s, o) => s + (Number(o.kwp) || 0),
      0
    );
    const obrasConHs = obrasFiltradas.filter((o) => o.hs_mo_kwp != null);
    const promedioHsTabla = obrasConHs.length
      ? obrasConHs.reduce((s, o) => s + Number(o.hs_mo_kwp), 0) /
        obrasConHs.length
      : null;
    return { totalKwpTabla, promedioHsTabla };
  }, [obrasFiltradas]);

  const stats = useMemo(() => {
    const listaActivas = obras
      .filter(
        (o) => o.estado === 'En obra' || o.estado === 'Parte solar finalizada'
      )
      .sort(
        (a, b) =>
          (Number(b.avance) || 0) - (Number(a.avance) || 0) ||
          (Number(b.kwp) || 0) - (Number(a.kwp) || 0)
      );
    const activas = listaActivas.length;
    const totalKwp = obras.reduce((s, o) => s + (Number(o.kwp) || 0), 0);
    const kwpInstalado = obras
      .filter((o) => o.avance === 100)
      .reduce((s, o) => s + (Number(o.kwp) || 0), 0);
    const conHs = obras.filter((o) => o.hs_mo_kwp != null);
    const avgHs = conHs.length
      ? (
          conHs.reduce((s, o) => s + Number(o.hs_mo_kwp), 0) / conHs.length
        ).toFixed(1)
      : '-';
    // Detalle para las ventanas de "Prom. HS MO/kWp" y "Capacidad total".
    const listaHs = [...conHs].sort(
      (a, b) => Number(a.hs_mo_kwp) - Number(b.hs_mo_kwp)
    );
    const sumaKwpHs = conHs.reduce((s, o) => s + (Number(o.kwp) || 0), 0);
    const hsPonderado = sumaKwpHs
      ? conHs.reduce(
          (s, o) => s + Number(o.hs_mo_kwp) * (Number(o.kwp) || 0),
          0
        ) / sumaKwpHs
      : null;
    const porEstado = Object.values(
      obras.reduce((acc, o) => {
        const k = o.estado || 'Sin estado';
        if (!acc[k]) acc[k] = { estado: k, obras: 0, kwp: 0 };
        acc[k].obras += 1;
        acc[k].kwp += Number(o.kwp) || 0;
        return acc;
      }, {})
    ).sort((a, b) => b.kwp - a.kwp);
    const obrasInstaladas = obras.filter((o) => o.avance === 100).length;
    return {
      activas,
      listaActivas,
      totalKwp,
      kwpInstalado,
      avgHs,
      listaHs,
      hsPonderado,
      porEstado,
      obrasInstaladas,
    };
  }, [obras]);

  // Potencia instalada según las hojas PI (la misma que muestra la solapa
  // "Potencia Instalada por año" en la vista "Todos"): así el KPI de la
  // pantalla principal coincide con esa solapa.
  const potenciaTotalInstalada = useMemo(() => {
    const meses = potenciaInstalada.flatMap((item) =>
      (item.meses || [])
        .filter((mes) => Number(mes.total_kwp) > 0)
        .map((mes) => ({ ...mes, anio: Number(item.anio) }))
    );
    const obrasSet = new Set();
    meses.forEach((mes) =>
      (mes.obras || []).forEach((o) => o.obra && obrasSet.add(o.obra))
    );
    const anios = [...new Set(meses.map((m) => m.anio))]
      .filter(Boolean)
      .sort((a, b) => a - b);
    return {
      disponible: meses.length > 0,
      totalKwp: meses.reduce((t, m) => t + Number(m.total_kwp || 0), 0),
      cantMeses: meses.length,
      cantObras: obrasSet.size,
      aniosTexto:
        anios.length > 1
          ? `${anios.slice(0, -1).join(', ')} y ${anios[anios.length - 1]}`
          : anios.length === 1
          ? String(anios[0])
          : '',
    };
  }, [potenciaInstalada]);

  const barData = useMemo(
    () =>
      obras
        .filter((o) => o.hs_mo_kwp != null)
        .sort((a, b) => a.hs_mo_kwp - b.hs_mo_kwp)
        .map((o) => ({
          name: o.nombre,
          value: o.hs_mo_kwp,
          fill: HsMoColor(o.hs_mo_kwp),
        })),
    [obras]
  );

  const pieData = useMemo(() => {
    const map = {};
  
    obras.forEach((o) => {
      const key =
        criterioGraficoKwp === 'tipo_cliente'
          ? cleanText(o.tipo_cliente)
          : cleanText(o.implantacion);
  
      const esValido =
        criterioGraficoKwp === 'tipo_cliente'
          ? key && key !== 'undefined'
          : isImplantacion(key);
  
      if (esValido) {
        map[key] = (map[key] || 0) + (Number(o.kwp) || 0);
      }
    });
  
    const dataBase = Object.entries(map).map(([name, value]) => ({
      name,
      value: Math.round(Number(value) || 0),
    }));
  
    return calcularPorcentajesEnteros(dataBase);
  }, [obras, criterioGraficoKwp]);

  const mejores = useMemo(
    () =>
      obras
        .filter((o) => o.hs_mo_kwp != null)
        .sort((a, b) => a.hs_mo_kwp - b.hs_mo_kwp)
        .slice(0, 5),
    [obras]
  );
  const peores = useMemo(
    () =>
      obras
        .filter((o) => o.hs_mo_kwp != null)
        .sort((a, b) => b.hs_mo_kwp - a.hs_mo_kwp)
        .slice(0, 5),
    [obras]
  );

 
  const estadosProyecto = useMemo(() => {
    return [
      ...new Set(
        proyectosEstado
          .map((p) => p.estado)
          .filter(Boolean)
      ),
    ];
  }, [proyectosEstado]);
  
  const toggleEstadoProyecto = (estado) => {
    setFiltrosEstadoProyecto((seleccionados) => {
      if (seleccionados.includes(estado)) {
        return seleccionados.filter((item) => item !== estado);
      }
  
      return [...seleccionados, estado];
    });
  };
  
  const proyectosEstadoFiltrados = useMemo(() => {
    const q = busquedaProyecto.trim().toLowerCase();
  
    return proyectosEstado.filter((p) => {
      const coincideEstado =
        filtrosEstadoProyecto.length === 0 ||
        filtrosEstadoProyecto.includes(p.estado);
  
      const coincideBusqueda =
        !q ||
        p.nombre_proyecto.toLowerCase().includes(q) ||
        p.id_proyecto.toLowerCase().includes(q) ||
        p.ubicacion.toLowerCase().includes(q);
  
      return coincideEstado && coincideBusqueda;
    });
  }, [
    proyectosEstado,
    filtrosEstadoProyecto,
    busquedaProyecto,
  ]);
  
  useEffect(() => {
    setFiltrosEstadoProyecto((seleccionados) =>
      seleccionados.filter((estado) =>
        estadosProyecto.includes(estado)
      )
    );
  }, [estadosProyecto]);

  const estadosTablaProyecto = useMemo(() => {
    return [
      ...new Set(
        proyectosEstadoFiltrados
          .map((p) => p.estado)
          .filter(Boolean)
      ),
    ];
  }, [proyectosEstadoFiltrados]);
  
  const toggleEstadoTablaProyecto = (estado) => {
    setFiltrosEstadoTablaProyecto((seleccionados) => {
      if (seleccionados.includes(estado)) {
        return seleccionados.filter((item) => item !== estado);
      }
  
      return [...seleccionados, estado];
    });
  };
  
  // Filtro inverso: los estados marcados son los que se OCULTAN, no los
  // que se muestran. Con nada marcado se ve todo.
  const proyectosEstadoTablaFiltrados = useMemo(() => {
    if (filtrosEstadoTablaProyecto.length === 0) {
      return proyectosEstadoFiltrados;
    }

    return proyectosEstadoFiltrados.filter(
      (p) => !filtrosEstadoTablaProyecto.includes(p.estado)
    );
  }, [
    proyectosEstadoFiltrados,
    filtrosEstadoTablaProyecto,
  ]);
  
  useEffect(() => {
    setFiltrosEstadoTablaProyecto((seleccionados) =>
      seleccionados.filter((estado) =>
        estadosTablaProyecto.includes(estado)
      )
    );
  }, [estadosTablaProyecto]);
 

  const statsProyectos = useMemo(() => {
    const total = proyectosEstado.length;
    const finalizados = proyectosEstado.filter(
      (p) => normalizeKey(p.estado) === 'finalizado'
    ).length;
    const enEjecucion = proyectosEstado.filter((p) =>
      normalizeKey(p.estado).includes('ejecucion')
    ).length;
    const pendientes = proyectosEstado.filter(
      (p) => normalizeKey(p.estado) === 'pendiente'
    ).length;
    const avancePromedio = total
      ? proyectosEstado.reduce((acc, p) => acc + (Number(p.avance) || 0), 0) /
        total
      : 0;
    return { total, finalizados, enEjecucion, pendientes, avancePromedio };
  }, [proyectosEstado]);

  const avanceProyectoData = useMemo(
    () =>
      [...proyectosEstadoFiltrados]
        .sort((a, b) => (Number(b.avance) || 0) - (Number(a.avance) || 0))
        .map((p) => ({
          name: p.nombre_proyecto || p.id_proyecto,
          value: p.avance,
          estado: p.estado,
          fill:
            p.avance >= 100
              ? '#95de1d'
              : p.avance >= 60
              ? '#4fc3f7'
              : p.avance > 0
              ? '#ffc933'
              : '#8fa6a9',
        })),
    [proyectosEstadoFiltrados]
  );

  const estadoProyectoData = useMemo(() => {
    const map = {};
  
    proyectosEstado.forEach((p) => {
      const estado = p.estado || 'Sin estado';
      map[estado] = (map[estado] || 0) + 1;
    });
  
    const dataBase = Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));
  
    return calcularPorcentajesEnteros(dataBase);
  }, [proyectosEstado]);

  const potenciaAnioActual = useMemo(() => {
    if (anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES) {
      const mesesCombinados = potenciaInstalada
        .flatMap((item) =>
          (item.meses || []).map((mes) => ({
            ...mes,
            anio: item.anio,
            mes_label_original: mes.mes_label,
            mes_label: mes.mes_label,
          }))
        )
        .filter((mes) => Number(mes.total_kwp) > 0)
        .sort((a, b) => {
          const anioA = Number(a.anio) || 0;
          const anioB = Number(b.anio) || 0;
  
          if (anioA !== anioB) return anioA - anioB;
  
          return Number(a.mes_numero) - Number(b.mes_numero);
        });
  
      const total = mesesCombinados.reduce(
        (acc, mes) => acc + Number(mes.total_kwp || 0),
        0
      );
  
      const promedio =
        mesesCombinados.length > 0 ? total / mesesCombinados.length : 0;
  
        return {
          anio: 'Todos',
          total_anual_kwp: Math.round(total * 10) / 10,
          total_anual_label: formatKwp(total),
          promedio_mensual_kwp: Math.round(promedio * 10) / 10,
          promedio_mensual_label: formatKwp(promedio),
          proyeccion_anual_kwp: null,
          proyeccion_anual_label: '—',
          cantidad_meses_con_potencia: mesesCombinados.length,
          meses: mesesCombinados,
        };
    }
  
    const anio = Number(anioPotenciaSeleccionado);

const dataAnio =
  potenciaInstalada.find((item) => Number(item.anio) === anio) || {
    anio,
    total_anual_kwp: 0,
    total_anual_label: '0 kWp',
    promedio_mensual_kwp: 0,
    promedio_mensual_label: '0 kWp',
    cantidad_meses_con_potencia: 0,
    meses: [],
  };

  const promedioMensual = Number(dataAnio.promedio_mensual_kwp) || 0;
  const totalInstalado = Number(dataAnio.total_anual_kwp) || 0;
  const mesesConPotencia = Number(dataAnio.cantidad_meses_con_potencia) || 0;
  const mesesRestantes = Math.max(12 - mesesConPotencia, 0);
  
  const proyeccionAnual =
    totalInstalado + promedioMensual * mesesRestantes;
  
  return {
    ...dataAnio,
    meses_restantes_proyeccion: mesesRestantes,
    proyeccion_anual_kwp: Math.round(proyeccionAnual * 10) / 10,
    proyeccion_anual_label:
      promedioMensual > 0 ? formatKwp(proyeccionAnual) : '0 kWp',
  };
  }, [potenciaInstalada, anioPotenciaSeleccionado]);
  const obrasPotenciaKeys = useMemo(() => {
    const set = new Set();
  
    potenciaAnioActual.meses.forEach((mes) => {
      mes.obras.forEach((obra) => {
        if (obra.obra) set.add(obra.obra);
      });
    });
  
    return Array.from(set);
  }, [potenciaAnioActual]);

  // Claves seguras para Recharts: un nombre con "." se interpretaría como ruta
  // anidada y uno llamado "mes"/"total_kwp" pisaría otras columnas.
  const obraDataKeys = useMemo(() => {
    const map = {};
    obrasPotenciaKeys.forEach((obra, i) => {
      map[obra] = `obra_${i}`;
    });
    return map;
  }, [obrasPotenciaKeys]);

  const potenciaMensualChartData = useMemo(() => {
    return potenciaAnioActual.meses.map((mes) => {
      const row = {
        mes: mes.mes_label,
        total_kwp: Number(mes.total_kwp) || 0,
        total_label: mes.total_label || formatKwp(mes.total_kwp),
      };

      mes.obras.forEach((obra) => {
        const key = obraDataKeys[obra.obra];
        if (key) row[key] = (row[key] || 0) + (Number(obra.kwp) || 0);
      });

      return row;
    });
  }, [potenciaAnioActual, obraDataKeys]);
  
  const mejoresMesesPotencia = useMemo(() => {
    return [...potenciaAnioActual.meses]
      .filter((m) => Number(m.total_kwp) > 0)
      .sort((a, b) => Number(b.total_kwp) - Number(a.total_kwp))
      .slice(0, 3);
  }, [potenciaAnioActual]);
  
  // Control de calidad: una misma obra repetida en el mismo mes suele ser una
  // carga duplicada en la hoja "PI aaaa" y infla el total. No se corrige en
  // silencio: se avisa para que se revise en la hoja de origen.
  const advertenciasPotencia = useMemo(() => {
    const avisos = [];

    potenciaAnioActual.meses.forEach((mes) => {
      const grupos = {};

      (mes.obras || []).forEach((o) => {
        const key = normalizeKey(o.obra);
        if (!key) return;
        if (!grupos[key]) grupos[key] = { obra: o.obra, kwps: [] };
        grupos[key].kwps.push(Number(o.kwp) || 0);
      });

      Object.values(grupos)
        .filter((g) => g.kwps.length > 1)
        .forEach((g) => {
          const anio = mes.anio || potenciaAnioActual.anio;
          avisos.push({
            id: `${anio}-${mes.mes_label}-${g.obra}`,
            hoja: `PI ${anio}`,
            mes: mes.mes_label,
            obra: cleanText(g.obra),
            veces: g.kwps.length,
            detalle: g.kwps.map((k) => formatKwp(k)).join(' + '),
            total: g.kwps.reduce((acc, k) => acc + k, 0),
          });
        });
    });

    return avisos;
  }, [potenciaAnioActual]);

  const obrasTotalesPotencia = useMemo(() => {
    const map = {};
  
    potenciaAnioActual.meses.forEach((mes) => {
      mes.obras.forEach((obra) => {
        map[obra.obra] = (map[obra.obra] || 0) + Number(obra.kwp || 0);
      });
    });
  
    return Object.entries(map)
      .map(([obra, kwp]) => ({
        obra,
        kwp: Math.round(kwp * 10) / 10,
      }))
      .sort((a, b) => b.kwp - a.kwp);
  }, [potenciaAnioActual]);
  const potenciaPersonalChartData = useMemo(() => {
    const personalPorMes = new Map();
  
    (personalOperaciones.dotacion_mensual || []).forEach((m) => {
      const anio = Number(m.anio);
      const mesNumero = Number(m.mes_numero);
  
      if (!anio || !mesNumero) return;
  
      const key = `${anio}-${mesNumero}`;
  
      personalPorMes.set(key, {
        dotacion_promedio:
          m.dotacion_promedio === null || m.dotacion_promedio === undefined
            ? null
            : Number(m.dotacion_promedio),
        dotacion_inicio:
          m.dotacion_inicio === null || m.dotacion_inicio === undefined
            ? null
            : Number(m.dotacion_inicio),
        dotacion_final:
          m.dotacion_final === null || m.dotacion_final === undefined
            ? null
            : Number(m.dotacion_final),
        altas_mes: Number(m.altas_mes || 0),
        bajas_mes: Number(m.bajas_mes || 0),
      });
    });
  
    return (potenciaAnioActual.meses || []).map((mes) => {
      const anioMes =
        Number(mes.anio) ||
        Number(potenciaAnioActual.anio) ||
        null;
  
      const mesNumero = Number(mes.mes_numero);
  
      const key =
        anioMes && mesNumero
          ? `${anioMes}-${mesNumero}`
          : '';
  
      const personalMes = personalPorMes.get(key) || {};
  
      const totalKwp = Number(mes.total_kwp || 0);

      const kwpTercerizado = (mes.obras || [])
        .filter((o) => esObraTercerizada(o.obra))
        .reduce((acc, o) => acc + (Number(o.kwp) || 0), 0);
      const kwpPropio = Math.max(totalKwp - kwpTercerizado, 0);

      const dotacion = Number(personalMes.dotacion_promedio);

      const tieneDotacion =
        !Number.isNaN(dotacion) && dotacion > 0;

      const kwpPorPersona = tieneDotacion
        ? Math.round((kwpPropio / dotacion) * 10) / 10
        : null;
  
      return {
        mes: mes.mes_label,
        anio: anioMes,
        mes_numero: mesNumero,
        total_kwp: totalKwp,
        total_label: mes.total_label || formatKwp(totalKwp),
        kwp_propio: Math.round(kwpPropio * 10) / 10,
        kwp_tercerizado: Math.round(kwpTercerizado * 10) / 10,

        dotacion_promedio: tieneDotacion ? dotacion : null,
        dotacion_inicio: personalMes.dotacion_inicio ?? null,
        dotacion_final: personalMes.dotacion_final ?? null,
        altas_mes: personalMes.altas_mes ?? 0,
        bajas_mes: personalMes.bajas_mes ?? 0,
  
        kwp_por_persona: kwpPorPersona,
      };
    });
  }, [potenciaAnioActual, personalOperaciones.dotacion_mensual]);

  const mesesComparadosRelacion = useMemo(() => {
    return potenciaPersonalChartData.filter((m) => {
      const potencia = Number(m.kwp_propio);
      const dotacion = Number(m.dotacion_promedio);

      return (
        !Number.isNaN(potencia) &&
        !Number.isNaN(dotacion) &&
        potencia > 0 &&
        dotacion > 0
      );
    });
  }, [potenciaPersonalChartData]);
  const promedioKwpPorPersona = useMemo(() => {
    const valores = potenciaPersonalChartData
    
      .map((m) => Number(m.kwp_por_persona))
      .filter((n) => !Number.isNaN(n) && n > 0);
  
    if (!valores.length) return null;
  
    return valores.reduce((acc, n) => acc + n, 0) / valores.length;
  }, [potenciaPersonalChartData]);
  
  const correlacionPotenciaDotacion = useMemo(() => {
    const pares = potenciaPersonalChartData
      .map((m) => ({
        x: Number(m.dotacion_promedio),
        y: Number(m.kwp_propio),
      }))
      .filter(
        (p) =>
          !Number.isNaN(p.x) &&
          !Number.isNaN(p.y) &&
          p.x > 0 &&
          p.y > 0
      );
  
    if (pares.length < 2) return null;
  
    const avgX = pares.reduce((acc, p) => acc + p.x, 0) / pares.length;
    const avgY = pares.reduce((acc, p) => acc + p.y, 0) / pares.length;
  
    const numerator = pares.reduce(
      (acc, p) => acc + (p.x - avgX) * (p.y - avgY),
      0
    );
  
    const denominatorX = Math.sqrt(
      pares.reduce((acc, p) => acc + Math.pow(p.x - avgX, 2), 0)
    );
  
    const denominatorY = Math.sqrt(
      pares.reduce((acc, p) => acc + Math.pow(p.y - avgY, 2), 0)
    );
  
    if (!denominatorX || !denominatorY) return null;
  
    return numerator / (denominatorX * denominatorY);
  }, [potenciaPersonalChartData]);

  const aniosPersonal = useMemo(() => {
    return [
      ...new Set(
        personalOperaciones.dotacion_mensual
          .map((m) => Number(m.anio))
          .filter(Boolean)
      ),
    ].sort((a, b) => a - b);
  }, [personalOperaciones.dotacion_mensual]);
  
  const dotacionMensualPersonal = useMemo(() => {
    const data = personalOperaciones.dotacion_mensual || [];
  
    if (anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES) {
      return data;
    }
  
    return data.filter(
      (m) => Number(m.anio) === Number(anioPersonalSeleccionado)
    );
  }, [personalOperaciones.dotacion_mensual, anioPersonalSeleccionado]);
  
  const promedioDotacionPersonal = useMemo(() => {
    const valores = dotacionMensualPersonal
      .map((m) => Number(m.dotacion_promedio))
      .filter((n) => !Number.isNaN(n));
  
    if (!valores.length) return null;
  
    return valores.reduce((acc, n) => acc + n, 0) / valores.length;
  }, [dotacionMensualPersonal]);

  // Dotación mensual completa, ordenada cronológicamente (sin filtro de año).
  const dotacionMensualOrdenada = useMemo(
    () =>
      [...(personalOperaciones.dotacion_mensual || [])].sort(
        (a, b) =>
          Number(a.anio) - Number(b.anio) ||
          Number(a.mes_numero) - Number(b.mes_numero)
      ),
    [personalOperaciones.dotacion_mensual]
  );

  const promedioSimple = (valores) =>
    valores.length
      ? valores.reduce((acc, n) => acc + n, 0) / valores.length
      : null;

  // Rotación por bajas de los últimos 12 meses.
  // Denominador: promedio de la dotación de cada uno de los últimos 12 meses
  // (más robusto que promediar solo inicio y fin). Si no hay 12 meses de
  // dotación, se usa el promedio inicio/fin que entrega el Apps Script.
  const rotacionCalculada = useMemo(() => {
    const resumen = personalOperaciones.resumen;

    const bajas = Number(resumen?.cantidad_bajas_operaciones);
    const bajasValidas = Number.isFinite(bajas) ? bajas : null;

    const ultimos12 = dotacionMensualOrdenada
      .slice(-12)
      .map((m) => Number(m.dotacion_promedio))
      .filter((n) => Number.isFinite(n));

    const usaPromedioMensual = ultimos12.length === 12;

    const dotacionPromedioFallback = Number(resumen?.dotacion_promedio);

    const dotacionPromedio = usaPromedioMensual
      ? promedioSimple(ultimos12)
      : Number.isFinite(dotacionPromedioFallback)
      ? dotacionPromedioFallback
      : null;

    const rotacionPct =
      bajasValidas !== null && dotacionPromedio > 0
        ? (bajasValidas / dotacionPromedio) * 100
        : null;

    return {
      bajas: bajasValidas,
      dotacionPromedio,
      usaPromedioMensual,
      rotacionPct,
      rotacionMensualPct: rotacionPct !== null ? rotacionPct / 12 : null,
      // A este ritmo, cada cuántos meses se renueva el equivalente a toda la dotación.
      recambioEnMeses:
        rotacionPct !== null && rotacionPct > 0 ? 1200 / rotacionPct : null,
    };
  }, [personalOperaciones.resumen, dotacionMensualOrdenada]);

  // Evolución: para cada mes, bajas de los 12 meses que terminan en ese mes
  // dividido por la dotación promedio de esos mismos 12 meses.
  const rotacionMovilData = useMemo(() => {
    const filas = [];

    for (let i = 11; i < dotacionMensualOrdenada.length; i++) {
      const ventana = dotacionMensualOrdenada.slice(i - 11, i + 1);

      const bajas = ventana.reduce(
        (acc, m) => acc + (Number(m.bajas_mes) || 0),
        0
      );

      const dotaciones = ventana
        .map((m) => Number(m.dotacion_promedio))
        .filter((n) => Number.isFinite(n));

      const promedio = promedioSimple(dotaciones);

      if (!promedio || promedio <= 0) continue;

      filas.push({
        mes: dotacionMensualOrdenada[i].mes_label,
        rotacion_pct: Math.round((bajas / promedio) * 1000) / 10,
        bajas,
        dotacion_promedio: Math.round(promedio * 10) / 10,
      });
    }

    return filas;
  }, [dotacionMensualOrdenada]);

  // Permanencia de las personas dadas de baja en los últimos 12 meses.
  const permanenciaBajas = useMemo(() => {
    const meses = (personalOperaciones.bajas || [])
      .map((p) => Number(p.meses_trabajados))
      .filter((n) => Number.isFinite(n));

    return {
      total: meses.length,
      menosDe6: meses.filter((n) => n < 6).length,
      entre6y12: meses.filter((n) => n >= 6 && n < 12).length,
      masDe12: meses.filter((n) => n >= 12).length,
    };
  }, [personalOperaciones.bajas]);

  const aniosTablaPersonal = useMemo(() => {
    const years = new Set();
  
    personalOperaciones.actuales.forEach((p) => {
      const y = getYearFromDateText(p.fecha_alta);
      if (y) years.add(y);
    });
  
    personalOperaciones.bajas.forEach((p) => {
      const y = getYearFromDateText(p.fecha_baja);
      if (y) years.add(y);
    });
  
    personalOperaciones.bajas_historicas.forEach((p) => {
      const yAlta = getYearFromDateText(p.fecha_alta);
      const yBaja = getYearFromDateText(p.fecha_baja);
      if (yAlta) years.add(yAlta);
      if (yBaja) years.add(yBaja);
    });

    return [...years].sort((a, b) => a - b);
  }, [
    personalOperaciones.actuales,
    personalOperaciones.bajas,
    personalOperaciones.bajas_historicas,
  ]);
  
  const personalActualFiltrado = useMemo(() => {
    if (anioTablaPersonalSeleccionado === PERSONAL_TODOS_LOS_ANIOS) {
      return personalOperaciones.actuales;
    }
  
    const anio = Number(anioTablaPersonalSeleccionado);
    const inicioAnio = new Date(anio, 0, 1);
    const finAnio = new Date(anio, 11, 31);

    const activoEnAnio = (p) => {
      const fechaAlta = parseDateText(p.fecha_alta);

      if (!fechaAlta || fechaAlta.getTime() > finAnio.getTime()) return false;

      // Personal actual: sin baja. Ex-personal: debe haberse ido en o después
      // del inicio del año.
      const fechaBaja = parseDateText(p.fecha_baja);
      return !fechaBaja || fechaBaja.getTime() >= inicioAnio.getTime();
    };

    const expersonal =
      personalOperaciones.bajas_historicas.length > 0
        ? personalOperaciones.bajas_historicas
        : personalOperaciones.bajas;

    return [...personalOperaciones.actuales, ...expersonal].filter(
      activoEnAnio
    );
  }, [
    personalOperaciones.actuales,
    personalOperaciones.bajas,
    personalOperaciones.bajas_historicas,
    anioTablaPersonalSeleccionado,
  ]);
  
  const bajasPersonalFiltradas = useMemo(() => {
    if (anioTablaPersonalSeleccionado === PERSONAL_TODOS_LOS_ANIOS) {
      return personalOperaciones.bajas;
    }
  
    const baseBajas =
      personalOperaciones.bajas_historicas.length > 0
        ? personalOperaciones.bajas_historicas
        : personalOperaciones.bajas;
  
    return baseBajas.filter((p) => {
      return (
        getYearFromDateText(p.fecha_baja) ===
        Number(anioTablaPersonalSeleccionado)
      );
    });
  }, [
    personalOperaciones.bajas,
    personalOperaciones.bajas_historicas,
    anioTablaPersonalSeleccionado,
  ]);

  
  
  const comparativaMOEnriquecida = useMemo(() => {
    return comparativaMO.map((p) => {
      const desvioVsPlan = getDeviationPct(
        p.dias_reales,
        p.dias_planificados
      );
  
      const desvioVsPresupuesto = getDeviationPct(
        p.dias_reales,
        p.dias_presupuestados
      );
  
      const fechaInput = toInputDate(p.fecha_inicio);
      const rangoPotencia = getPowerRange(p.potencia_kwp);
  
      return {
        ...p,
        fecha_input: fechaInput,
        mes_key: getMonthKey(p.fecha_inicio),
        mes_label: getMonthLabel(p.fecha_inicio),
        rango_potencia: rangoPotencia,
        rango_potencia_label: getPowerRangeLabel(rangoPotencia),
        desvio_vs_plan_pct: desvioVsPlan,
        desvio_vs_presupuesto_pct: desvioVsPresupuesto,
        desvio_abs_vs_plan_pct:
          desvioVsPlan === null ? null : Math.abs(desvioVsPlan),
        en_target:
          desvioVsPlan !== null ? Math.abs(desvioVsPlan) <= 10 : false,
      };
    });
  }, [comparativaMO]);

  const obrasComparativaMOOptions = useMemo(
    () =>
      [
        ...new Set(comparativaMOEnriquecida.map((p) => p.obra).filter(Boolean)),
      ].sort((a, b) => a.localeCompare(b)),
    [comparativaMOEnriquecida]
  );

  const comparativaMOFiltrada = useMemo(() => {
    return comparativaMOEnriquecida.filter((p) => {
      const coincideDesde =
        !fechaDesdeComparativaMO ||
        (p.fecha_input && p.fecha_input >= fechaDesdeComparativaMO);

      const coincideHasta =
        !fechaHastaComparativaMO ||
        (p.fecha_input && p.fecha_input <= fechaHastaComparativaMO);

      const coincidePotencia =
        rangoPotenciaComparativaMO.length === 0 ||
        rangoPotenciaComparativaMO.includes(p.rango_potencia_label);

      const noEstaExcluida = !obrasExcluidasComparativaMO.includes(p.obra);

      return (
        coincideDesde && coincideHasta && coincidePotencia && noEstaExcluida
      );
    });
  }, [
    comparativaMOEnriquecida,
    fechaDesdeComparativaMO,
    fechaHastaComparativaMO,
    rangoPotenciaComparativaMO,
    obrasExcluidasComparativaMO,
  ]);

  // Todo lo que muestra la solapa Comparativa MO sale de acá.
  // Desvío % = (real − referencia) / referencia. Positivo = usó más de lo
  // previsto (malo). Una obra solo entra en un cálculo si tiene AMBOS datos
  // (real y referencia) mayores a 0; nunca se completa con ceros.
  const analisisMO = useMemo(() => {
    const usarPlan = refComparativaMO === 'planificado';
    const positivo = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;
    const desvio = (real, ref) => ((real - ref) / ref) * 100;
    const suma = (lista, fn) => lista.reduce((acc, x) => acc + fn(x), 0);

    const obras = comparativaMOFiltrada.map((p, i) => {
      const diasRef = usarPlan ? p.dias_planificados : p.dias_presupuestados;
      const tieneDias = positivo(p.dias_reales) && positivo(diasRef);
      const tieneCosto =
        positivo(p.presupuesto_mo_usd) && positivo(p.gasto_mo_real_usd);

      const fecha = p.fecha_input || '';
      const anio = fecha ? Number(fecha.slice(0, 4)) : null;
      const mes = fecha ? Number(fecha.slice(5, 7)) : null;

      return {
        id: p.id || `${p.obra}-${i}`,
        obra: p.obra,
        fecha_inicio: p.fecha_inicio,
        fecha_input: fecha,
        trimestre: anio ? { anio, q: Math.ceil(mes / 3) } : null,
        kwp: positivo(p.potencia_kwp) ? p.potencia_kwp : null,
        rango: p.rango_potencia,
        diasReales: tieneDias ? p.dias_reales : null,
        diasRef: tieneDias ? diasRef : null,
        diasExtra: tieneDias ? p.dias_reales - diasRef : null,
        desvioDias: tieneDias ? desvio(p.dias_reales, diasRef) : null,
        presupuestoUsd: tieneCosto ? p.presupuesto_mo_usd : null,
        gastoUsd: tieneCosto ? p.gasto_mo_real_usd : null,
        saldoUsd: tieneCosto ? p.presupuesto_mo_usd - p.gasto_mo_real_usd : null,
        // Positivo = gastó de más que el presupuesto de MO (peor).
        desvioUsd: tieneCosto ? p.gasto_mo_real_usd - p.presupuesto_mo_usd : null,
        desvioCosto: tieneCosto
          ? desvio(p.gasto_mo_real_usd, p.presupuesto_mo_usd)
          : null,
      };
    });

    const agruparDias = (lista) => {
      const con = lista.filter((o) => o.desvioDias !== null);
      const real = suma(con, (o) => o.diasReales);
      const ref = suma(con, (o) => o.diasRef);
      return {
        n: con.length,
        real,
        ref,
        pct: ref > 0 ? desvio(real, ref) : null,
      };
    };

    const agruparCosto = (lista) => {
      const con = lista.filter((o) => o.desvioCosto !== null);
      const gasto = suma(con, (o) => o.gastoUsd);
      const presupuesto = suma(con, (o) => o.presupuestoUsd);
      const conKwp = con.filter((o) => o.kwp !== null);
      const kwp = suma(conKwp, (o) => o.kwp);

      const sobre = con.filter((o) => o.desvioUsd > 0);
      const ahorro = con.filter((o) => o.desvioUsd < 0);

      return {
        n: con.length,
        gasto,
        presupuesto,
        saldo: presupuesto - gasto,
        desvioUsd: gasto - presupuesto,
        sobrecostos: suma(sobre, (o) => o.desvioUsd),
        nSobre: sobre.length,
        ahorros: -suma(ahorro, (o) => o.desvioUsd),
        nAhorro: ahorro.length,
        pct: presupuesto > 0 ? desvio(gasto, presupuesto) : null,
        usdKwpReal: kwp > 0 ? suma(conKwp, (o) => o.gastoUsd) / kwp : null,
        usdKwpPres: kwp > 0 ? suma(conKwp, (o) => o.presupuestoUsd) / kwp : null,
      };
    };

    const conDias = obras.filter((o) => o.desvioDias !== null);
    const cumplen = conDias.filter((o) => o.desvioDias <= 10).length;
    const excedidas = conDias.filter((o) => o.desvioDias > 10).length;
    const porDebajo = conDias.filter((o) => o.desvioDias < -10).length;
    const enObjetivo = conDias.length - excedidas - porDebajo;

    const claveTrimestre = (t) => t.anio * 10 + t.q;

    const trimestres = [
      ...new Map(
        obras
          .filter((o) => o.trimestre)
          .map((o) => [claveTrimestre(o.trimestre), o.trimestre])
      ).entries(),
    ]
      .sort((a, b) => a[0] - b[0])
      .map(([clave, t]) => {
        const delTrimestre = obras.filter(
          (o) => o.trimestre && claveTrimestre(o.trimestre) === clave
        );

        const dias = agruparDias(delTrimestre);
        const costoTrimestre = agruparCosto(delTrimestre);
        const meses = [
          'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
        ];

        return {
          label: `${meses[(t.q - 1) * 3]}–${meses[t.q * 3 - 1]} ${String(
            t.anio
          ).slice(-2)}`,
          periodo: `${meses[(t.q - 1) * 3]}–${meses[t.q * 3 - 1]}`,
          anio: t.anio,
          obras: delTrimestre.length,
          dias: dias.pct,
          diasReales: dias.real,
          diasPrevistos: dias.ref,
          costo: costoTrimestre.pct,
          usd: costoTrimestre.n > 0 ? costoTrimestre.desvioUsd : null,
        };
      });

    const sumaUsd = (lista) =>
      suma(
        lista.filter((o) => o.desvioUsd !== null),
        (o) => o.desvioUsd
      );

    const grupos = [
      {
        clave: 'excedidas',
        label: 'Excedidas (más de +10%)',
        color: '#ff5f5f',
        lista: conDias.filter((o) => o.desvioDias > 10),
      },
      {
        clave: 'objetivo',
        label: 'En objetivo (±10%)',
        color: '#4fc3f7',
        lista: conDias.filter((o) => o.desvioDias >= -10 && o.desvioDias <= 10),
      },
      {
        clave: 'debajo',
        label: 'Por debajo (menos de −10%)',
        color: '#95de1d',
        lista: conDias.filter((o) => o.desvioDias < -10),
      },
    ].map((g) => ({
      clave: g.clave,
      label: g.label,
      color: g.color,
      n: g.lista.length,
      usd: sumaUsd(g.lista),
    }));

    const conUsd = obras.filter((o) => o.desvioUsd !== null);

    const porRango = ['micro', 'pequena', 'mediana', 'grande', 'muy_grande', 'parque']
      .map((clave) => {
        const lista = obras.filter((o) => o.rango === clave);

        return {
          clave,
          label: getPowerRangeLabel(clave),
          obras: lista.length,
          dias: agruparDias(lista),
          costo: agruparCosto(lista),
        };
      })
      .filter((r) => r.obras > 0);

    return {
      obras,
      conDias,
      sinDias: obras.length - conDias.length,
      cumplen,
      excedidas,
      porDebajo,
      enObjetivo,
      cumplimientoPct: conDias.length ? (cumplen / conDias.length) * 100 : null,
      dias: agruparDias(obras),
      costo: agruparCosto(obras),
      trimestres,
      porRango,
      grupos,
      topSobrecostos: conUsd
        .filter((o) => o.desvioUsd > 0)
        .sort((a, b) => b.desvioUsd - a.desvioUsd)
        .slice(0, 5),
      topAhorros: conUsd
        .filter((o) => o.desvioUsd < 0)
        .sort((a, b) => a.desvioUsd - b.desvioUsd)
        .slice(0, 5),
    };
  }, [comparativaMOFiltrada, refComparativaMO]);

  // Frase de lectura rápida para dirección, armada solo con datos calculados.
  const lecturaMO = useMemo(() => {
    const a = analisisMO;

    if (!a.conDias.length) return '';

    const refTxt =
      refComparativaMO === 'planificado' ? 'planificado' : 'presupuestado';
    const frases = [
      `De ${a.conDias.length} obras con datos, ${a.cumplen} (${Math.round(
        a.cumplimientoPct
      )}%) quedaron dentro de lo previsto (hasta +10% de días).`,
    ];

    if (a.dias.pct !== null) {
      frases.push(
        `En conjunto usaron ${Math.abs(a.dias.pct).toFixed(1)}% ${
          a.dias.pct >= 0 ? 'más' : 'menos'
        } días de mano de obra que lo ${refTxt}.`
      );
    }

    if (a.costo.pct !== null) {
      frases.push(
        `El costo de MO fue ${Math.abs(a.costo.pct).toFixed(1)}% ${
          a.costo.pct >= 0 ? 'mayor' : 'menor'
        } al presupuesto (${
          a.costo.saldo >= 0 ? 'saldo a favor de' : 'excedido en'
        } ${formatUsdAbs(a.costo.saldo)}).`
      );
    }

    // El total conjunto puede verse bien aunque cada obra se desvíe mucho:
    // los desvíos hacia arriba y hacia abajo se compensan.
    if (
      a.dias.pct !== null &&
      Math.abs(a.dias.pct) <= 10 &&
      a.enObjetivo / a.conDias.length < 0.5
    ) {
      frases.push(
        `Ojo: solo ${a.enObjetivo} de ${a.conDias.length} obras quedaron dentro de ±10%; el resultado conjunto compensa desvíos grandes en ambos sentidos.`
      );
    }

    return frases.join(' ');
  }, [analisisMO, refComparativaMO]);

  // Una barra por obra con días reales y referencia cargados.
  // Una barra por obra. Hacia la derecha siempre es peor (más días / más USD).
  const datosGraficoMO = useMemo(() => {
    const usd = metricaMO === 'usd';
    const base = usd
      ? analisisMO.obras.filter((o) => o.desvioUsd !== null)
      : analisisMO.conDias;

    const lista = base.map((o) => {
      const valor = usd ? o.desvioUsd : o.desvioDias;

      return {
        ...o,
        valor,
        etiqueta: `${o.obra}  ${
          usd ? formatUsdSigned(valor) : formatSignedPercent(valor)
        }`,
        fill: colorDesvioMO(usd ? o.desvioCosto : o.desvioDias),
      };
    });

    return lista.sort(
      ordenGraficoMO === 'desvio'
        ? (a, b) => b.valor - a.valor
        : (a, b) =>
            (a.fecha_input || '9999').localeCompare(b.fecha_input || '9999')
    );
  }, [analisisMO, ordenGraficoMO, metricaMO]);

  // Eje del gráfico. En %, se corta en +150% para que una obra extrema no
  // achate a las demás (el valor real queda escrito junto al nombre).
  const ejeGraficoMO = useMemo(() => {
    const valores = datosGraficoMO.map((o) => o.valor);
    const max = valores.length ? Math.max(...valores) : 0;
    const min = valores.length ? Math.min(...valores) : 0;

    if (metricaMO === 'usd') {
      // Redondeo a múltiplos "limpios" para que las marcas del eje sean legibles.
      const unidad = Math.max(Math.abs(min), Math.abs(max)) > 10000 ? 5000 : 1000;

      return {
        min: Math.min(-unidad, Math.floor(min / unidad) * unidad),
        max: Math.max(unidad, Math.ceil(max / unidad) * unidad),
        recortado: false,
      };
    }

    return {
      min: Math.min(-20, Math.floor(min / 10) * 10),
      max: Math.min(150, Math.max(20, Math.ceil(max / 10) * 10)),
      recortado: max > 150,
    };
  }, [datosGraficoMO, metricaMO]);

  // Puente: presupuesto + sobrecostos − ahorros = gasto real.
  const puenteMO = useMemo(() => {
    const c = analisisMO.costo;

    if (!c.n) return [];

    return [
      {
        nombre: 'Presupuesto',
        base: 0,
        valor: c.presupuesto,
        color: '#4fc3f7',
        texto: formatUsdAbs(c.presupuesto),
        detalle: `${c.n} obras con costo cargado`,
      },
      {
        nombre: 'Sobrecostos',
        base: c.presupuesto,
        valor: c.sobrecostos,
        color: '#ff5f5f',
        texto: `+${formatUsdAbs(c.sobrecostos)}`,
        detalle: `${c.nSobre} obras gastaron más de lo presupuestado`,
      },
      {
        nombre: 'Ahorros',
        base: c.presupuesto + c.sobrecostos - c.ahorros,
        valor: c.ahorros,
        color: '#95de1d',
        texto: `−${formatUsdAbs(c.ahorros)}`,
        detalle: `${c.nAhorro} obras gastaron menos de lo presupuestado`,
      },
      {
        nombre: 'Gasto real',
        base: 0,
        valor: c.gasto,
        color: '#9b7bff',
        texto: formatUsdAbs(c.gasto),
        detalle: '',
      },
    ];
  }, [analisisMO]);

  // Eje del puente con marcas "redondas" (0, 50k, 100k...).
  const ejePuenteMO = useMemo(() => {
    const maximo = puenteMO.length
      ? Math.max(...puenteMO.map((r) => r.base + r.valor))
      : 0;

    const potencia = Math.pow(10, Math.floor(Math.log10(Math.max(maximo, 1))));
    const paso = potencia >= 10000 ? potencia / 2 : potencia;
    const tope = Math.max(paso, Math.ceil((maximo * 1.05) / paso) * paso);
    const marcas = [];

    for (let v = 0; v <= tope; v += paso) marcas.push(v);

    return { tope, marcas };
  }, [puenteMO]);

  // Observaciones automáticas: concentración de sobrecostos y de ahorros.
  const insightsMO = useMemo(() => {
    const c = analisisMO.costo;
    const items = [];

    if (!c.n) return items;

    const conUsd = analisisMO.obras.filter((o) => o.desvioUsd !== null);
    const sobre = conUsd
      .filter((o) => o.desvioUsd > 0)
      .sort((a, b) => b.desvioUsd - a.desvioUsd);
    const ahorro = conUsd
      .filter((o) => o.desvioUsd < 0)
      .sort((a, b) => a.desvioUsd - b.desvioUsd);

    if (sobre.length && c.sobrecostos > 0) {
      const top = sobre[0];
      const parte = (top.desvioUsd / c.sobrecostos) * 100;

      if (parte >= 25) {
        items.push({
          texto: `${top.obra} explica el ${Math.round(parte)}% de todos los sobrecostos (${formatUsdAbs(top.desvioUsd)} de ${formatUsdAbs(c.sobrecostos)}).`,
        });
      }
    }

    if (ahorro.length >= 2 && c.ahorros > 0) {
      const dos = ahorro.slice(0, 2);
      const ahorroDos = -(dos[0].desvioUsd + dos[1].desvioUsd);
      const parte = (ahorroDos / c.ahorros) * 100;

      if (parte >= 50) {
        const sin = c.saldo - ahorroDos;

        items.push({
          texto: `Las 2 obras que más ahorraron (${dos[0].obra} y ${dos[1].obra}) explican el ${Math.round(parte)}% del ahorro total. Si hubieran cerrado justo en su presupuesto, el resultado sería ${
            sin >= 0 ? 'un saldo a favor de' : 'un exceso de'
          } ${formatUsdAbs(sin)}.`,
        });
      }
    }

    return items;
  }, [analisisMO]);

  const resultadoFavorMO = analisisMO.costo.n > 0 && analisisMO.costo.saldo >= 0;

  const tablaMO = useMemo(() => {
    const q = busquedaComparativaMO.trim().toLowerCase();
    const factor = ordenMO.dir === 'asc' ? 1 : -1;

    return analisisMO.obras
      .filter((o) => !q || o.obra.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[ordenMO.campo];
        const bv = b[ordenMO.campo];
        const vacio = (v) => v === null || v === undefined || v === '';

        if (vacio(av) && vacio(bv)) return 0;
        if (vacio(av)) return 1;
        if (vacio(bv)) return -1;
        if (typeof av === 'string') return factor * av.localeCompare(bv);

        return factor * (av - bv);
      });
  }, [analisisMO, busquedaComparativaMO, ordenMO]);

  const handleOrdenMO = (campo) =>
    setOrdenMO((actual) =>
      actual.campo === campo
        ? { campo, dir: actual.dir === 'asc' ? 'desc' : 'asc' }
        : { campo, dir: campo === 'obra' ? 'asc' : 'desc' }
    );

  const resetFiltrosComparativaMO = () => {
    setBusquedaComparativaMO('');
    setFechaDesdeComparativaMO('');
    setFechaHastaComparativaMO('');
    setRangoPotenciaComparativaMO([]);
    setObrasExcluidasComparativaMO([]);
  };

  const variacionInteranualPotencia = useMemo(() => {
    const resultadoVacio = {
      disponible: false,
      anioAnterior: null,
      ultimoMes: null,
      periodoLabel: '',
      totalActual: 0,
      totalAnterior: 0,
      diferenciaKwp: 0,
      variacionPct: null,
    };
  
    if (
      anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
    ) {
      return resultadoVacio;
    }
  
    const anioActual = Number(anioPotenciaSeleccionado);
  
    if (!anioActual) {
      return resultadoVacio;
    }
  
    const anioAnterior = anioActual - 1;
  
    const datosAnioActual = potenciaInstalada.find(
      (item) => Number(item.anio) === anioActual
    );
  
    const datosAnioAnterior = potenciaInstalada.find(
      (item) => Number(item.anio) === anioAnterior
    );
  
    if (!datosAnioActual || !datosAnioAnterior) {
      return {
        ...resultadoVacio,
        anioAnterior,
      };
    }
  
    const mesesActuales = Array.isArray(
      datosAnioActual.meses
    )
      ? datosAnioActual.meses
      : [];
  
    const mesesAnteriores = Array.isArray(
      datosAnioAnterior.meses
    )
      ? datosAnioAnterior.meses
      : [];
  
    /*
     * Se busca el último mes del año seleccionado
     * que tenga potencia instalada.
     */
  
    const numerosMesesConPotencia = mesesActuales
      .filter((mes) => Number(mes.total_kwp || 0) > 0)
      .map((mes) => Number(mes.mes_numero))
      .filter(
        (mesNumero) =>
          mesNumero >= 1 && mesNumero <= 12
      );
  
    if (!numerosMesesConPotencia.length) {
      return {
        ...resultadoVacio,
        anioAnterior,
      };
    }
  
    const ultimoMes = Math.max(
      ...numerosMesesConPotencia
    );
  
    /*
     * Se suma el año actual hasta el último mes cargado.
     */
  
    const totalActual = mesesActuales
      .filter(
        (mes) =>
          Number(mes.mes_numero) >= 1 &&
          Number(mes.mes_numero) <= ultimoMes
      )
      .reduce(
        (acumulado, mes) =>
          acumulado + Number(mes.total_kwp || 0),
        0
      );
  
    /*
     * Se suma el año anterior exactamente
     * hasta el mismo mes.
     */
  
    const totalAnterior = mesesAnteriores
      .filter(
        (mes) =>
          Number(mes.mes_numero) >= 1 &&
          Number(mes.mes_numero) <= ultimoMes
      )
      .reduce(
        (acumulado, mes) =>
          acumulado + Number(mes.total_kwp || 0),
        0
      );
  
    if (totalAnterior <= 0) {
      return {
        ...resultadoVacio,
        anioAnterior,
        ultimoMes,
        totalActual,
      };
    }
  
    const diferenciaKwp =
      totalActual - totalAnterior;
  
    const variacionPct =
      (diferenciaKwp / totalAnterior) * 100;
  
    const nombresMeses = [
      '',
      'ene',
      'feb',
      'mar',
      'abr',
      'may',
      'jun',
      'jul',
      'ago',
      'sept',
      'oct',
      'nov',
      'dic',
    ];
  
    const periodoLabel =
      ultimoMes === 12
        ? 'año completo'
        : `ene–${nombresMeses[ultimoMes]}`;
  
    return {
      disponible: true,
      anioAnterior,
      ultimoMes,
      periodoLabel,
      totalActual,
      totalAnterior,
      diferenciaKwp,
      variacionPct,
    };
  }, [
    potenciaInstalada,
    anioPotenciaSeleccionado,
  ]);

  const mostrarProyeccionAnual =
  anioPotenciaSeleccionado !== POTENCIA_TODOS_LOS_MESES &&
  Number(potenciaAnioActual.cantidad_meses_con_potencia || 0) > 0 &&
  Number(potenciaAnioActual.cantidad_meses_con_potencia || 0) < 12;

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const updateForm = (field, value) => {
    setFormEstimacion((p) => {
      const siguiente = { ...p, [field]: value };

      if (field === 'modalidad') {
        siguiente.trasladoAlojamiento = value === '1' ? 'N/A' : '';
      }

      // Las jornadas con estadía en el lugar necesitan el tiempo
      // alojamiento → obra.
      if (field === 'jornada' && value !== 'lv' && p.modalidad === '1') {
        siguiente.modalidad = '2';
        siguiente.trasladoAlojamiento = '';
      }

      return siguiente;
    });

    setErrorEstimacion('');
  };

  const resetFormEstimacion = () => {
    setResultadoEstimacion(null);
    setErrorEstimacion('');
    setSimOperarios('');
    setFormEstimacion({
      nombre: '',
      potencia: '',
      operarios: '',
      indicador: '',
      lugar: '',
      modalidad: '1',
      trasladoEmpresa: '',
      trasladoAlojamiento: 'N/A',
      seguridad: '10',
      jornada: 'lv',
      supervisor: 'no',
      tarifaInstalador: '',
      tarifaSupervisor: '',
      fechaInicio: '',
      tipoClienteRef: 'Todos los clientes',
      implantacionRef: 'Todas las implantaciones',
      estructuraRef: 'Todas las estructuras',
      potenciaRef: 'Todas las potencias',
    });
  };

  // Último valor de "costo instalador por día" cargado en la hoja de MO.
  const tarifaInstaladorSugerida = useMemo(() => {
    const conTarifa = comparativaMO
      .filter((o) => Number.isFinite(o.costo_instalador_dia) && o.costo_instalador_dia > 0)
      .sort((a, b) =>
        (toInputDate(b.fecha_inicio) || '').localeCompare(
          toInputDate(a.fecha_inicio) || ''
        )
      );

    return conTarifa.length ? conTarifa[0].costo_instalador_dia : null;
  }, [comparativaMO]);

  const calcularEstimacion = () => {
    const A = formEstimacion.nombre.trim();
    const E = formEstimacion.lugar.trim();
    const jornadaClave = formEstimacion.jornada;
    const jornada = JORNADAS_OBRA[jornadaClave] || JORNADAS_OBRA.lv;
    const F = jornada.seQuedaEnLugar ? '2' : formEstimacion.modalidad;
    const B = parseNum(formEstimacion.potencia);
    const C = parseNum(formEstimacion.operarios);
    const D = parseNum(formEstimacion.indicador);
    const G = parseNum(formEstimacion.trasladoEmpresa);
    const H = F === '1' ? 0 : parseNum(formEstimacion.trasladoAlojamiento);
    const XS = parseNum(formEstimacion.seguridad);
    const conSupervisor = formEstimacion.supervisor === 'si';

    const textoTarifaInst = String(formEstimacion.tarifaInstalador).trim();
    const textoTarifaSup = String(formEstimacion.tarifaSupervisor).trim();
    const tarifaInstalador = textoTarifaInst ? parseNum(textoTarifaInst) : null;
    const tarifaSupervisor = textoTarifaSup ? parseNum(textoTarifaSup) : null;

    if (!A || !E) {
      setErrorEstimacion('Completá el nombre y el lugar.');
      return;
    }
    if ([B, C, D, G, XS].some(Number.isNaN) || (F === '2' && Number.isNaN(H))) {
      setErrorEstimacion('Valores numéricos incompletos.');
      return;
    }
    if (B <= 0 || C <= 0 || D <= 0 || G < 0 || XS < 0 || (F === '2' && H < 0)) {
      setErrorEstimacion(
        'Potencia, operarios e indicador deben ser mayores a 0; traslados y seguridad no pueden ser negativos.'
      );
      return;
    }
    if (
      (tarifaInstalador !== null &&
        (Number.isNaN(tarifaInstalador) || tarifaInstalador < 0)) ||
      (tarifaSupervisor !== null &&
        (Number.isNaN(tarifaSupervisor) || tarifaSupervisor < 0))
    ) {
      setErrorEstimacion('Los valores de mano de obra deben ser números positivos.');
      return;
    }
    if (tarifaInstalador === null && tarifaSupervisor !== null) {
      setErrorEstimacion('Ingresá también el valor de mano de obra del instalador.');
      return;
    }
    if (tarifaInstalador !== null && conSupervisor && tarifaSupervisor === null) {
      setErrorEstimacion(
        'Ingresá el valor de mano de obra del supervisor (o elegí "Sin supervisor").'
      );
      return;
    }

    const plan = calcularPlanObra({
      B,
      C,
      D,
      G,
      H,
      XS,
      jornada: jornadaClave,
      modalidad: F,
      supervisor: conSupervisor,
      tarifaInstalador,
      tarifaSupervisor,
      fechaInicio: formEstimacion.fechaInicio,
    });

    if (plan.error) {
      setErrorEstimacion(plan.error);
      return;
    }

    setResultadoEstimacion({
      nombre: A,
      potencia: B,
      operarios: C,
      indicador: D,
      lugar: E,
      modalidad: F,
      trasladoEmpresa: G,
      trasladoAlojamiento: F === '1' ? 'N/A' : H,
      seguridad: XS,
      horasTotales: plan.horasTotales,
      horasPorOperario: plan.horasPorOperario,
      horasDiarias: plan.horasDiarias,
      horasPlanBase: plan.horasPlanBase,
      horasUnDiaMenos: plan.horasUnDiaMenos,
      diasNecesarios: plan.diasNecesarios,
      diasConSeguridad: plan.diasConSeguridad,
      diasHombre: plan.diasHombre,
      factorSeguridad: plan.factorSeguridad,
      jornada: jornadaClave,
      calendario: plan.calendario,
      conSupervisor,
      costo: plan.costo,
      vueltaSabadoDisponible: plan.vueltaSabadoDisponible,
      tipoClienteRef: formEstimacion.tipoClienteRef,
      implantacionRef: formEstimacion.implantacionRef,
      estructuraRef: formEstimacion.estructuraRef,
    });
    setSimOperarios('');
    setErrorEstimacion('');
  };

  const simularOperarios = () => {
    if (!resultadoEstimacion) return null;
    const C2 = parseNum(simOperarios);
    if (Number.isNaN(C2) || C2 <= 0) return null;
    return {
      operarios: C2,
      dias: Math.ceil(resultadoEstimacion.diasHombre / C2),
    };
  };

  const simulacion = simularOperarios();

  const exportarInformePDF = () => {
    if (!resultadoEstimacion) return;

    const html = construirHtmlInforme(resultadoEstimacion);
    const w = window.open('', '_blank');

    if (!w) {
      alert('Permití las ventanas emergentes para exportar el informe.');
      return;
    }

    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const actualizandoAlgo =
    loading ||
    loadingProyectos ||
    loadingPotencia ||
    loadingPersonal ||
    loadingComparativaMO;

  if (loading && obras.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center text-gray-500 dark:text-gray-500">
          <div className="mb-3 text-4xl">⚡</div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-transparent dark:text-gray-50">
      <header
        className="flex items-center justify-between border-b border-white/10 px-6 py-3 shadow-lg shadow-black/20"
        style={{ background: 'linear-gradient(110deg, #123138 0%, #1d4a50 55%, #24604f 100%)' }}
      >
        <div className="flex items-center">
          <img
            src="/logo-ecovatio.png"
            alt="Ecovatio"
            className="mr-4 h-7 shrink-0"
          />
          <div className="border-l border-white/15 pl-4">
            <div className="text-sm font-bold">Panel de Obras Solares</div>
            <div className="text-xs text-gray-500 dark:text-gray-500">
              Indicadores de gestión fotovoltaica
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="hidden text-xs text-gray-500 dark:text-gray-500 sm:inline">
              Actualizado: {lastUpdate}
            </span>
          )}
          <Button
            variant="secondary"
            onClick={fetchAllData}
            isLoading={actualizandoAlgo}
            loadingText="Actualizando..."
          >
            ↻ Actualizar
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-6 pt-4">
        <TabNavigation>
          {DASHBOARD_TABS.map(([id, label, Icon]) => (
            <TabNavigationLink
              key={id}
              active={tabActiva === id}
              onClick={() => setTabActiva(id)}
              className="cursor-pointer gap-1.5"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </TabNavigationLink>
          ))}
        </TabNavigation>
      </div>

      {/* ── ESTIMADOR ── */}
      {tabActiva === 'estimador' && (
        <main style={S.main}>
          <div style={S.card}>
            <h2 style={{ margin: 0, fontSize: 20 }}>Estimación de Obras FV</h2>
            <p style={{ color: '#e3eaea', fontSize: 14, marginTop: 14 }}>
              Completá los datos para calcular la planificación de tu obra
              solar.
            </p>
            <div
              style={{
                background: '#16323a',
                border: '1px solid #2c5059',
                borderRadius: 10,
                padding: 12,
                marginTop: 12,
                marginBottom: 18,
              }}
            >
              <div style={{ fontSize: 12, color: '#b9c7c9', marginBottom: 8 }}>
                Indicadores históricos Ecovatio
              </div>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Indicador</th>
                    <th style={S.th}>Hs MO / kWp</th>
                    <th style={S.th}>Uso recomendado</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [
                      'Mejor',
                      indicadoresHistoricos.mejor,
                      'Obras muy eficientes',
                    ],
                    [
                      'Promedio',
                      indicadoresHistoricos.promedio,
                      'Estimación general',
                    ],
                    ['Peor', indicadoresHistoricos.peor, 'Obras complejas'],
                  ].map(([l, v, u]) => (
                    <tr key={l}>
                      <td style={S.td}>{l}</td>
                      <td style={S.td}>{v != null ? v.toFixed(2) : '—'}</td>
                      <td style={S.td}>{u}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div
              style={{
                background: '#1d3c44',
                border: '1px solid #3b5d65',
                borderRadius: 10,
                padding: 14,
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: '#b9c7c9',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                  fontWeight: 700,
                }}
              >
                Sugerencia automática según obras similares
              </div>
              <div style={{ ...S.formGrid, gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  ['tipoClienteRef', 'Tipo de cliente', tiposCliente],
                  ['implantacionRef', 'Implantación', implantaciones],
                  ['estructuraRef', 'Tipo de estructura', estructurasEstimador],
                  [
                    'potenciaRef',
                    'Rango de potencia',
                    ['Todas las potencias', ...OPCIONES_POTENCIA_LABELS],
                  ],
                ].map(([f, l, opts]) => (
                  <div key={f}>
                    <label style={S.label}>{l}</label>
                    <select
                      style={S.estimatorInput}
                      value={formEstimacion[f]}
                      onChange={(e) => updateForm(f, e.target.value)}
                    >
                      {opts.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16 }}>
                {indicadorSugerido.sugerido !== null ? (
                  <>
                    <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
  }}
>
  {[
    {
      label: 'Obras similares',
      value: indicadorSugerido.cantidad,
      color: '#f4f8f8',
      indicador: null,
      boton: null,
      botonColor: null,
      botonBorde: null,
    },
    {
      label: 'Mejor',
      value: indicadorSugerido.mejor,
      color: '#95de1d',
      indicador: indicadorSugerido.mejor,
      boton: 'Usar mejor',
      botonColor: '#166534',
      botonBorde: '#95de1d',
    },
    {
      label: 'Sugerido',
      value: indicadorSugerido.sugerido,
      color: '#ffc933',
      indicador: indicadorSugerido.sugerido,
      boton: 'Usar sugerido',
      botonColor: '#e5a91c',
      botonBorde: '#ffc933',
    },
    {
      label: 'Peor valor registrado',
      value: indicadorSugerido.peor,
      color: '#ff5f5f',
      indicador: indicadorSugerido.peor,
      boton: 'Usar peor',
      botonColor: '#991b1b',
      botonBorde: '#ff5f5f',
    },
  ].map((item) => (
    <div
      key={item.label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          color: '#8fa6a9',
          fontSize: 11,
          marginBottom: 4,
        }}
      >
        {item.label}
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: item.color,
        }}
      >
        {item.indicador !== null ? (
          <HsLabel
            value={item.value.toFixed(2)}
            color={item.color}
          />
        ) : (
          item.value
        )}
      </div>

      {item.indicador !== null && (
        <button
          style={{
            ...S.primaryBtn,
            marginTop: 12,
            background: item.botonColor,
            borderColor: item.botonBorde,
            padding: '8px 12px',
            fontSize: 12,
          }}
          onClick={() =>
            updateForm(
              'indicador',
              item.indicador.toFixed(2)
            )
          }
        >
          {item.boton}
        </button>
      )}
    </div>
  ))}
</div>

{indicadorSugerido.curva.length > 1 && (
  <div style={{ marginTop: 18 }}>
    <div
      style={{
        fontSize: 10,
        color: '#8fa6a9',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 6,
      }}
    >
      Cómo se calculó el sugerido — {indicadorSugerido.cantidad}{' '}
      obras similares (promedio ponderado por kWp)
    </div>
    <div
      style={{
        height: 18,
        fontSize: 12,
        color: '#b9c7c9',
        marginBottom: 2,
      }}
    >
      {refHover !== null && indicadorSugerido.referencias[refHover] ? (
        <>
          <strong style={{ color: '#f4f8f8' }}>
            {indicadorSugerido.referencias[refHover].nombre}
          </strong>
          {' · '}
          {indicadorSugerido.referencias[refHover].valor.toFixed(2)} HS MO /
          kWp{' · '}
          {indicadorSugerido.referencias[refHover].kwp.toFixed(0)} kWp
        </>
      ) : (
        <span style={{ color: '#8fa6a9', fontSize: 11 }}>
          Las barras grises son las obras de referencia: pasá el mouse para
          ver cuál es.
        </span>
      )}
    </div>
    <ResponsiveContainer width="100%" height={170}>
      <AreaChart
        data={indicadorSugerido.curva}
        margin={{ top: 28, right: 28, bottom: 0, left: 8 }}
      >
        <defs>
          <linearGradient id="densidadSugerido" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc933" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#ffc933" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="x"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={{ fill: '#8fa6a9', fontSize: 10 }}
          tickFormatter={(v) => v.toFixed(1)}
        />
        <YAxis hide domain={[0, 'dataMax']} />
        <Tooltip
          formatter={(v) => [Number(v).toFixed(3), 'densidad relativa']}
          labelFormatter={(v) => `${Number(v).toFixed(2)} HS MO / kWp`}
          contentStyle={{
            background: '#2c5059',
            border: '1px solid #3b5d65',
            borderRadius: 8,
            fontSize: 11,
          }}
        />
        <Area
          type="monotone"
          dataKey="densidad"
          stroke="#ffc933"
          strokeWidth={2}
          fill="url(#densidadSugerido)"
          isAnimationActive={false}
        />
        {(() => {
          // Una barra translúcida por obra de referencia: su posición es el
          // indicador de la obra y su altura, el peso (kWp) que tiene en el
          // promedio. Van al fondo, sin competir con la campana.
          const maxDens = Math.max(
            ...indicadorSugerido.curva.map((c) => c.densidad),
            0
          );
          const xs = indicadorSugerido.curva.map((c) => c.x);
          const ancho = (Math.max(...xs) - Math.min(...xs)) / 55;
          const maxKwp = Math.max(
            ...indicadorSugerido.referencias.map((r) => r.kwp),
            1
          );
          return indicadorSugerido.referencias.map((r, i) => {
            const alto = maxDens * (0.25 + 0.6 * (r.kwp / maxKwp));
            const activa = refHover === i;
            return (
              <ReferenceArea
                key={`ref-${r.nombre}-${i}`}
                x1={r.valor - ancho / 2}
                x2={r.valor + ancho / 2}
                y1={0}
                y2={alto}
                ifOverflow="visible"
                shape={({ x, y, width, height }) => (
                  <g
                    onMouseEnter={() => setRefHover(i)}
                    onMouseLeave={() => setRefHover(null)}
                    style={{ cursor: 'default' }}
                  >
                    {/* zona de contacto más ancha que la barra visible */}
                    <rect
                      x={x - 4}
                      y={y}
                      width={width + 8}
                      height={height}
                      fill="transparent"
                    />
                    <rect
                      x={x}
                      y={y}
                      width={Math.max(width, 5)}
                      height={height}
                      rx={1.5}
                      fill="#b9c7c9"
                      fillOpacity={activa ? 0.85 : 0.35}
                      stroke={activa ? '#ffffff' : 'none'}
                    />
                  </g>
                )}
              />
            );
          });
        })()}
        <ReferenceLine
          x={indicadorSugerido.mejor}
          stroke="#95de1d"
          strokeDasharray="2 3"
          label={{ value: 'Mejor', position: 'insideTopLeft', fill: '#95de1d', fontSize: 10 }}
        />
        <ReferenceLine
          x={indicadorSugerido.sugerido}
          stroke="#ffc933"
          strokeWidth={1.5}
          label={{
            value: 'Sugerido',
            position: 'top',
            fill: '#ffc933',
            fontSize: 11,
            fontWeight: 700,
          }}
        />
        <ReferenceLine
          x={indicadorSugerido.peor}
          stroke="#ff5f5f"
          strokeDasharray="2 3"
          label={{ value: 'Peor', position: 'insideTopRight', fill: '#ff5f5f', fontSize: 10 }}
        />
      </AreaChart>
    </ResponsiveContainer>
    <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: 4, lineHeight: 1.45 }}>
      Cada obra similar aporta una campanita centrada en su indicador; esta
      curva es la suma de todas y muestra cómo se distribuyen. Ya se
      excluyeron las obras "Alto" y "Crítico" (naranja y rojo en Hs MO/kWp
      por obra): no entran en esta cuenta.{' '}
      <strong style={{ color: '#e3eaea' }}>"Sugerido"</strong> es el promedio
      ponderado por kWp de las obras similares: cada obra pesa según su
      potencia (equivale a las Hs MO totales divididas por los kWp totales).
      Las barras grises de fondo son las obras históricas usadas como
      referencia: su posición es su indicador y su altura, su peso (kWp).
    </div>
    <details style={{ marginTop: 6 }}>
      <summary
        style={{
          fontSize: 11,
          color: '#8fa6a9',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        Obras de referencia ({indicadorSugerido.referencias.length})
      </summary>
      <div
        style={{
          marginTop: 6,
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px 14px',
          fontSize: 11,
          color: '#8fa6a9',
        }}
      >
        {indicadorSugerido.referencias.map((r, i) => (
          <span key={`refl-${r.nombre}-${i}`}>
            {r.nombre}:{' '}
            <span style={{ color: '#b9c7c9' }}>{r.valor.toFixed(2)}</span> ·{' '}
            {r.kwp.toFixed(0)} kWp
          </span>
        ))}
      </div>
    </details>
  </div>
)}
                  </>
                ) : (
                  <div style={{ color: '#b9c7c9', fontSize: 13 }}>
                    No hay obras similares para los filtros seleccionados.
                  </div>
                )}
              </div>
            </div>
            <div style={S.formGrid}>
              {[
                [
                  'nombre',
                  'A. Nombre de la obra',
                  'Ej: Obra Industrial Norte',
                  'Identificación interna.',
                ],
                [
                  'potencia',
                  'B. Potencia (kWp)',
                  'Ej: 120',
                  'Potencia total del sistema.',
                ],
                ['operarios', 'C. Operarios', 'Ej: 4', 'Personas asignadas.'],
                [
                  'indicador',
                  'D. Indicador (hs MO / kWp)',
                  'Ej: 7.5',
                  'Manual o usar sugerido.',
                ],
                ['lugar', 'E. Lugar', 'Ej: Córdoba', 'Ubicación.'],
                [
                  'trasladoEmpresa',
                  'G. Traslado empresa → obra (hs)',
                  'Ej: 0.5',
                  'Tiempo de ida, dentro del horario de trabajo (se descuenta de las horas efectivas).',
                ],
                [
                  'seguridad',
                  'XS. Coeficiente seguridad (%)',
                  'Ej: 10',
                  'Margen por imprevistos.',
                ],
              ].map(([f, l, ph, h]) => (
                <div key={f}>
                  <label style={S.label}>{l}</label>
                  <input
                    style={S.estimatorInput}
                    value={formEstimacion[f]}
                    onChange={(e) => updateForm(f, e.target.value)}
                    placeholder={ph}
                  />
                  <div style={S.help}>{h}</div>
                </div>
              ))}
              <div>
                <label style={S.label}>F. Modalidad de traslado</label>
                <select
                  style={S.estimatorInput}
                  value={
                    JORNADAS_OBRA[formEstimacion.jornada].seQuedaEnLugar
                      ? '2'
                      : formEstimacion.modalidad
                  }
                  onChange={(e) => updateForm('modalidad', e.target.value)}
                  disabled={JORNADAS_OBRA[formEstimacion.jornada].seQuedaEnLugar}
                >
                  <option value="1">1 diaria</option>
                  <option value="2">2 semanal</option>
                </select>
                {JORNADAS_OBRA[formEstimacion.jornada].seQuedaEnLugar && (
                  <div style={S.help}>
                    Con esta jornada se quedan en el lugar: se usa el traslado
                    con alojamiento.
                  </div>
                )}
              </div>
              <div>
                <label style={S.label}>H. Alojamiento → obra (hs)</label>
                <input
                  style={S.estimatorInput}
                  value={formEstimacion.trasladoAlojamiento}
                  onChange={(e) =>
                    updateForm('trasladoAlojamiento', e.target.value)
                  }
                  disabled={
                    formEstimacion.modalidad === '1' &&
                    !JORNADAS_OBRA[formEstimacion.jornada].seQuedaEnLugar
                  }
                  placeholder="Ej: 0.25"
                />
              </div>
            </div>

            <div
              style={{
                marginTop: 22,
                borderTop: '1px solid #2c5059',
                paddingTop: 16,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: '#b9c7c9',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 12,
                  fontWeight: 700,
                }}
              >
                Jornada de trabajo y costo de mano de obra
              </div>

              <div style={S.formGrid}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={S.label}>J. Jornada de trabajo</label>
                  <select
                    style={S.estimatorInput}
                    value={formEstimacion.jornada}
                    onChange={(e) => updateForm('jornada', e.target.value)}
                  >
                    {Object.entries(JORNADAS_OBRA).map(([clave, j], i) => (
                      <option key={clave} value={clave}>
                        {i + 1}. {j.label}
                      </option>
                    ))}
                  </select>
                  <div style={S.help}>
                    {JORNADAS_OBRA[formEstimacion.jornada].detalle}
                  </div>

                  {(() => {
                    const modalidadEfectiva = JORNADAS_OBRA[formEstimacion.jornada]
                      .seQuedaEnLugar
                      ? '2'
                      : formEstimacion.modalidad;

                    return (
                      <div
                        style={{
                          marginTop: 12,
                          background: '#16323a',
                          border: '1px solid #2c5059',
                          borderRadius: 10,
                          padding: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: '#b9c7c9',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            marginBottom: 8,
                          }}
                        >
                          Cuándo se viaja y cuándo se trabaja
                        </div>

                        <CronogramaSemanas
                          semanas={cronogramaJornada(
                            formEstimacion.jornada,
                            modalidadEfectiva
                          ).map((celdas) => ({ celdas }))}
                        />

                        <div style={{ ...S.help, marginTop: 8 }}>
                          {descripcionViaje(formEstimacion.jornada, modalidadEfectiva)}{' '}
                          Los viajes se hacen dentro del horario de trabajo y se
                          descuentan de las horas efectivas.
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <label style={S.label}>Fecha de inicio (opcional)</label>
                  <input
                    type="date"
                    style={S.estimatorInput}
                    value={formEstimacion.fechaInicio}
                    onChange={(e) => updateForm('fechaInicio', e.target.value)}
                  />
                  <div style={S.help}>
                    Para calcular la fecha estimada de fin.
                  </div>
                </div>

                <div>
                  <label style={S.label}>Supervisor</label>
                  <select
                    style={S.estimatorInput}
                    value={formEstimacion.supervisor}
                    onChange={(e) => updateForm('supervisor', e.target.value)}
                  >
                    <option value="no">Sin supervisor</option>
                    <option value="si">Con 1 supervisor</option>
                  </select>
                  <div style={S.help}>
                    No trabaja en la obra: suma costo pero no horas de trabajo.
                  </div>
                </div>

                <div>
                  <label style={S.label}>MO instalador (USD por día)</label>
                  <input
                    style={S.estimatorInput}
                    value={formEstimacion.tarifaInstalador}
                    onChange={(e) => updateForm('tarifaInstalador', e.target.value)}
                    placeholder="Ej: 80"
                  />
                  <div style={S.help}>
                    {tarifaInstaladorSugerida !== null ? (
                      <>
                        Último valor en la hoja: USD {tarifaInstaladorSugerida}.{' '}
                        <button
                          type="button"
                          onClick={() =>
                            updateForm(
                              'tarifaInstalador',
                              String(tarifaInstaladorSugerida)
                            )
                          }
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffc933',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 11,
                            textDecoration: 'underline',
                          }}
                        >
                          Usar
                        </button>
                      </>
                    ) : (
                      'Costo por persona y por día. Si lo dejás vacío no se calcula el costo.'
                    )}
                  </div>
                </div>

                <div>
                  <label style={S.label}>MO supervisor (USD por día)</label>
                  <input
                    style={{
                      ...S.estimatorInput,
                      opacity: formEstimacion.supervisor === 'si' ? 1 : 0.5,
                    }}
                    value={formEstimacion.tarifaSupervisor}
                    onChange={(e) => updateForm('tarifaSupervisor', e.target.value)}
                    disabled={formEstimacion.supervisor !== 'si'}
                    placeholder="Ej: 120"
                  />
                  <div style={S.help}>
                    Cobra los mismos días que la cuadrilla (domingos al doble).
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              <button style={S.primaryBtn} onClick={calcularEstimacion}>
                Calcular estimación
              </button>
              <button style={S.btn} onClick={resetFormEstimacion}>
                Limpiar
              </button>
            </div>
            {errorEstimacion && (
              <div
                style={{
                  marginTop: 16,
                  background: '#ff5f5f22',
                  border: '1px solid #ff5f5f44',
                  color: '#ff7a7a',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 13,
                }}
              >
                {errorEstimacion}
              </div>
            )}
          </div>
          {resultadoEstimacion && (
            <div style={S.card}>
              <h2 style={{ marginTop: 0 }}>🔆 INFORME DE PLANIFICACIÓN</h2>
              <div style={{ marginBottom: 16 }}>
                <button style={S.secondaryBtn} onClick={exportarInformePDF}>
                  Exportar PDF
                </button>
              </div>
              <h3>📋 Datos</h3>
              <table style={S.table}>
                <tbody>
                  {[
                    ['Nombre', resultadoEstimacion.nombre],
                    ['Lugar', resultadoEstimacion.lugar],
                    [
                      'Potencia',
                      `${resultadoEstimacion.potencia.toFixed(1)} kWp`,
                    ],
                    ['Operarios', resultadoEstimacion.operarios],
                    [
                      'Indicador',
                      `${resultadoEstimacion.indicador.toFixed(1)} hs MO / kWp`,
                    ],
                    [
                      'Jornada',
                      JORNADAS_OBRA[resultadoEstimacion.jornada].label,
                    ],
                    [
                      'Modalidad de traslado',
                      resultadoEstimacion.modalidad === '1'
                        ? '1 diaria'
                        : JORNADAS_OBRA[resultadoEstimacion.jornada].seQuedaEnLugar
                        ? 'Estadía en el lugar (2 semanas)'
                        : '2 semanal',
                    ],
                    [
                      'Cuándo se viaja',
                      descripcionViaje(
                        resultadoEstimacion.jornada,
                        resultadoEstimacion.modalidad
                      ),
                    ],
                    [
                      'Supervisor',
                      resultadoEstimacion.conSupervisor
                        ? 'Con 1 supervisor'
                        : 'Sin supervisor',
                    ],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={S.td}>{k}</td>
                      <td style={S.td}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 style={{ marginTop: 22 }}>⏱️ Duración</h3>
              <table style={S.table}>
                <tbody>
                  {[
                    [
                      'Horas efectivas por día de trabajo (promedio)',
                      `${resultadoEstimacion.horasDiarias.toFixed(1)} hs`,
                    ],
                    [
                      'Horas totales',
                      `${resultadoEstimacion.horasTotales.toFixed(1)} hs`,
                    ],
                    [
                      `Horas efectivas acumuladas en ${resultadoEstimacion.diasNecesarios} días`,
                      `${resultadoEstimacion.horasPlanBase.toFixed(1)} hs (necesarias: ${resultadoEstimacion.horasPorOperario.toFixed(1)} hs por operario)`,
                    ],
                    ...(resultadoEstimacion.diasNecesarios > 1
                      ? [
                          [
                            `Horas efectivas acumuladas en ${resultadoEstimacion.diasNecesarios - 1} días`,
                            `${resultadoEstimacion.horasUnDiaMenos.toFixed(1)} hs (no alcanzan)`,
                          ],
                        ]
                      : []),
                    [
                      'Días necesarios',
                      `${resultadoEstimacion.diasNecesarios} ${
                        JORNADAS_OBRA[resultadoEstimacion.jornada].trabajaSabado
                          ? 'días de trabajo'
                          : 'días hábiles'
                      }`,
                    ],
                    [
                      'Con coef. seguridad',
                      `${resultadoEstimacion.diasConSeguridad} ${
                        JORNADAS_OBRA[resultadoEstimacion.jornada].trabajaSabado
                          ? 'días de trabajo'
                          : 'días hábiles'
                      }`,
                    ],
                    ['Días hombre', resultadoEstimacion.diasHombre],
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={S.td}>{k}</td>
                      <td style={S.td}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3 style={{ marginTop: 22 }}>🗓️ Calendario</h3>
              <table style={S.table}>
                <tbody>
                  {[
                    [
                      'Días de trabajo (con coef. de seguridad)',
                      `${resultadoEstimacion.diasConSeguridad} días`,
                    ],
                    [
                      'Duración en el calendario',
                      `${resultadoEstimacion.calendario.diasCorridos} días corridos (${resultadoEstimacion.calendario.semanas} ${
                        resultadoEstimacion.calendario.semanas === 1
                          ? 'semana'
                          : 'semanas'
                      })`,
                    ],
                    ...(resultadoEstimacion.calendario.fechaInicio
                      ? [
                          [
                            'Fecha de inicio',
                            formatFechaCorta(resultadoEstimacion.calendario.fechaInicio),
                          ],
                          [
                            'Fecha estimada de fin',
                            formatFechaCorta(resultadoEstimacion.calendario.fechaFin),
                          ],
                        ]
                      : []),
                    ...(resultadoEstimacion.vueltaSabadoDisponible !== null &&
                    resultadoEstimacion.vueltaSabadoDisponible !== undefined
                      ? [
                          [
                            'Vuelta el sábado',
                            !resultadoEstimacion.vueltaSabadoDisponible
                              ? 'No disponible con este traslado (vuelta + alojamiento superan las 4 hs del sábado): se vuelve el lunes'
                              : resultadoEstimacion.calendario.terminaEnSabado
                              ? 'Sí: la obra termina un sábado y vuelven ese mismo día'
                              : 'Disponible, pero la obra no termina en sábado',
                          ],
                        ]
                      : []),
                    ...(resultadoEstimacion.calendario.diasSoloViaje > 0
                      ? [
                          [
                            'Días de solo viaje (ida o vuelta sin horas efectivas)',
                            `${resultadoEstimacion.calendario.diasSoloViaje} de ${resultadoEstimacion.diasConSeguridad}`,
                          ],
                        ]
                      : []),
                    [
                      'Días pagados a la cuadrilla',
                      `${resultadoEstimacion.calendario.diasPagados} días${
                        resultadoEstimacion.calendario.diasDescansoEnLugar > 0
                          ? ` (incluye ${resultadoEstimacion.calendario.diasDescansoEnLugar} de descanso en el lugar, ${resultadoEstimacion.calendario.domingosEnLugar} de ellos domingos)`
                          : ''
                      }`,
                    ],
                    ...(resultadoEstimacion.calendario.domingosEnLugar > 0
                      ? [
                          [
                            'Días de pago (domingo en el lugar al doble)',
                            `${resultadoEstimacion.calendario.diasPagoEquivalentes} días`,
                          ],
                        ]
                      : []),
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={S.td}>{k}</td>
                      <td style={S.td}>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ marginTop: 22 }}>📆 Cómo se compone la obra</h3>
              <div style={{ ...S.help, marginTop: 0, marginBottom: 10 }}>
                {resultadoEstimacion.diasConSeguridad}{' '}
                {resultadoEstimacion.diasConSeguridad === 1
                  ? 'día de trabajo'
                  : 'días de trabajo'}{' '}
                en {resultadoEstimacion.calendario.semanas}{' '}
                {resultadoEstimacion.calendario.semanas === 1 ? 'semana' : 'semanas'}:{' '}
                <strong style={{ color: '#e3eaea' }}>
                  {resultadoEstimacion.calendario.composicion}
                </strong>
                . Los viajes se hacen dentro del horario de trabajo.
                {resultadoEstimacion.calendario.diasSoloViaje > 0 &&
                  ` ${resultadoEstimacion.calendario.diasSoloViaje} de esos días son de solo viaje (ida o vuelta sin horas efectivas de trabajo).`}
              </div>
              <div
                style={{
                  background: '#16323a',
                  border: '1px solid #2c5059',
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <CronogramaSemanas semanas={resultadoEstimacion.calendario.cronograma} />
              </div>

              <h3 style={{ marginTop: 22 }}>💰 Costo estimado de mano de obra</h3>
              {resultadoEstimacion.costo ? (
                <>
                  <table style={S.table}>
                    <tbody>
                      <tr>
                        <td style={S.td}>
                          Instaladores: {resultadoEstimacion.operarios} × USD{' '}
                          {resultadoEstimacion.costo.tarifaInstalador} por día ×{' '}
                          {resultadoEstimacion.calendario.diasPagoEquivalentes} días de pago
                        </td>
                        <td style={S.td}>
                          {formatUsdAbs(resultadoEstimacion.costo.instaladores)}
                        </td>
                      </tr>
                      {resultadoEstimacion.conSupervisor && (
                        <tr>
                          <td style={S.td}>
                            Supervisor: 1 × USD{' '}
                            {resultadoEstimacion.costo.tarifaSupervisor} por día ×{' '}
                            {resultadoEstimacion.calendario.diasPagoEquivalentes} días de pago
                          </td>
                          <td style={S.td}>
                            {formatUsdAbs(resultadoEstimacion.costo.supervisor)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ ...S.td, fontWeight: 800 }}>Total de mano de obra</td>
                        <td style={{ ...S.td, fontWeight: 800, color: '#ffc933' }}>
                          {formatUsdAbs(resultadoEstimacion.costo.total)}
                        </td>
                      </tr>
                      <tr>
                        <td style={S.td}>Costo de MO por kWp</td>
                        <td style={S.td}>
                          USD {Math.round(resultadoEstimacion.costo.porKwp).toLocaleString('es-AR')}{' '}
                          por kWp
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={S.help}>
                    Solo mano de obra: se pagan los días trabajados y los días de
                    descanso en el lugar (los domingos, al doble). No incluye
                    materiales, alojamiento ni viáticos.
                  </div>
                </>
              ) : (
                <div style={{ color: '#8fa6a9', fontSize: 13 }}>
                  Ingresá el valor de MO del instalador (USD por día) para calcular
                  el costo.
                </div>
              )}

              <h3 style={{ marginTop: 22 }}>📊 Simulación</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 14,
                }}
              >
                <div>
                  <label style={S.label}>
                    Simular con otra cantidad de operarios
                  </label>
                  <input
                    style={S.estimatorInput}
                    value={simOperarios}
                    onChange={(e) => setSimOperarios(e.target.value)}
                    placeholder="Ej: 6"
                  />
                </div>
                <div
                  style={{
                    background: '#16323a',
                    border: '1px solid #2c5059',
                    borderRadius: 10,
                    padding: 14,
                    fontSize: 14,
                    color: '#e3eaea',
                  }}
                >
                  {simulacion ? (
                    <strong>
                      Con {simulacion.operarios.toFixed(0)} operarios:{' '}
                      {simulacion.dias} días hábiles.
                    </strong>
                  ) : (
                    <span style={{ color: '#8fa6a9' }}>
                      Ingresá operarios para simular.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {/* ── ESTADO PROYECTOS ── */}
      {tabActiva === 'estadoProyectos' && (
        <main style={{ ...S.main, maxWidth: 1900 }}>
          {errorProyectos && (
            <div
              style={{
                background: '#ff5f5f22',
                border: '1px solid #ff5f5f44',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 13,
                color: '#ff7a7a',
              }}
            >
              {errorProyectos}
            </div>
          )}

          <div
            style={{
              ...S.card,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: 20 }}>
                Estado de Proyectos FV
              </h2>
              <p style={{ margin: '8px 0 0', color: '#b9c7c9', fontSize: 13 }}>
                Seguimiento de avance general de los proyectos del año en curso.
              </p>
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: '#8fa6a9' }}>
              {lastUpdateProyectos
                ? `Actualizado: ${lastUpdateProyectos}`
                : 'Sin actualización'}
            </div>
          </div>

          <div style={S.kpis}>
            {[
              {
                label: 'Proyectos',
                value: statsProyectos.total,
                sub: 'con nombre y estado',
                color: '#f4f8f8',
                icon: RiListCheck,
                accent: 'bg-blue-500/10 text-blue-400',
              },
              {
                label: 'En ejecución',
                value: statsProyectos.enEjecucion,
                sub: 'obras activas',
                color: '#4fc3f7',
                icon: RiTimerLine,
                accent: 'bg-sky-500/10 text-sky-400',
              },
              {
                label: 'Finalizados',
                value: statsProyectos.finalizados,
                sub: '100% completados',
                color: '#95de1d',
                icon: RiTrophyLine,
                accent: 'bg-emerald-500/10 text-emerald-400',
              },
              {
                label: 'Avance promedio',
                value: formatPercent(statsProyectos.avancePromedio),
                sub: `${statsProyectos.pendientes} pendientes`,
                color: '#ffc933',
                icon: RiDashboardLine,
                accent: 'bg-amber-500/10 text-amber-400',
              },
            ].map((k) => (
              <div key={k.label} style={S.kpi}>
                <div className="flex items-start justify-between gap-3">
                  <div
                    style={{
                      fontSize: 11,
                      color: '#8fa6a9',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: 6,
                    }}
                  >
                    {k.label}
                  </div>
                  <div
                    className={cx(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      k.accent,
                    )}
                  >
                    <k.icon className="size-[18px]" aria-hidden="true" />
                  </div>
                </div>
                <div style={{ fontSize: 34, fontWeight: 800, color: k.color }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: 2 }}>
                  {k.sub}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              placeholder="Buscar proyecto..."
              value={busquedaProyecto}
              onChange={(e) => setBusquedaProyecto(e.target.value)}
              style={{ ...S.input, width: 220 }}
            />
            <details
  style={{
    position: 'relative',
    zIndex: 40,
  }}
>
  <summary
    style={{
      ...S.input,
      minWidth: 190,
      height: 32,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      cursor: 'pointer',
      userSelect: 'none',
      listStyle: 'none',
    }}
    title="Seleccionar uno o varios estados"
  >
    <span>
      {filtrosEstadoProyecto.length === 0
        ? 'Todos los estados'
        : filtrosEstadoProyecto.length === 1
        ? filtrosEstadoProyecto[0]
        : `${filtrosEstadoProyecto.length} estados seleccionados`}
    </span>

    <span style={{ color: '#b9c7c9' }}>▾</span>
  </summary>

  <div
    style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: 0,
      zIndex: 50,
      minWidth: 220,
      background: '#2c5059',
      border: '1px solid #3b5d65',
      borderRadius: 8,
      padding: 8,
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)',
    }}
  >
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 8px',
        cursor: 'pointer',
        fontSize: 12,
        borderBottom: '1px solid #3b5d65',
        marginBottom: 4,
      }}
    >
      <input
        type="checkbox"
        checked={filtrosEstadoProyecto.length === 0}
        onChange={() => setFiltrosEstadoProyecto([])}
      />

      <span>Todos los estados</span>
    </label>

    {estadosProyecto.map((estado) => (
      <label
        key={estado}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 8px',
          cursor: 'pointer',
          fontSize: 12,
          borderRadius: 5,
        }}
      >
        <input
          type="checkbox"
          checked={filtrosEstadoProyecto.includes(estado)}
          onChange={() => toggleEstadoProyecto(estado)}
        />

        <EstadoProyectoBadge estado={estado} />
      </label>
    ))}
  </div>
</details>
            <button
              style={S.btn}
              onClick={fetchEstadoProyectos}
              disabled={loadingProyectos}
            >
              {loadingProyectos ? 'Cargando...' : 'Actualizar proyectos'}
            </button>
          </div>

          <div style={S.row3}>
            <div style={S.card}>
              <div style={S.cardTitle}>Avance % por proyecto</div>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart
                  data={avanceProyectoData}
                  margin={{ top: 8, right: 12, bottom: 100, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#8fa6a9', fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: '#8fa6a9', fontSize: 10 }}
                  />
                  <Tooltip
  formatter={(value, name, props) => {
    const estado = props?.payload?.estado;

    return [
      `${formatPercent(value)}${estado ? ` · ${estado}` : ''}`,
      'Avance',
    ];
  }}
  contentStyle={{
    background: '#2c5059',
    border: '1px solid #3b5d65',
    borderRadius: 8,
    fontSize: 12,
  }}
  labelStyle={{
    color: '#f4f8f8',
  }}
  itemStyle={{
    color: '#f4f8f8',
  }}
/>
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {avanceProyectoData.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={S.card}>
              <div style={S.cardTitle}>Proyectos por estado</div>
              <DonutInteractivo
                data={estadoProyectoData.map((e) => ({
                  ...e,
                  fill:
                    normalizeKey(e.name) === 'finalizado'
                      ? '#95de1d'
                      : normalizeKey(e.name).includes('ejecucion')
                      ? '#4fc3f7'
                      : normalizeKey(e.name) === 'pendiente'
                      ? '#ffc933'
                      : normalizeKey(e.name) === 'demorado'
                      ? '#ff5f5f'
                      : '#8fa6a9',
                }))}
                height={230}
                innerRadius={64}
                outerRadius={90}
                fmtValor={(v) => `${v} ${v === 1 ? 'proyecto' : 'proyectos'}`}
                centroBig={estadoProyectoData.reduce((t, e) => t + e.value, 0)}
                centroSmall="proyectos"
              />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginTop: 8,
                }}
              >
                {estadoProyectoData.map((d) => (
                  <div
                    key={d.name}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    <EstadoProyectoBadge estado={d.name} />
                    <span style={{ fontWeight: 700 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── TABLA ETAPAS DETALLADA ── */}
          <div
            style={{
              background: '#1d3c44',
              border: '1px solid #2c5059',
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow:
                '0 10px 15px -3px rgba(0,0,0,0.35), 0 4px 6px -4px rgba(0,0,0,0.35)',
            }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #2c5059',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 10,
                flexWrap: 'wrap',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                }}
              >
                Detalle de proyectos{' '}
                <span
                  style={{
                    color: '#8fa6a9',
                    fontWeight: 400,
                    textTransform: 'none',
                  }}
                >
                  ({proyectosEstadoTablaFiltrados.length} de{' '}
{proyectosEstadoFiltrados.length})
                </span>
              </span>

              <details
  style={{
    position: 'relative',
    marginLeft: 'auto',
  }}
>
  <summary
    style={{
      ...S.input,
      minWidth: 190,
      height: 32,
      boxSizing: 'border-box',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      cursor: 'pointer',
      userSelect: 'none',
      listStyle: 'none',
    }}
    title="Elegí los estados que querés ocultar de la tabla"
  >
    <span>
      {filtrosEstadoTablaProyecto.length === 0
        ? 'Mostrando todos'
        : filtrosEstadoTablaProyecto.length === 1
        ? `Ocultando: ${filtrosEstadoTablaProyecto[0]}`
        : `Ocultando ${filtrosEstadoTablaProyecto.length} estados`}
    </span>

    <span style={{ color: '#b9c7c9' }}>▾</span>
  </summary>

  <div
    style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      right: 0,
      zIndex: 30,
      minWidth: 220,
      background: '#2c5059',
      border: '1px solid #3b5d65',
      borderRadius: 8,
      padding: 8,
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.35)',
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: '#8fa6a9',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        padding: '2px 8px 6px',
      }}
    >
      Tildá para ocultar
    </div>
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 8px',
        cursor: 'pointer',
        fontSize: 12,
        borderBottom: '1px solid #3b5d65',
        marginBottom: 4,
      }}
    >
      <input
        type="checkbox"
        checked={filtrosEstadoTablaProyecto.length === 0}
        onChange={() => setFiltrosEstadoTablaProyecto([])}
      />

      <span>Mostrar todos (no ocultar ninguno)</span>
    </label>

    {estadosTablaProyecto.map((estado) => (
      <label
        key={estado}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 8px',
          cursor: 'pointer',
          fontSize: 12,
          borderRadius: 5,
        }}
      >
        <input
          type="checkbox"
          checked={filtrosEstadoTablaProyecto.includes(estado)}
          onChange={() => toggleEstadoTablaProyecto(estado)}
        />

        <EstadoProyectoBadge estado={estado} />
      </label>
    ))}
  </div>
</details>
              {/* Leyenda colores */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                {[
                  ['100%', '#95de1d'],
                  ['60–99%', '#4fc3f7'],
                  ['20–59%', '#ffc933'],
                  ['1–19%', '#ff7a7a'],
                  ['0%', '#ff7a7a'],
                ].map(([l, c]) => (
                  <div
                    key={l}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 10,
                      color: '#8fa6a9',
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: c,
                      }}
                    />
                    {l}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr>
                    <th
                      colSpan={2}
                      style={{
                        position: 'sticky',
                        left: 0,
                        background: '#16323a',
                        zIndex: 2,
                      }}
                    />
                    <th colSpan={4} style={{ background: '#16323a' }} />
                    <th
                      colSpan={ETAPAS_COLS.length}
                      style={{
                        background: '#111c31',
                        color: '#4fc3f7',
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        textAlign: 'center',
                        padding: '6px 8px',
                        borderBottom: '1px solid #2c5059',
                      }}
                    >
                      Etapas de ejecución
                    </th>
                  </tr>
                  <tr style={{ borderBottom: '2px solid #3b5d65' }}>
                    {/* Columnas fijas */}
                    <th
                      style={{
                        ...S.th,
                        position: 'sticky',
                        left: 0,
                        background: '#16323a',
                        zIndex: 2,
                        minWidth: 72,
                        padding: '10px 12px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ID
                    </th>
                    <th
                      style={{
                        ...S.th,
                        position: 'sticky',
                        left: 72,
                        background: '#16323a',
                        zIndex: 2,
                        minWidth: 220,
                        padding: '10px 12px',
                      }}
                    >
                      Proyecto
                    </th>
                    <th
                      style={{
                        ...S.th,
                        minWidth: 82,
                        padding: '10px 6px',
                        textAlign: 'center',
                      }}
                    >
                      Capacidad kWp
                    </th>

                    <th
  style={{
    ...S.th,
    minWidth: 92,
    padding: '10px 6px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
  }}
>
  Fecha de venta
</th>
                    <th
                      style={{
                        ...S.th,
                        minWidth: 88,
                        padding: '10px 8px',
                        textAlign: 'center',
                      }}
                    >
                      Estado
                    </th>
                    <th
                      style={{
                        ...S.th,
                        minWidth: 70,
                        padding: '10px 6px',
                        textAlign: 'center',
                      }}
                    >
                      Avance
                    </th>
                    {/* Columnas de etapas */}
                    {ETAPAS_COLS.map((col) => (
                      <th
                        key={col.key}
                        style={{
                          ...S.th,
                          width: 84,
                          minWidth: 84,
                          maxWidth: 84,
                          padding: '10px 4px',
                          textAlign: 'center',
                          whiteSpace: 'normal',
                          wordBreak: 'normal',
                          overflowWrap: 'break-word',
                          lineHeight: 1.2,
                          color: '#8fa6a9',
                          verticalAlign: 'middle',
                        }}
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                {proyectosEstadoTablaFiltrados.map((p, i) => {
                    const rowBg = i % 2 === 0 ? '#1d3c44' : '#0d1526';
                    return (
                      <tr
                        key={`${p.id_proyecto}-${i}`}
                        style={{
                          borderBottom: '1px solid #2c5059',
                          background: rowBg,
                        }}
                      >
                        {/* ID - sticky */}
                        <td
                          style={{
                            ...S.td,
                            position: 'sticky',
                            left: 0,
                            background: rowBg,
                            zIndex: 1,
                            color: '#8fa6a9',
                            fontSize: 11,
                            padding: '9px 12px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            borderBottom: '1px solid #2c5059',
                          }}
                        >
                          {p.id_proyecto || '—'}
                        </td>
                        {/* Nombre - sticky */}
                        <td
                          style={{
                            ...S.td,
                            position: 'sticky',
                            left: 72,
                            background: rowBg,
                            zIndex: 1,
                            fontWeight: 600,
                            fontSize: 12,
                            padding: '9px 12px',
                            minWidth: 220,
                            maxWidth: 300,
                            whiteSpace: 'normal',
                            lineHeight: 1.25,
                            borderBottom: '1px solid #2c5059',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            <span>{p.nombre_proyecto || '—'}</span>
                            {p.ubicacion && (
                              <a
                                href={p.ubicacion}
                                target="_blank"
                                rel="noreferrer"
                                title="Ver ubicación en el mapa"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 20,
                                  height: 20,
                                  borderRadius: 6,
                                  background: '#1d4ed822',
                                  color: '#4fc3f7',
                                  flexShrink: 0,
                                }}
                              >
                                <RiMapPinLine style={{ width: 12, height: 12 }} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'center',
                            padding: '9px 8px',
                            color: '#ffc933',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {p.capacidad_kwp != null
                            ? formatKwp(p.capacidad_kwp)
                            : '—'}
                        </td>

{/* Fecha de venta */}
<td
  style={{
    ...S.td,
    textAlign: 'center',
    padding: '9px 8px',
    color: '#e3eaea',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }}
>
  {p.fecha_venta || '—'}
</td>

                        {/* Estado */}
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'center',
                            padding: '9px 8px',
                          }}
                        >
                          <EstadoProyectoBadge estado={p.estado} />
                        </td>
                        {/* Avance general */}
                        <td
                          style={{
                            ...S.td,
                            textAlign: 'center',
                            padding: '9px 8px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <div
                              style={{
                                width: 50,
                                height: 5,
                                background: '#2c5059',
                                borderRadius: 999,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  width: `${p.avance}%`,
                                  height: 5,
                                  background:
                                    p.avance >= 100 ? '#95de1d' : '#4fc3f7',
                                  borderRadius: 999,
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: p.avance >= 100 ? '#95de1d' : '#e3eaea',
                              }}
                            >
                              {formatPercent(p.avance)}
                            </span>
                          </div>
                        </td>
                        {/* Celdas por etapa — barra de datos tipo Sheets: el
                        color sólido llena la celda en proporción al avance,
                        así se lee de un vistazo sin tener que leer cada %. */}
                        {ETAPAS_COLS.map((col) => {
                          const val = getEtapaAvance(p.etapas_lista, col.key);
                          const c = etapaCellStyle(val);
                          return (
                            <td
                              key={col.key}
                              style={{
                                width: 84,
                                minWidth: 84,
                                maxWidth: 84,
                                padding: '5px 4px',
                                borderBottom: '1px solid #2c5059',
                              }}
                            >
                              {val !== null ? (
                                <div
                                  style={{
                                    position: 'relative',
                                    height: 26,
                                    borderRadius: 6,
                                    overflow: 'hidden',
                                    background: '#16323a',
                                    border: `1px solid ${c.border}55`,
                                  }}
                                >
                                  <div
                                    style={{
                                      position: 'absolute',
                                      inset: 0,
                                      width: `${val === 0 ? 100 : val}%`,
                                      background: c.fill,
                                      opacity: val === 0 ? 0.55 : 1,
                                    }}
                                  />
                                  <div
                                    style={{
                                      position: 'relative',
                                      height: '100%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: '#ffffff',
                                      textShadow: '0 1px 3px rgba(0,0,0,0.85)',
                                    }}
                                  >
                                    {val}%
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{
                                    height: 26,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#3b5d65',
                                    fontSize: 11,
                                  }}
                                >
                                  —
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {!loadingProyectos &&
                    proyectosEstadoFiltrados.length === 0 && (
                      <tr>
                        <td
                          colSpan={6 + ETAPAS_COLS.length}
                          style={{
                            textAlign: 'center',
                            padding: 40,
                            color: '#55787f',
                          }}
                        >
                          Sin proyectos para mostrar
                        </td>
                      </tr>
                    )}
                  {loadingProyectos && (
                    <tr>
                      <td
                        colSpan={6 + ETAPAS_COLS.length}
                        style={{
                          textAlign: 'center',
                          padding: 40,
                          color: '#8fa6a9',
                        }}
                      >
                        Cargando proyectos...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}
{/* ── POTENCIA INSTALADA POR AÑO ── */}
{tabActiva === 'potenciaInstalada' && (
  <main style={S.main}>
    {errorPotencia && (
      <div
        style={{
          background: '#ff5f5f22',
          border: '1px solid #ff5f5f44',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          color: '#ff7a7a',
        }}
      >
        {errorPotencia}
      </div>
    )}

    {advertenciasPotencia.length > 0 && (
      <div
        style={{
          background: '#ffc9331a',
          border: '1px solid #ffc93355',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          color: '#ffc933',
          lineHeight: 1.5,
        }}
      >
        <strong>Dato a verificar en la hoja de origen.</strong> Estas obras
        figuran más de una vez en el mismo mes y pueden estar sumando de más:
        <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
          {advertenciasPotencia.map((a) => (
            <li key={a.id}>
              <strong>{a.obra}</strong> — {a.mes} (hoja «{a.hoja}»): aparece{' '}
              {a.veces} veces ({a.detalle}). Si es una carga duplicada, el total
              del mes está inflado en {formatKwp(a.total - a.total / a.veces)}.
            </li>
          ))}
        </ul>
      </div>
    )}

    <div
      style={{
        ...S.card,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          Potencia Instalada por año
        </h2>
        <p style={{ margin: '8px 0 0', color: '#b9c7c9', fontSize: 13 }}>
          Seguimiento mensual de potencia solar instalada, separado por obra y
          filtrado por año.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <select
  value={anioPotenciaSeleccionado}
  onChange={(e) => setAnioPotenciaSeleccionado(e.target.value)}
  style={S.input}
>
  <option value={POTENCIA_TODOS_LOS_MESES}>
    Todos los meses registrados
  </option>

  {aniosPotencia.map((anio) => (
    <option key={anio} value={anio}>
      {anio}
    </option>
  ))}
</select>

        <button
          style={S.btn}
          onClick={fetchPotenciaInstalada}
          disabled={loadingPotencia}
        >
          {loadingPotencia ? 'Cargando...' : 'Actualizar potencia'}
        </button>
      </div>
    </div>

    <div
  style={{
    ...S.kpis,
    gridTemplateColumns: mostrarProyeccionAnual
  ? 'repeat(6, 1fr)'
  : 'repeat(5, 1fr)',
  }}
>
{[
  {
    label:
      anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
        ? 'Vista seleccionada'
        : 'Año seleccionado',
    value:
      anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
        ? 'Todos'
        : potenciaAnioActual.anio || '—',
    sub:
      anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
        ? 'meses con datos registrados'
        : 'período de análisis',
    color: '#f4f8f8',
  },
  {
    label: 'Potencia total',
  
    value:
      Number(potenciaAnioActual.total_anual_kwp || 0) >= 1000
        ? `${(
            Number(potenciaAnioActual.total_anual_kwp || 0) / 1000
          ).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} MWp`
        : `${Number(
            potenciaAnioActual.total_anual_kwp || 0
          ).toLocaleString('es-AR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} kWp`,
  
    sub: 'suma instalada',
    color: '#ffc933',
  },
  {
    label: 'Promedio mensual',
    value: potenciaAnioActual.promedio_mensual_label || '0 kWp',
    sub: `${potenciaAnioActual.cantidad_meses_con_potencia || 0} meses con potencia`,
    color: '#4fc3f7',
  },
  ...(mostrarProyeccionAnual
    ? [
      {
        label: 'Proyección anual',
        value: potenciaAnioActual.proyeccion_anual_label || '0 kWp',
        sub: `${potenciaAnioActual.total_anual_label || '0 kWp'} + ${
          potenciaAnioActual.promedio_mensual_label || '0 kWp'
        } × ${potenciaAnioActual.meses_restantes_proyeccion || 0} meses`,
        color: '#9b7bff',
      },
      ]
    : []),
    {
      label: 'Variación interanual',
    
      value: variacionInteranualPotencia.disponible
        ? formatSignedPercent(
            variacionInteranualPotencia.variacionPct
          )
        : '—',
    
      sub: variacionInteranualPotencia.disponible
        ? `${variacionInteranualPotencia.periodoLabel} vs ${
            variacionInteranualPotencia.anioAnterior
          } · ${
            variacionInteranualPotencia.diferenciaKwp > 0
              ? '+'
              : variacionInteranualPotencia.diferenciaKwp < 0
              ? '-'
              : ''
          }${formatKwp(
            Math.abs(
              variacionInteranualPotencia.diferenciaKwp
            )
          )}`
        : variacionInteranualPotencia.anioAnterior
        ? `sin datos comparables de ${variacionInteranualPotencia.anioAnterior}`
        : 'seleccioná un año',
    
      color: !variacionInteranualPotencia.disponible
        ? '#b9c7c9'
        : variacionInteranualPotencia.variacionPct > 0
        ? '#95de1d'
        : variacionInteranualPotencia.variacionPct < 0
        ? '#ff5f5f'
        : '#b9c7c9',
    },
  {
    label: 'Obras registradas',
    value: obrasTotalesPotencia.length,
    sub: 'con potencia cargada',
    color: '#95de1d',
  },
].map((k) => (
        <div key={k.label} style={S.kpi}>
          <div
            style={{
              fontSize: 11,
              color: '#8fa6a9',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              marginBottom: 6,
            }}
          >
            {k.label}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, color: k.color }}>
            {k.value}
          </div>
          <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: 2 }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>

    <div style={S.card}>
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 14,
    }}
  >
    <div>
      <div style={{ ...S.cardTitle, marginBottom: 4 }}>
        {vistaPotencia === VISTA_POTENCIA_POR_OBRA
          ? 'Potencia instalada mensual por obra'
          : 'Relación potencia instalada / dotación operaciones'}
      </div>
      <div style={{ color: '#8fa6a9', fontSize: 12 }}>
        {vistaPotencia === VISTA_POTENCIA_POR_OBRA
          ? 'Barras apiladas por mes. Cada color representa una obra.'
          : 'Arriba: potencia instalada y dotación promedio. Abajo: kWp instalados por persona. La correlación es descriptiva, no implica causalidad.'}
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <select
        value={vistaPotencia}
        onChange={(e) => setVistaPotencia(e.target.value)}
        style={S.input}
      >
        <option value={VISTA_POTENCIA_POR_OBRA}>
          Vista por obra
        </option>
        <option value={VISTA_POTENCIA_RELACION_PERSONAL}>
          Relación con personal
        </option>
      </select>

      {lastUpdatePotencia && (
        <div style={{ color: '#8fa6a9', fontSize: 11 }}>
          Actualizado: {lastUpdatePotencia}
        </div>
      )}
    </div>
  </div>

  {vistaPotencia === VISTA_POTENCIA_RELACION_PERSONAL && (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 12,
      marginBottom: 14,
    }}
  >
    {[
      [
        'Correlación',
        correlacionPotenciaDotacion !== null
          ? correlacionPotenciaDotacion.toFixed(2)
          : '—',
        correlacionPotenciaDotacion === null
          ? 'faltan meses con potencia y dotación'
          : `${
              Math.abs(correlacionPotenciaDotacion) < 0.3
                ? 'relación débil'
                : Math.abs(correlacionPotenciaDotacion) < 0.6
                ? 'relación moderada'
                : 'relación fuerte'
            } ${
              correlacionPotenciaDotacion >= 0 ? 'positiva' : 'negativa'
            } (escala −1 a 1)`,
        '#ffc933',
      ],
      [
        'Prom. kWp/persona',
        promedioKwpPorPersona !== null
          ? formatKwp(promedioKwpPorPersona)
          : '—',
        'productividad mensual promedio',
        '#95de1d',
      ],
      [
        'Meses comparados',
        mesesComparadosRelacion.length,
        'con potencia y dotación',
        '#4fc3f7',
      ],
    ].map(([label, value, sub, color]) => (
      <div
        key={label}
        style={{
          background: '#16323a',
          border: '1px solid #2c5059',
          borderRadius: 10,
          padding: 12,
        }}
      >
        <div
          style={{
            color: '#8fa6a9',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: 2 }}>
          {sub}
        </div>
      </div>
    ))}
  </div>
)}

{vistaPotencia === VISTA_POTENCIA_POR_OBRA ? (
  <ResponsiveContainer width="100%" height={400}>
    <BarChart
      data={potenciaMensualChartData}
      margin={{
        top: 30,
        right: 24,
        bottom:
          anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES ? 70 : 20,
        left: 10,
      }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />

      <XAxis
        dataKey="mes"
        tick={{ fill: '#b9c7c9', fontSize: 11 }}
        angle={anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES ? -35 : 0}
        textAnchor={
          anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
            ? 'end'
            : 'middle'
        }
        interval={0}
      />

      <YAxis
        tick={{ fill: '#b9c7c9', fontSize: 11 }}
        tickFormatter={(v) => formatKwp(v)}
      />

      <Tooltip content={<PotenciaInstaladaTooltip />} />

      <ReferenceLine
        y={potenciaAnioActual.promedio_mensual_kwp}
        stroke="#ffc933"
        strokeDasharray="6 3"
        strokeWidth={1.5}
        label={{
          value: `Promedio: ${potenciaAnioActual.promedio_mensual_label}`,
          position: 'insideTopRight',
          fill: '#ffc933',
          fontSize: 11,
        }}
      />

      {obrasPotenciaKeys.map((obra, index) => (
        <Bar
          key={obra}
          dataKey={obraDataKeys[obra]}
          name={obra}
          stackId="potencia"
          fill={getObraColor(obra, index)}
          radius={
            index === obrasPotenciaKeys.length - 1
              ? [4, 4, 0, 0]
              : [0, 0, 0, 0]
          }
        >
          {index === obrasPotenciaKeys.length - 1 && (
            <LabelList
              dataKey="total_kwp"
              position="top"
              formatter={(v) => formatKwp(v)}
              style={{ fill: '#b9c7c9', fontSize: 10, fontWeight: 600 }}
            />
          )}
        </Bar>
      ))}
    </BarChart>
    </ResponsiveContainer>
  ) : (
    <>
      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 12,
          color: '#b9c7c9',
          margin: '0 0 8px 4px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#4fc3f7' }} />
          Potencia instalada por Ecovatio (kWp, eje izquierdo)
        </span>
        {potenciaPersonalChartData.some((m) => m.kwp_tercerizado > 0) && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 12, height: 12, borderRadius: 2, background: '#9b7bff' }} />
            Obra tercerizada ({OBRAS_TERCERIZADAS_LABEL}): no entra en kWp/persona
          </span>
        )}
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 3, borderRadius: 2, background: '#ffc933' }} />
          Dotación promedio (personas, eje derecho)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#95de1d' }} />
          kWp instalados por persona (gráfico inferior)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart
          data={potenciaPersonalChartData}
          margin={{ top: 24, right: 34, bottom: 8, left: 10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />

          <XAxis
            dataKey="mes"
            tick={{ fill: '#b9c7c9', fontSize: 11 }}
            angle={anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES ? -35 : 0}
            textAnchor={
              anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
                ? 'end'
                : 'middle'
            }
            height={anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES ? 60 : 30}
            interval={0}
          />

          <YAxis
            yAxisId="kwp"
            width={64}
            tick={{ fill: '#4fc3f7', fontSize: 11 }}
            tickFormatter={(v) => formatKwp(v)}
          />

          <YAxis
            yAxisId="personas"
            orientation="right"
            width={44}
            domain={[0, (max) => Math.max(4, Math.ceil(max * 1.25))]}
            tick={{ fill: '#ffc933', fontSize: 11 }}
            allowDecimals={false}
          />

          <Tooltip content={<PotenciaPersonalTooltip />} />

          <Bar
            yAxisId="kwp"
            stackId="potencia"
            dataKey="kwp_propio"
            name="Ecovatio"
            fill="#4fc3f7"
          />

          <Bar
            yAxisId="kwp"
            stackId="potencia"
            dataKey="kwp_tercerizado"
            name="Tercerizado"
            fill="#9b7bff"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="total_kwp"
              position="top"
              formatter={(v) => (Number(v) > 0 ? formatKwp(v) : '')}
              style={{ fill: '#b9c7c9', fontSize: 10, fontWeight: 600 }}
            />
          </Bar>

          <Line
            yAxisId="personas"
            type="monotone"
            dataKey="dotacion_promedio"
            stroke="#ffc933"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#ffc933', stroke: '#1d3c44', strokeWidth: 1 }}
            activeDot={{ r: 6 }}
            connectNulls
          >
            <LabelList
              dataKey="dotacion_promedio"
              position="top"
              offset={10}
              formatter={(v) =>
                v === null || v === undefined
                  ? ''
                  : Number(v).toFixed(1).replace('.0', '')
              }
              style={{
                fill: '#ffc933',
                fontSize: 11,
                fontWeight: 700,
                stroke: '#1d3c44',
                strokeWidth: 3,
                paintOrder: 'stroke',
              }}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>

      <div
        style={{
          ...S.cardTitle,
          color: '#95de1d',
          margin: '10px 0 2px 4px',
        }}
      >
        kWp instalados por persona
      </div>
      <div style={{ color: '#8fa6a9', fontSize: 12, margin: '0 0 6px 4px' }}>
        Potencia instalada por personal propio ÷ dotación promedio del mes
        (excluye obras tercerizadas: {OBRAS_TERCERIZADAS_LABEL}). Más alto =
        más potencia instalada por cada persona del equipo.
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={potenciaPersonalChartData}
          margin={{
            top: 24,
            right: 34 + 44,
            bottom: anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES ? 60 : 20,
            left: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />

          <XAxis
            dataKey="mes"
            tick={{ fill: '#b9c7c9', fontSize: 11 }}
            angle={anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES ? -35 : 0}
            textAnchor={
              anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
                ? 'end'
                : 'middle'
            }
            interval={0}
          />

          <YAxis
            width={64}
            tick={{ fill: '#95de1d', fontSize: 11 }}
            tickFormatter={(v) => formatKwp(v)}
          />

          <Tooltip
            content={<PotenciaPersonalTooltip />}
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          />

          {promedioKwpPorPersona !== null && (
            <ReferenceLine
              y={promedioKwpPorPersona}
              stroke="#95de1d"
              strokeDasharray="6 3"
              strokeWidth={1.2}
              label={{
                value: `Promedio: ${formatKwp(promedioKwpPorPersona)}`,
                position: 'insideTopRight',
                fill: '#95de1d',
                fontSize: 11,
              }}
            />
          )}

          <Bar dataKey="kwp_por_persona" fill="#95de1d" radius={[4, 4, 0, 0]}>
            <LabelList
              dataKey="kwp_por_persona"
              position="top"
              formatter={(v) =>
                v === null || v === undefined ? '' : formatKwp(v)
              }
              style={{ fill: '#b9c7c9', fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  )}

{vistaPotencia === VISTA_POTENCIA_POR_OBRA &&
  potenciaMensualChartData.length === 0 &&
  !loadingPotencia && (
    <div style={{ textAlign: 'center', color: '#55787f', padding: 30 }}>
      Sin datos para mostrar.
    </div>
  )}

{vistaPotencia === VISTA_POTENCIA_RELACION_PERSONAL &&
  potenciaPersonalChartData.length === 0 &&
  !loadingPotencia && (
    <div style={{ textAlign: 'center', color: '#55787f', padding: 30 }}>
      Sin datos de potencia y dotación para comparar.
    </div>
  )}
    </div>

    <div style={S.row2}>
      <div style={S.card}>
        <div style={{ ...S.cardTitle, color: '#ffc933' }}>
  {anioPotenciaSeleccionado === POTENCIA_TODOS_LOS_MESES
    ? 'Mejores meses registrados'
    : 'Mejores meses del año'}
</div>

        {mejoresMesesPotencia.map((mes, i) => (
          <div
            key={mes.mes_label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}
          >
            <span style={{ color: '#55787f', fontSize: 11, width: 16 }}>
              {i + 1}
            </span>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>
              {mes.mes_label}
            </span>
            <span style={{ color: '#ffc933', fontWeight: 700 }}>
              {formatKwp(mes.total_kwp)}
            </span>
          </div>
        ))}

        {mejoresMesesPotencia.length === 0 && (
          <div style={{ color: '#8fa6a9', fontSize: 13 }}>
            Todavía no hay meses con potencia registrada.
          </div>
        )}
      </div>

      <div style={S.card}>
        <div style={{ ...S.cardTitle, color: '#95de1d' }}>
          Obras con mayor potencia instalada
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {obrasTotalesPotencia.slice(0, 8).map((obra, i) => (
            <div
              key={obra.obra}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
              }}
            >
              <span style={{ color: '#55787f', width: 16 }}>{i + 1}</span>

              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: getObraColor(obra.obra, i),
                }}
              />

              <span
                style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {obra.obra}
              </span>

              <strong style={{ color: '#95de1d' }}>
                {formatKwp(obra.kwp)}
              </strong>
            </div>
          ))}

          {obrasTotalesPotencia.length === 0 && (
            <div style={{ color: '#8fa6a9', fontSize: 13 }}>
              Sin obras para mostrar.
            </div>
          )}
        </div>
      </div>
    </div>

  
  </main>
)}

{/* ── PERSONAL OPERACIONES ── */}
{tabActiva === 'personalOperaciones' && (
  <main style={S.main}>
    {errorPersonal && (
      <div
        style={{
          background: '#ff5f5f22',
          border: '1px solid #ff5f5f44',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          color: '#ff7a7a',
        }}
      >
        {errorPersonal}
      </div>
    )}

    <div
      style={{
        ...S.card,
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 20 }}>
          Personal de Operaciones
        </h2>

        <p style={{ margin: '8px 0 0', color: '#b9c7c9', fontSize: 13 }}>
          Dotación actual, bajas de los últimos 12 meses y rotación del
          personal operativo.
        </p>

        {personalOperaciones.resumen?.periodo_inicio &&
          personalOperaciones.resumen?.periodo_fin && (
            <p style={{ margin: '8px 0 0', color: '#8fa6a9', fontSize: 12 }}>
              Período analizado:{' '}
              <strong style={{ color: '#e3eaea' }}>
                {personalOperaciones.resumen.periodo_inicio} al{' '}
                {personalOperaciones.resumen.periodo_fin}
              </strong>
            </p>
          )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {lastUpdatePersonal && (
          <div style={{ color: '#8fa6a9', fontSize: 11 }}>
            Actualizado: {lastUpdatePersonal}
          </div>
        )}

        <button
          style={S.btn}
          onClick={fetchPersonalOperaciones}
          disabled={loadingPersonal}
        >
          {loadingPersonal ? 'Cargando...' : 'Actualizar personal'}
        </button>
      </div>
    </div>

    <div style={S.kpis}>
      {[
        {
          label: 'Personal actual',
          value:
            personalOperaciones.resumen?.cantidad_actual_operaciones ?? 0,
          sub: 'operaciones empresa',
          color: '#95de1d',
          icon: RiTeamLine,
          accent: 'bg-emerald-500/10 text-emerald-400',
        },
        {
          label: 'Bajas últimos 12 meses',
          value:
            personalOperaciones.resumen?.cantidad_bajas_operaciones ?? 0,
          sub: 'bajas del período',
          color: '#ff5f5f',
          icon: RiAlarmWarningLine,
          accent: 'bg-red-500/10 text-red-400',
        },
        {
          label: 'Rotación por bajas (12 meses)',
          value: formatRotacion(rotacionCalculada.rotacionPct),
          sub:
            rotacionCalculada.rotacionPct === null
              ? 'sin datos suficientes'
              : `${rotacionCalculada.bajas} bajas ÷ ${rotacionCalculada.dotacionPromedio
                  .toFixed(1)
                  .replace('.0', '')} personas de dotación promedio`,
          color: '#ffc933',
          icon: RiTimerFlashLine,
          accent: 'bg-amber-500/10 text-amber-400',
        },
        {
          label: 'Recambio completo cada',
          value: formatMeses(rotacionCalculada.recambioEnMeses),
          sub: 'a este ritmo, se renueva un equipo del tamaño actual',
          color: '#4fc3f7',
          icon: RiCalendarLine,
          accent: 'bg-sky-500/10 text-sky-400',
        },
      ].map((k) => (
        <div key={k.label} style={S.kpi}>
          <div className="flex items-start justify-between gap-3">
            <div
              style={{
                fontSize: 11,
                color: '#8fa6a9',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 6,
              }}
            >
              {k.label}
            </div>
            <div
              className={cx(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                k.accent,
              )}
            >
              <k.icon className="size-[18px]" aria-hidden="true" />
            </div>
          </div>

          <div style={{ fontSize: 34, fontWeight: 800, color: k.color }}>
            {k.value}
          </div>

          <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: 2 }}>
            {k.sub}
          </div>
        </div>
      ))}
    </div>
    <div style={S.card}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <div style={{ ...S.cardTitle, marginBottom: 4 }}>
            Dotación promedio mensual — Operaciones
          </div>
          <div style={{ color: '#8fa6a9', fontSize: 12 }}>
            Cantidad promedio de personal del área Operaciones mes a mes.
          </div>
        </div>

        <select
          value={anioPersonalSeleccionado}
          onChange={(e) => setAnioPersonalSeleccionado(e.target.value)}
          style={S.input}
        >
          <option value={PERSONAL_TODOS_LOS_MESES}>
            Todos los meses registrados
          </option>

          {aniosPersonal.map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={dotacionMensualPersonal}
          margin={{
            top: 30,
            right: 24,
            bottom:
              anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES ? 70 : 20,
            left: 10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />

          <XAxis
            dataKey="mes_label"
            tick={{ fill: '#b9c7c9', fontSize: 11 }}
            angle={
              anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES ? -35 : 0
            }
            textAnchor={
              anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES
                ? 'end'
                : 'middle'
            }
            interval={0}
          />

          <YAxis
            tick={{ fill: '#b9c7c9', fontSize: 11 }}
            allowDecimals={false}
          />

          <Tooltip
            formatter={(value, name) => {
              const labels = {
                dotacion_promedio: 'Dotación promedio',
                dotacion_inicio: 'Dotación inicio de mes',
                dotacion_final: 'Dotación fin de mes',
                altas_mes: 'Altas del mes',
                bajas_mes: 'Bajas del mes',
              };

              const formatted =
                name === 'dotacion_promedio'
                  ? Number(value).toFixed(1).replace('.0', '')
                  : value;

              return [formatted, labels[name] || name];
            }}
            labelFormatter={(label) => `Mes: ${label}`}
            contentStyle={{
              background: '#2c5059',
              border: '1px solid #3b5d65',
              borderRadius: 8,
              fontSize: 12,
              color: '#e3eaea',
            }}
          />

          {promedioDotacionPersonal !== null && (
            <ReferenceLine
              y={promedioDotacionPersonal}
              stroke="#ffc933"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `Promedio: ${promedioDotacionPersonal
                  .toFixed(1)
                  .replace('.0', '')}`,
                position: 'insideTopRight',
                fill: '#ffc933',
                fontSize: 11,
              }}
            />
          )}

          <Bar
            dataKey="dotacion_promedio"
            fill="#4fc3f7"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="dotacion_promedio"
              position="top"
              formatter={(v) => Number(v).toFixed(1).replace('.0', '')}
              style={{ fill: '#b9c7c9', fontSize: 10, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {dotacionMensualPersonal.length === 0 && !loadingPersonal && (
        <div style={{ textAlign: 'center', color: '#55787f', padding: 30 }}>
          Sin datos de dotación mensual de operaciones para mostrar.
        </div>
      )}
    </div>

    <div style={S.card}>
      <div style={{ ...S.cardTitle, marginBottom: 4 }}>
        Altas y bajas por mes
      </div>
      <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 10 }}>
        Ingresos y egresos de cada mes junto con la dotación a fin de mes. Sirve
        para ver en qué meses se concentran las bajas.
      </div>

      <div
        style={{
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          fontSize: 12,
          color: '#b9c7c9',
          margin: '0 0 8px 4px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#95de1d' }} />
          Altas del mes
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, borderRadius: 2, background: '#ff5f5f' }} />
          Bajas del mes
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 16, height: 3, borderRadius: 2, background: '#ffc933' }} />
          Dotación a fin de mes (personas)
        </span>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={dotacionMensualPersonal}
          margin={{
            top: 24,
            right: 24,
            bottom:
              anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES ? 60 : 10,
            left: 0,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />

          <XAxis
            dataKey="mes_label"
            tick={{ fill: '#b9c7c9', fontSize: 11 }}
            angle={
              anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES ? -35 : 0
            }
            textAnchor={
              anioPersonalSeleccionado === PERSONAL_TODOS_LOS_MESES
                ? 'end'
                : 'middle'
            }
            interval={0}
          />

          <YAxis
            yAxisId="movimientos"
            allowDecimals={false}
            tick={{ fill: '#b9c7c9', fontSize: 11 }}
          />

          <YAxis
            yAxisId="dotacion"
            orientation="right"
            allowDecimals={false}
            domain={[0, (max) => Math.max(4, Math.ceil(max * 1.25))]}
            tick={{ fill: '#ffc933', fontSize: 11 }}
          />

          <Tooltip
            formatter={(value, name) => [value, name]}
            labelFormatter={(label) => `Mes: ${label}`}
            contentStyle={{
              background: '#2c5059',
              border: '1px solid #3b5d65',
              borderRadius: 8,
              fontSize: 12,
              color: '#e3eaea',
            }}
          />

          <Bar
            yAxisId="movimientos"
            dataKey="altas_mes"
            name="Altas"
            fill="#95de1d"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="altas_mes"
              position="top"
              formatter={(v) => (Number(v) > 0 ? v : '')}
              style={{ fill: '#95de1d', fontSize: 11, fontWeight: 700 }}
            />
          </Bar>

          <Bar
            yAxisId="movimientos"
            dataKey="bajas_mes"
            name="Bajas"
            fill="#ff5f5f"
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="bajas_mes"
              position="top"
              formatter={(v) => (Number(v) > 0 ? v : '')}
              style={{ fill: '#ff5f5f', fontSize: 11, fontWeight: 700 }}
            />
          </Bar>

          <Line
            yAxisId="dotacion"
            type="monotone"
            dataKey="dotacion_final"
            name="Dotación a fin de mes"
            stroke="#ffc933"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#ffc933', stroke: '#1d3c44', strokeWidth: 1 }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>

    <div style={S.card}>
      <div style={{ ...S.cardTitle, marginBottom: 4 }}>
        Evolución de la rotación (12 meses móviles)
      </div>
      <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 10 }}>
        Cada punto es la rotación de los 12 meses que terminan en ese mes:
        bajas ÷ dotación promedio de esos 12 meses. Muestra si la rotación está
        mejorando o empeorando. Solo aparece cuando hay 12 meses de datos.
      </div>

      {rotacionMovilData.length > 0 ? (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart
            data={rotacionMovilData}
            margin={{ top: 24, right: 24, bottom: 10, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />

            <XAxis
              dataKey="mes"
              tick={{ fill: '#b9c7c9', fontSize: 11 }}
              interval={0}
            />

            <YAxis
              tick={{ fill: '#b9c7c9', fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, (max) => Math.max(20, Math.ceil(max * 1.15))]}
            />

            <Tooltip
              formatter={(value, name, props) => [
                `${formatRotacion(value)} (${props?.payload?.bajas} bajas ÷ ${props?.payload?.dotacion_promedio} personas)`,
                'Rotación 12 meses',
              ]}
              labelFormatter={(label) => `Hasta ${label}`}
              contentStyle={{
                background: '#2c5059',
                border: '1px solid #3b5d65',
                borderRadius: 8,
                fontSize: 12,
                color: '#e3eaea',
              }}
            />

            <Line
              type="monotone"
              dataKey="rotacion_pct"
              stroke="#ffc933"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#ffc933', stroke: '#1d3c44', strokeWidth: 1 }}
              activeDot={{ r: 6 }}
            >
              <LabelList
                dataKey="rotacion_pct"
                position="top"
                formatter={(v) => formatRotacion(v)}
                style={{ fill: '#ffc933', fontSize: 11, fontWeight: 700 }}
              />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ textAlign: 'center', color: '#55787f', padding: 30 }}>
          Todavía no hay 12 meses de dotación para calcular la evolución.
        </div>
      )}
    </div>

    <div style={S.card}>
      <div style={{ ...S.cardTitle, marginBottom: 4 }}>
        Permanencia de las personas dadas de baja
      </div>
      <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 12 }}>
        Cuánto tiempo trabajaron antes de irse (bajas de los últimos 12 meses).
        Muchas bajas tempranas apuntan a la incorporación; las tardías, a la
        retención.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: 12,
        }}
      >
        {[
          [
            'Permanencia promedio de quienes se fueron',
            formatMeses(
              personalOperaciones.resumen?.permanencia_promedio_bajas_meses
            ),
            '#ff5f5f',
          ],
          [
            'Permanencia promedio de quienes siguen',
            formatMeses(
              personalOperaciones.resumen?.permanencia_promedio_actual_meses
            ),
            '#95de1d',
          ],
          [
            'Bajas con menos de 6 meses',
            permanenciaBajas.total
              ? `${permanenciaBajas.menosDe6} de ${permanenciaBajas.total}`
              : '—',
            '#ff9f4a',
          ],
          [
            'Bajas entre 6 y 12 meses',
            permanenciaBajas.total
              ? `${permanenciaBajas.entre6y12} de ${permanenciaBajas.total}`
              : '—',
            '#ffc933',
          ],
          [
            'Bajas con 12 meses o más',
            permanenciaBajas.total
              ? `${permanenciaBajas.masDe12} de ${permanenciaBajas.total}`
              : '—',
            '#4fc3f7',
          ],
        ].map(([label, value, color]) => (
          <div
            key={label}
            style={{
              background: '#16323a',
              border: '1px solid #2c5059',
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div
              style={{
                color: '#8fa6a9',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 6,
              }}
            >
              {label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
    <div
  style={{
    ...S.card,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  }}
>
  <div>
    <div style={{ ...S.cardTitle, marginBottom: 4 }}>
      Filtro de tablas de personal
    </div>
    <div style={{ color: '#8fa6a9', fontSize: 12 }}>
  Filtra personal activo durante el año seleccionado y bajas por año de baja.
</div>
  </div>

  <select
    value={anioTablaPersonalSeleccionado}
    onChange={(e) => setAnioTablaPersonalSeleccionado(e.target.value)}
    style={S.input}
  >
    <option value={PERSONAL_TODOS_LOS_ANIOS}>
      Todos los años
    </option>

    {aniosTablaPersonal.map((anio) => (
      <option key={anio} value={anio}>
        {anio}
      </option>
    ))}
  </select>
</div>
    <div style={S.row2}>
      <div style={S.card}>
        <div style={{ ...S.cardTitle, color: '#95de1d' }}>
        {anioTablaPersonalSeleccionado === PERSONAL_TODOS_LOS_ANIOS
  ? 'Personal actual de operaciones'
  : `Personal activo en operaciones ${anioTablaPersonalSeleccionado}`}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>Profesión</th>
                <th style={S.th}>Fecha alta</th>
                <th style={S.th}>Meses</th>
              </tr>
            </thead>

            <tbody>
            {personalActualFiltrado.map((p, i) => (
                <tr key={`${p.nombre}-${i}`}>
                  <td style={S.td}>{p.nombre}</td>
                  <td style={S.td}>{p.profesion || '—'}</td>
                  <td style={S.td}>{p.fecha_alta || '—'}</td>
                  <td style={S.td}>
                    <strong style={{ color: '#95de1d' }}>
                      {formatMeses(p.meses_trabajados)}
                    </strong>
                  </td>
                </tr>
              ))}

              {!loadingPersonal &&
                personalActualFiltrado.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        ...S.td,
                        textAlign: 'center',
                        color: '#8fa6a9',
                        padding: 28,
                      }}
                    >
                      No hay personal actual de operaciones para mostrar.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={S.card}>
        <div style={{ ...S.cardTitle, color: '#ff5f5f' }}>
        {anioTablaPersonalSeleccionado === PERSONAL_TODOS_LOS_ANIOS
  ? 'Bajas de operaciones últimos 12 meses'
  : `Bajas de operaciones ${anioTablaPersonalSeleccionado}`}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Nombre</th>
                <th style={S.th}>Profesión</th>
                <th style={S.th}>Alta</th>
                <th style={S.th}>Baja</th>
                <th style={S.th}>Meses</th>
              </tr>
            </thead>

            <tbody>
            {bajasPersonalFiltradas.map((p, i) => (
                <tr key={`${p.nombre}-${i}`}>
                  <td style={S.td}>{p.nombre}</td>
                  <td style={S.td}>{p.profesion || '—'}</td>
                  <td style={S.td}>{p.fecha_alta || '—'}</td>
                  <td style={S.td}>{p.fecha_baja || '—'}</td>
                  <td style={S.td}>
                    <strong style={{ color: '#ff5f5f' }}>
                      {formatMeses(p.meses_trabajados)}
                    </strong>
                  </td>
                </tr>
              ))}

              {!loadingPersonal &&
                bajasPersonalFiltradas.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        ...S.td,
                        textAlign: 'center',
                        color: '#8fa6a9',
                        padding: 28,
                      }}
                    >
                      No hay bajas de operaciones en los últimos 12 meses.
                    </td>
                  </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div style={S.card}>
      <div style={{ ...S.cardTitle, color: '#ffc933' }}>
        Criterio de cálculo de rotación
      </div>

      <div style={{ color: '#d5dfe0', fontSize: 13, lineHeight: 1.6 }}>
        Es la rotación por bajas: solo cuenta egresos, no ingresos. Se calcula
        con personal del área Operaciones Ecovatio (sin tercerizados), tomando
        los últimos 12 meses. La fórmula usada es:{' '}
        <strong>bajas del período ÷ dotación promedio del período × 100</strong>
        . La dotación promedio es{' '}
        <strong>
          {rotacionCalculada.usaPromedioMensual
            ? 'el promedio de la dotación de cada uno de los últimos 12 meses'
            : '(dotación inicial + dotación final) / 2'}
        </strong>
        . Con equipos chicos, una sola baja mueve varios puntos porcentuales.
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginTop: 16,
        }}
      >
        {[
          [
            'Inicio período',
            personalOperaciones.resumen?.periodo_inicio ?? '—',
          ],
          [
            'Fin período',
            personalOperaciones.resumen?.periodo_fin ?? '—',
          ],
          [
            'Dotación inicial',
            personalOperaciones.resumen?.dotacion_inicial ?? '—',
          ],
          [
            'Dotación final',
            personalOperaciones.resumen?.dotacion_final ?? '—',
          ],
          [
            'Dotación promedio',
            rotacionCalculada.dotacionPromedio !== null
              ? rotacionCalculada.dotacionPromedio.toFixed(1).replace('.0', '')
              : '—',
          ],
          ['Bajas del período', rotacionCalculada.bajas ?? '—'],
          [
            'Rotación 12 meses',
            formatRotacion(rotacionCalculada.rotacionPct),
          ],
          [
            'Rotación mensual promedio',
            formatRotacion(rotacionCalculada.rotacionMensualPct),
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              background: '#16323a',
              border: '1px solid #2c5059',
              borderRadius: 10,
              padding: 14,
            }}
          >
            <div
              style={{
                color: '#8fa6a9',
                fontSize: 10,
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 6,
              }}
            >
              {label}
            </div>

            <div style={{ fontSize: 22, fontWeight: 700 }}>
              {value}
            </div>
          </div>
        ))}
      </div>
    </div>
  </main>
)}


{/* ── COMPARATIVA MO ── */}
{tabActiva === 'comparativaMO' && (
  <main style={S.main}>
    {errorComparativaMO && (
      <div
        style={{
          background: '#ff5f5f22',
          border: '1px solid #ff5f5f44',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          color: '#ff7a7a',
        }}
      >
        {errorComparativaMO}
      </div>
    )}

    {/* Encabezado */}
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: 24, letterSpacing: '-0.01em' }}>
          Mano de obra: previsto vs real
        </h2>
        <p style={{ margin: '6px 0 0', color: '#b9c7c9', fontSize: 13 }}>
          ¿Las obras se ejecutan en los días y al costo previstos? Los días son
          días-hombre; los importes, USD.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {lastUpdateComparativaMO && (
          <span style={{ color: '#8fa6a9', fontSize: 11 }}>
            Actualizado: {lastUpdateComparativaMO}
          </span>
        )}
        <button
          style={S.btn}
          onClick={fetchComparativaMO}
          disabled={loadingComparativaMO}
        >
          {loadingComparativaMO ? 'Cargando...' : '↻ Actualizar'}
        </button>
      </div>
    </div>

    {/* Filtros */}
    <div
      style={{
        ...S.card,
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap',
        alignItems: 'flex-end',
        padding: '12px 16px',
      }}
    >
      <div>
        <label style={{ ...S.label, color: '#b9c7c9', fontWeight: 500 }}>
          Mostrar desvíos en
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            ['usd', 'USD'],
            ['pct', '% de días'],
          ].map(([clave, label]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setMetricaMO(clave)}
              style={{
                ...S.btn,
                height: 32,
                ...(metricaMO === clave
                  ? { background: '#e5a91c', borderColor: '#ffc933', color: '#fff' }
                  : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ ...S.label, color: '#b9c7c9', fontWeight: 500 }}>
          Días reales contra lo
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            ['presupuesto', 'Presupuestado'],
            ['planificado', 'Planificado'],
          ].map(([clave, label]) => (
            <button
              key={clave}
              type="button"
              onClick={() => setRefComparativaMO(clave)}
              style={{
                ...S.btn,
                height: 32,
                ...(refComparativaMO === clave
                  ? { background: '#e5a91c', borderColor: '#ffc933', color: '#fff' }
                  : {}),
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label style={{ ...S.label, color: '#b9c7c9', fontWeight: 500 }}>Desde</label>
        <input
          type="date"
          value={fechaDesdeComparativaMO}
          onChange={(e) => setFechaDesdeComparativaMO(e.target.value)}
          style={{ ...S.input, height: 32, boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ ...S.label, color: '#b9c7c9', fontWeight: 500 }}>Hasta</label>
        <input
          type="date"
          value={fechaHastaComparativaMO}
          onChange={(e) => setFechaHastaComparativaMO(e.target.value)}
          style={{ ...S.input, height: 32, boxSizing: 'border-box' }}
        />
      </div>

      <div>
        <label style={{ ...S.label, color: '#b9c7c9', fontWeight: 500 }}>Potencia</label>
        <MultiSelectFilter
          allLabel="Todas las potencias"
          options={OPCIONES_POTENCIA_LABELS}
          selected={rangoPotenciaComparativaMO}
          onChange={setRangoPotenciaComparativaMO}
          minWidth={180}
        />
      </div>

      <div>
        <label style={{ ...S.label, color: '#b9c7c9', fontWeight: 500 }}>
          Excluir obras
        </label>
        <MultiSelectFilter
          allLabel="Ninguna excluida"
          options={obrasComparativaMOOptions}
          selected={obrasExcluidasComparativaMO}
          onChange={setObrasExcluidasComparativaMO}
          searchable
          minWidth={180}
        />
      </div>

      {(fechaDesdeComparativaMO ||
        fechaHastaComparativaMO ||
        rangoPotenciaComparativaMO.length > 0 ||
        obrasExcluidasComparativaMO.length > 0) && (
        <button
          type="button"
          style={{ ...S.btn, height: 32 }}
          onClick={resetFiltrosComparativaMO}
        >
          Limpiar filtros
        </button>
      )}
    </div>

    {analisisMO.obras.length === 0 ? (
      <div style={{ ...S.card, textAlign: 'center', color: '#8fa6a9', padding: 40 }}>
        {loadingComparativaMO
          ? 'Cargando comparativa de mano de obra...'
          : comparativaMO.length === 0
          ? 'Todavía no hay datos cargados. Tocá "Actualizar" para reintentar.'
          : 'No hay obras para los filtros seleccionados.'}
      </div>
    ) : (
      <>
        {/* Resultado principal */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          <div
            style={{
              borderRadius: 16,
              padding: '22px 26px',
              border: `1px solid ${resultadoFavorMO ? '#95de1d55' : '#ff5f5f55'}`,
              background: `linear-gradient(135deg, #16323a 0%, #1d3c44 55%, ${
                resultadoFavorMO ? '#052e1a' : '#3b0d0d'
              } 100%)`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: '#b9c7c9',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                }}
              >
                Resultado de la mano de obra vs presupuesto
              </div>

              <div
                style={{
                  fontSize: 46,
                  fontWeight: 800,
                  lineHeight: 1.1,
                  marginTop: 8,
                  color: resultadoFavorMO ? '#95de1d' : '#ff5f5f',
                  letterSpacing: '-0.02em',
                }}
              >
                {analisisMO.costo.n === 0
                  ? '—'
                  : formatUsdAbs(Math.abs(analisisMO.costo.saldo))}
              </div>

              <div style={{ fontSize: 15, color: '#e3eaea', marginTop: 4 }}>
                {analisisMO.costo.n === 0
                  ? 'sin datos de costo'
                  : `${resultadoFavorMO ? 'por debajo' : 'por encima'} del presupuesto (${Math.abs(
                      analisisMO.costo.pct
                    ).toFixed(1)}%)`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {[
                ['Presupuestado', formatUsdAbs(analisisMO.costo.presupuesto)],
                ['Gastado', formatUsdAbs(analisisMO.costo.gasto)],
                ['Obras analizadas', analisisMO.costo.n],
              ].map(([label, value]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#8fa6a9', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'center' }}>
            <div style={{ ...S.cardTitle, marginBottom: 2 }}>Lo que hay que saber</div>

            {[lecturaMO, ...insightsMO.map((i) => i.texto)]
              .filter(Boolean)
              .map((texto, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    fontSize: 13,
                    lineHeight: 1.55,
                    color: '#e3eaea',
                  }}
                >
                  <span
                    style={{
                      flex: '0 0 6px',
                      borderRadius: 3,
                      background: i === 0 ? '#e5a91c' : '#3b5d65',
                    }}
                  />
                  <span>{texto}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Indicadores */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 12,
          }}
        >
          {[
            {
              label: 'Obras dentro de lo previsto',
              value:
                analisisMO.cumplimientoPct === null
                  ? '—'
                  : `${Math.round(analisisMO.cumplimientoPct)}%`,
              sub: `${analisisMO.cumplen} de ${analisisMO.conDias.length} usaron hasta +10% de días`,
              color: '#f4f8f8',
              accent: '#4fc3f7',
            },
            {
              label: 'Días de mano de obra',
              value: formatSignedPercent(analisisMO.dias.pct),
              sub:
                analisisMO.dias.pct === null
                  ? 'sin datos'
                  : `${Math.round(analisisMO.dias.real).toLocaleString('es-AR')} reales vs ${Math.round(analisisMO.dias.ref).toLocaleString('es-AR')} ${refComparativaMO === 'planificado' ? 'planificados' : 'presupuestados'}`,
              color: colorDesvioMO(analisisMO.dias.pct),
              accent: colorDesvioMO(analisisMO.dias.pct),
            },
            {
              label: 'Sobrecostos acumulados',
              value: formatUsdAbs(analisisMO.costo.sobrecostos),
              sub: `${analisisMO.costo.nSobre} obras gastaron más de lo presupuestado`,
              color: '#ff5f5f',
              accent: '#ff5f5f',
            },
            {
              label: 'Ahorros acumulados',
              value: formatUsdAbs(analisisMO.costo.ahorros),
              sub: `${analisisMO.costo.nAhorro} obras gastaron menos de lo presupuestado`,
              color: '#95de1d',
              accent: '#95de1d',
            },
            {
              label: 'Costo de MO por kWp',
              value:
                analisisMO.costo.usdKwpReal === null
                  ? '—'
                  : `USD ${Math.round(analisisMO.costo.usdKwpReal).toLocaleString('es-AR')}`,
              sub:
                analisisMO.costo.usdKwpPres === null
                  ? 'sin datos'
                  : `real · presupuestado USD ${Math.round(analisisMO.costo.usdKwpPres).toLocaleString('es-AR')} por kWp`,
              color: '#f4f8f8',
              accent: '#9b7bff',
            },
          ].map((k) => (
            <div
              key={k.label}
              style={{
                ...S.kpi,
                borderTop: `3px solid ${k.accent}`,
                background: 'linear-gradient(180deg, #131c2e 0%, #1d3c44 100%)',
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: '#8fa6a9',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: 6,
                }}
              >
                {k.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: k.color }}>
                {k.value}
              </div>
              <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: 4, lineHeight: 1.4 }}>
                {k.sub}
              </div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 11, color: '#8fa6a9', marginTop: -6 }}>
          Desvío = (real − previsto) ÷ previsto. En los gráficos, hacia la
          derecha es peor (más días o más costo de lo previsto).{' '}
          <span style={{ color: '#ff5f5f' }}>Rojo</span>: más de +10%.{' '}
          <span style={{ color: '#4fc3f7' }}>Azul</span>: dentro de ±10%.{' '}
          <span style={{ color: '#95de1d' }}>Verde</span>: más de 10% por debajo.
        </div>

        {/* Puente + distribución */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
            gap: 16,
          }}
        >
          <div style={{ ...S.card, gridColumn: 'span 2' }}>
            <div style={{ ...S.cardTitle, marginBottom: 4 }}>
              ¿De dónde sale el resultado?
            </div>
            <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 10 }}>
              Del presupuesto total se suman los sobrecostos de las obras que
              se pasaron y se restan los ahorros de las que gastaron menos, hasta
              llegar al gasto real.
            </div>

            {analisisMO.costo.n > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={puenteMO}
                  margin={{ top: 28, right: 20, bottom: 10, left: 0 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#2c5059" />
                  <XAxis
                    dataKey="nombre"
                    interval={0}
                    tick={{ fill: '#d5dfe0', fontSize: 12 }}
                  />
                  <YAxis
                    tick={{ fill: '#b9c7c9', fontSize: 11 }}
                    tickFormatter={formatUsdK}
                    domain={[0, ejePuenteMO.tope]}
                    ticks={ejePuenteMO.marcas}
                  />
                  <Tooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;

                      const r = payload[0].payload;

                      return (
                        <div
                          style={{
                            background: '#2c5059',
                            border: '1px solid #3b5d65',
                            borderRadius: 8,
                            padding: '8px 12px',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 800, color: '#f4f8f8' }}>{r.nombre}</div>
                          <div style={{ color: r.color }}>{r.texto}</div>
                          {r.detalle && (
                            <div style={{ color: '#b9c7c9', marginTop: 2 }}>{r.detalle}</div>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="base" stackId="puente" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="valor" stackId="puente" radius={[6, 6, 0, 0]} barSize={72}>
                    {puenteMO.map((r) => (
                      <Cell key={r.nombre} fill={r.color} />
                    ))}
                    <LabelList
                      dataKey="valor"
                      content={({ x, y, width, index }) => (
                        <text
                          x={x + width / 2}
                          y={y - 8}
                          textAnchor="middle"
                          fill="#f4f8f8"
                          fontSize={13}
                          fontWeight={700}
                        >
                          {puenteMO[index]?.texto}
                        </text>
                      )}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ color: '#8fa6a9', padding: 30, textAlign: 'center' }}>
                Sin obras con presupuesto y gasto de MO cargados.
              </div>
            )}
          </div>

          <div style={S.card}>
            <div style={{ ...S.cardTitle, marginBottom: 4 }}>
              Cómo se reparten las obras
            </div>
            <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 6 }}>
              Según los días de mano de obra usados y su efecto en USD.
            </div>

            <DonutInteractivo
              data={analisisMO.grupos
                .filter((g) => g.n > 0)
                .map((g) => ({ name: g.label, value: g.n, fill: g.color }))}
              height={210}
              innerRadius={60}
              outerRadius={86}
              fmtValor={(v) => `${v} ${v === 1 ? 'obra' : 'obras'}`}
              centroBig={analisisMO.conDias.length}
              centroSmall="obras"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {analisisMO.grupos.map((g) => (
                <div
                  key={g.clave}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 8,
                    alignItems: 'center',
                    fontSize: 12,
                  }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />
                  <span style={{ color: '#d5dfe0' }}>
                    {g.label} · <strong>{g.n}</strong>
                  </span>
                  <span style={{ color: g.usd > 0 ? '#ff5f5f' : g.usd < 0 ? '#95de1d' : '#b9c7c9', fontWeight: 700 }}>
                    {formatUsdSigned(g.usd)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rankings en USD */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 16,
          }}
        >
          {[
            {
              titulo: 'Mayores sobrecostos',
              lista: analisisMO.topSobrecostos,
              color: '#ff5f5f',
              vacio: 'Ninguna obra gastó más de lo presupuestado.',
            },
            {
              titulo: 'Mayores ahorros',
              lista: analisisMO.topAhorros,
              color: '#95de1d',
              vacio: 'Ninguna obra gastó menos de lo presupuestado.',
            },
          ].map(({ titulo, lista, color, vacio }) => {
            const maximo = lista.length
              ? Math.max(...lista.map((o) => Math.abs(o.desvioUsd)))
              : 1;

            return (
              <div key={titulo} style={S.card}>
                <div style={{ ...S.cardTitle, color, marginBottom: 10 }}>{titulo}</div>

                {lista.length === 0 && (
                  <div style={{ color: '#8fa6a9', fontSize: 12 }}>{vacio}</div>
                )}

                {lista.map((o) => (
                  <div key={o.id} style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        fontSize: 12,
                        marginBottom: 4,
                      }}
                    >
                      <span
                        title={o.obra}
                        style={{
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {o.obra}
                      </span>
                      <span style={{ color, fontWeight: 800, whiteSpace: 'nowrap' }}>
                        {formatUsdSigned(o.desvioUsd)}
                      </span>
                    </div>

                    <div style={{ height: 6, background: '#2c5059', borderRadius: 3 }}>
                      <div
                        style={{
                          width: `${(Math.abs(o.desvioUsd) / maximo) * 100}%`,
                          height: 6,
                          background: color,
                          borderRadius: 3,
                        }}
                      />
                    </div>

                    <div style={{ fontSize: 10, color: '#8fa6a9', marginTop: 3 }}>
                      {o.diasReales !== null
                        ? `${formatDias(o.diasReales)} reales vs ${formatDias(o.diasRef)} · ${formatSignedDias(o.diasExtra)}`
                        : 'sin días cargados'}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Desvío de cada obra */}
        <div style={S.card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: 10,
            }}
          >
            <div>
              <div style={{ ...S.cardTitle, marginBottom: 4 }}>
                Desvío de cada obra
              </div>
              <div style={{ color: '#8fa6a9', fontSize: 12 }}>
                {metricaMO === 'usd'
                  ? 'Cuánto gastó de más (derecha) o de menos (izquierda) cada obra respecto de su presupuesto de MO, en USD.'
                  : `Cuánto se pasó (derecha) o cuánto ahorró (izquierda) cada obra en días de mano de obra respecto de lo ${
                      refComparativaMO === 'planificado' ? 'planificado' : 'presupuestado'
                    }.`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: '#b9c7c9' }}>
              <span>Ordenar por</span>
              {[
                ['desvio', 'Mayor desvío'],
                ['fecha', 'Fecha de inicio'],
              ].map(([clave, label]) => (
                <button
                  key={clave}
                  type="button"
                  onClick={() => setOrdenGraficoMO(clave)}
                  style={{
                    ...S.btn,
                    ...(ordenGraficoMO === clave
                      ? { background: '#e5a91c', borderColor: '#ffc933', color: '#fff' }
                      : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {datosGraficoMO.length > 0 ? (
            <ResponsiveContainer
              width="100%"
              height={Math.max(280, datosGraficoMO.length * 26 + 60)}
            >
              <BarChart
                layout="vertical"
                data={datosGraficoMO}
                margin={{ top: 18, right: 30, bottom: 8, left: 0 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#2c5059" />

                <XAxis
                  type="number"
                  domain={[ejeGraficoMO.min, ejeGraficoMO.max]}
                  allowDataOverflow
                  tick={{ fill: '#b9c7c9', fontSize: 11 }}
                  tickFormatter={(v) => (metricaMO === 'usd' ? formatUsdK(v) : `${v}%`)}
                />

                <YAxis
                  type="category"
                  dataKey="etiqueta"
                  width={350}
                  interval={0}
                  tick={{ fill: '#d5dfe0', fontSize: 11 }}
                />

                <ReferenceLine x={0} stroke="#cbd5e1" strokeWidth={1.4} />
                {metricaMO === 'pct' && (
                  <ReferenceLine
                    x={10}
                    stroke="#8fa6a9"
                    strokeDasharray="4 4"
                    label={{ value: '+10%', position: 'top', fill: '#8fa6a9', fontSize: 10 }}
                  />
                )}
                {metricaMO === 'pct' && (
                  <ReferenceLine
                    x={-10}
                    stroke="#8fa6a9"
                    strokeDasharray="4 4"
                    label={{ value: '−10%', position: 'top', fill: '#8fa6a9', fontSize: 10 }}
                  />
                )}

                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;

                    const r = payload[0].payload;

                    return (
                      <div
                        style={{
                          background: '#2c5059',
                          border: '1px solid #3b5d65',
                          borderRadius: 8,
                          padding: '10px 12px',
                          fontSize: 12,
                          minWidth: 250,
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#f4f8f8' }}>{r.obra}</div>
                        <div style={{ color: '#8fa6a9', marginBottom: 6 }}>
                          Inicio: {r.fecha_inicio || 'sin fecha'}
                          {r.kwp !== null ? ` · ${formatKwp(r.kwp)}` : ''}
                        </div>
                        {r.desvioUsd !== null && (
                          <>
                            <div style={{ color: '#b9c7c9' }}>
                              Presupuestado: {formatUsdAbs(r.presupuestoUsd)} · Gastado:{' '}
                              {formatUsdAbs(r.gastoUsd)}
                            </div>
                            <div
                              style={{
                                color: r.desvioUsd > 0 ? '#ff5f5f' : '#95de1d',
                                fontWeight: 800,
                                marginTop: 2,
                              }}
                            >
                              {r.desvioUsd > 0 ? 'Sobrecosto' : 'Ahorro'}{' '}
                              {formatUsdAbs(r.desvioUsd)} ({formatSignedPercent(r.desvioCosto)})
                            </div>
                          </>
                        )}
                        {r.desvioDias !== null && (
                          <div style={{ color: '#b9c7c9', marginTop: 4 }}>
                            Días: {formatDias(r.diasReales)} reales vs {formatDias(r.diasRef)}{' '}
                            {refComparativaMO === 'planificado' ? 'planificados' : 'presupuestados'}{' '}
                            ({formatSignedDias(r.diasExtra)})
                          </div>
                        )}
                      </div>
                    );
                  }}
                />

                <Bar dataKey="valor" barSize={14}>
                  {datosGraficoMO.map((r) => (
                    <Cell key={r.id} fill={r.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#8fa6a9', padding: 40 }}>
              No hay obras con datos para comparar.
            </div>
          )}

          {ejeGraficoMO.recortado && (
            <div style={{ color: '#8fa6a9', fontSize: 11, marginTop: 6 }}>
              Las barras más largas se cortan en +150% para que se puedan
              comparar las demás; el valor real está escrito junto al nombre.
            </div>
          )}
        </div>

        {/* Evolución */}
        <div style={S.card}>
          <div style={{ ...S.cardTitle, marginBottom: 4 }}>Evolución en el tiempo</div>
          <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 10 }}>
            Las obras se agrupan según el trimestre en que empezaron. Cada barra
            muestra el desvío de ese grupo{' '}
            {metricaMO === 'usd' ? 'en USD' : 'en días de mano de obra'}:{' '}
            <strong style={{ color: '#ff5f5f' }}>sobre el 0</strong>{' '}
            {metricaMO === 'usd' ? 'gastó más de lo presupuestado' : 'usó más días de lo previsto'},{' '}
            <strong style={{ color: '#95de1d' }}>bajo el 0</strong>{' '}
            {metricaMO === 'usd' ? 'gastó menos' : 'usó menos'}.
          </div>

          {analisisMO.trimestres.length > 0 ? (
            <ResponsiveContainer width="100%" height={290}>
              <BarChart
                data={analisisMO.trimestres}
                margin={{ top: 26, right: 12, bottom: 20, left: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#2c5059" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  height={60}
                  tick={({ x, y, payload }) => {
                    const t = analisisMO.trimestres.find(
                      (item) => item.label === payload.value
                    );

                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text x={0} y={0} dy={14} textAnchor="middle" fill="#d5dfe0" fontSize={11}>
                          {t ? t.periodo : payload.value}
                        </text>
                        <text x={0} y={0} dy={28} textAnchor="middle" fill="#b9c7c9" fontSize={10}>
                          {t ? t.anio : ''}
                        </text>
                        <text x={0} y={0} dy={42} textAnchor="middle" fill="#8fa6a9" fontSize={10}>
                          {t ? `${t.obras} ${t.obras === 1 ? 'obra' : 'obras'}` : ''}
                        </text>
                      </g>
                    );
                  }}
                />
                <YAxis
                  tick={{ fill: '#b9c7c9', fontSize: 11 }}
                  tickFormatter={(v) => (metricaMO === 'usd' ? formatUsdK(v) : `${v}%`)}
                />
                <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1.4} />
                {metricaMO === 'pct' && (
                  <ReferenceLine y={10} stroke="#8fa6a9" strokeDasharray="4 4" />
                )}
                {metricaMO === 'pct' && (
                  <ReferenceLine y={-10} stroke="#8fa6a9" strokeDasharray="4 4" />
                )}
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;

                    const t = payload[0].payload;

                    return (
                      <div
                        style={{
                          background: '#2c5059',
                          border: '1px solid #3b5d65',
                          borderRadius: 8,
                          padding: '10px 12px',
                          fontSize: 12,
                          minWidth: 230,
                        }}
                      >
                        <div style={{ fontWeight: 800, color: '#f4f8f8' }}>
                          Obras iniciadas en {t.label}
                        </div>
                        <div style={{ color: '#8fa6a9', marginBottom: 6 }}>
                          {t.obras} {t.obras === 1 ? 'obra' : 'obras'}
                        </div>
                        <div style={{ color: colorDesvioMO(t.costo), fontWeight: 800 }}>
                          Costo MO: {t.usd === null ? '—' : formatUsdSigned(t.usd)} (
                          {formatSignedPercent(t.costo)})
                        </div>
                        <div style={{ color: '#b9c7c9', marginTop: 2 }}>
                          Días: {Math.round(t.diasReales).toLocaleString('es-AR')} reales vs{' '}
                          {Math.round(t.diasPrevistos).toLocaleString('es-AR')}{' '}
                          {refComparativaMO === 'planificado' ? 'planificados' : 'presupuestados'} (
                          {formatSignedPercent(t.dias)})
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey={metricaMO === 'usd' ? 'usd' : 'dias'}
                  radius={[3, 3, 0, 0]}
                  barSize={46}
                >
                  {analisisMO.trimestres.map((t) => (
                    <Cell
                      key={t.label}
                      fill={colorDesvioMO(metricaMO === 'usd' ? t.costo : t.dias)}
                    />
                  ))}
                  <LabelList
                    dataKey={metricaMO === 'usd' ? 'usd' : 'dias'}
                    position="top"
                    formatter={(v) =>
                      v === null || v === undefined
                        ? ''
                        : metricaMO === 'usd'
                        ? formatUsdSigned(v)
                        : formatSignedPercent(v)
                    }
                    style={{ fill: '#e3eaea', fontSize: 12, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ color: '#8fa6a9', padding: 30, textAlign: 'center' }}>
              Sin fechas de inicio para armar la evolución.
            </div>
          )}
        </div>

        {/* Por tamaño */}
        <div style={S.card}>
          <div style={{ ...S.cardTitle, marginBottom: 4 }}>Por tamaño de obra</div>
          <div style={{ color: '#8fa6a9', fontSize: 12, marginBottom: 10 }}>
            ¿Se desvían más las obras chicas o las grandes?
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>Rango</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Obras</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Desvío de días</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>Desvío en USD</th>
                  <th style={{ ...S.th, textAlign: 'right' }}>MO por kWp (real)</th>
                </tr>
              </thead>
              <tbody>
                {analisisMO.porRango.map((r) => (
                  <tr key={r.clave}>
                    <td style={S.td}>{r.label}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>{r.obras}</td>
                    <td
                      style={{
                        ...S.td,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: colorDesvioMO(r.dias.pct),
                      }}
                    >
                      {formatSignedPercent(r.dias.pct)}
                    </td>
                    <td
                      style={{
                        ...S.td,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: colorDesvioMO(r.costo.pct),
                      }}
                    >
                      {r.costo.n === 0 ? '—' : formatUsdSigned(r.costo.desvioUsd)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {r.costo.usdKwpReal === null
                        ? '—'
                        : `USD ${Math.round(r.costo.usdKwpReal).toLocaleString('es-AR')}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle */}
        <div style={{ ...S.card, padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #2c5059',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ ...S.cardTitle, marginBottom: 0 }}>
              Detalle por obra{' '}
              <span style={{ color: '#8fa6a9', fontWeight: 400, textTransform: 'none' }}>
                ({tablaMO.length} de {analisisMO.obras.length})
              </span>
            </span>

            <input
              placeholder="Buscar obra..."
              value={busquedaComparativaMO}
              onChange={(e) => setBusquedaComparativaMO(e.target.value)}
              style={{ ...S.input, width: 200 }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={S.table}>
              <thead>
                <tr>
                  {[
                    ['obra', 'Obra', 'left'],
                    ['fecha_input', 'Inicio', 'left'],
                    ['kwp', 'kWp', 'right'],
                    ['diasRef', refComparativaMO === 'planificado' ? 'Días plan.' : 'Días presup.', 'right'],
                    ['diasReales', 'Días reales', 'right'],
                    ['desvioDias', 'Desvío días', 'right'],
                    ['presupuestoUsd', 'MO presup.', 'right'],
                    ['gastoUsd', 'MO real', 'right'],
                    ['desvioUsd', 'Desvío USD', 'right'],
                  ].map(([campo, label, align]) => (
                    <th
                      key={campo}
                      onClick={() => handleOrdenMO(campo)}
                      style={{
                        ...S.th,
                        textAlign: align,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        userSelect: 'none',
                      }}
                    >
                      {label}
                      {ordenMO.campo === campo
                        ? ordenMO.dir === 'asc'
                          ? ' ↑'
                          : ' ↓'
                        : ''}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tablaMO.map((o) => (
                  <tr key={o.id}>
                    <td style={{ ...S.td, fontWeight: 700 }}>{o.obra}</td>
                    <td style={S.td}>{o.fecha_inicio || '—'}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {o.kwp === null ? '—' : formatKwp(o.kwp)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {o.diasRef === null ? '—' : formatDias(o.diasRef)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {o.diasReales === null ? '—' : formatDias(o.diasReales)}
                    </td>
                    <td
                      style={{
                        ...S.td,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: colorDesvioMO(o.desvioDias),
                      }}
                    >
                      {formatSignedPercent(o.desvioDias)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {o.presupuestoUsd === null ? '—' : formatUsdAbs(o.presupuestoUsd)}
                    </td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {o.gastoUsd === null ? '—' : formatUsdAbs(o.gastoUsd)}
                    </td>
                    <td
                      style={{
                        ...S.td,
                        textAlign: 'right',
                        fontWeight: 700,
                        color: colorDesvioMO(o.desvioCosto),
                      }}
                    >
                      {o.desvioUsd === null ? '—' : formatUsdSigned(o.desvioUsd)}
                    </td>
                  </tr>
                ))}

                {tablaMO.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ ...S.td, textAlign: 'center', color: '#8fa6a9', padding: 28 }}
                    >
                      Sin obras para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ fontSize: 11, color: '#8fa6a9', lineHeight: 1.6 }}>
          Notas: los importes son USD de mano de obra. "Sobrecosto" = gastado −
          presupuestado (positivo, peor); "ahorro" = lo contrario. Una obra solo
          entra en un cálculo si tiene días reales y de referencia (o
          presupuesto y gasto de MO) cargados; no se completan datos faltantes.
          {analisisMO.sinDias > 0 &&
            ` ${analisisMO.sinDias} obra(s) sin días reales o sin referencia quedan fuera de los indicadores de días.`}{' '}
          Los totales y porcentajes conjuntos suman todas las obras (no son
          promedios de porcentajes), por lo que las obras grandes pesan más.
          Solo se muestran las obras marcadas con "Sí" en la columna "Mostrar
          en el dashboard" de la hoja.
        </div>
      </>
    )}
  </main>
)}


      {/* ── DASHBOARD ── */}
      {tabActiva === 'dashboard' && (
        <main className="mx-auto flex max-w-[1500px] flex-col gap-5 p-6">
          {error && (
            <Callout variant="error" title="Error">
              {error}
            </Callout>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: 'Obras totales',
                value: obras.length,
                sub: 'proyectos registrados',
                color: '#f4f8f8',
                icon: RiBuilding2Line,
                accent: 'bg-blue-500/10 text-blue-400',
                onClick: () => {
                  const el = document.getElementById('detalle-obras');
                  if (!el) return;
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  el.classList.remove('destello-seccion');
                  // reinicia la animación aunque se toque varias veces
                  void el.offsetWidth;
                  el.classList.add('destello-seccion');
                  setTimeout(() => el.classList.remove('destello-seccion'), 2400);
                },
                hint: 'Ir al detalle de obras',
              },
              {
                label: 'Obras activas',
                value: stats.activas,
                sub: 'en obra o parte solar finalizada',
                color: '#95de1d',
                icon: RiFlashlightLine,
                accent: 'bg-emerald-500/10 text-emerald-400',
                onClick: () => setModalKpi('activas'),
                hint: 'Ver cuáles son',
              },
              {
                label: 'Capacidad total',
                value: potenciaTotalInstalada.disponible
                  ? formatKwp(Math.round(potenciaTotalInstalada.totalKwp))
                  : '—',
                sub: potenciaTotalInstalada.disponible
                  ? `instalados en ${potenciaTotalInstalada.aniosTexto} · ${potenciaTotalInstalada.cantObras} obras`
                  : 'cargando potencia instalada…',
                color: '#ffc933',
                icon: RiSunLine,
                accent: 'bg-amber-500/10 text-amber-400',
                onClick: () => setModalKpi('capacidad'),
                hint: 'Ver cómo se calcula',
              },
              {
                label: 'Prom. HS MO/kWp',
                value: stats.avgHs !== '-' ? stats.avgHs : '—',
                sub: 'promedio general',
                color: '#f4f8f8',
                isHs: true,
                icon: RiDashboardLine,
                accent: 'bg-violet-500/10 text-violet-400',
                onClick: () => setModalKpi('hs'),
                hint: 'Ver cómo se calcula',
              },
            ].map((k) => (
              <Card
                key={k.label}
                className={cx(
                  'p-5',
                  k.onClick &&
                    'cursor-pointer transition-all hover:-translate-y-0.5 hover:border-[#95de1d]/50 hover:shadow-xl',
                )}
                {...(k.onClick
                  ? {
                      role: 'button',
                      tabIndex: 0,
                      onClick: k.onClick,
                      onKeyDown: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          k.onClick();
                        }
                      },
                    }
                  : {})}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                    {k.label}
                  </div>
                  <div
                    className={cx(
                      'flex size-9 shrink-0 items-center justify-center rounded-lg',
                      k.accent,
                    )}
                  >
                    <k.icon className="size-[18px]" aria-hidden="true" />
                  </div>
                </div>
                <div
                  className="mt-3 text-4xl font-extrabold tracking-tight"
                  style={{ color: k.color }}
                >
                  {k.isHs && stats.avgHs !== '-' ? (
                    <HsLabel value={stats.avgHs} color={k.color} />
                  ) : (
                    k.value
                  )}
                </div>
                <div className="mt-1.5 text-xs text-gray-500 dark:text-gray-500">
                  {k.sub}
                </div>
                {k.hint && (
                  <div className="mt-2 text-[11px] font-semibold text-[#95de1d]">
                    {k.hint} →
                  </div>
                )}
              </Card>
            ))}
          </div>

          {modalKpi === 'activas' && (
            <VentanaKpi
              titulo="Obras activas"
              subtitulo={`${stats.activas} en obra o con la parte solar finalizada · ${formatKwp(
                Math.round(
                  stats.listaActivas.reduce((t, o) => t + (Number(o.kwp) || 0), 0)
                )
              )}`}
              onClose={() => setModalKpi(null)}
            >
              {stats.listaActivas.length === 0 && (
                <div className="py-6 text-center text-sm text-gray-400">
                  No hay obras activas en este momento.
                </div>
              )}
              {stats.listaActivas.map((o, i) => {
                const enObra = o.estado === 'En obra';
                const color = enObra ? '#ffc933' : '#4fc3f7';
                return (
                  <div
                    key={`${o.nombre}-${i}`}
                    className="rounded-xl border border-white/5 bg-gray-800/60 p-3"
                    style={{
                      animation: `slideUpAndFade 260ms ${i * 45}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 truncate text-sm font-semibold">
                        {o.nombre}
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: color + '26', color }}
                      >
                        {o.estado}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-950">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.max(0, Math.min(100, Number(o.avance) || 0))}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <div className="w-10 text-right text-xs font-semibold">
                        {Math.round(Number(o.avance) || 0)}%
                      </div>
                    </div>
                    <div className="mt-1.5 text-xs text-gray-400">
                      {formatKwp(Math.round(Number(o.kwp) || 0))}
                      {o.tipo_cliente ? ` · ${o.tipo_cliente}` : ''}
                      {o.implantacion ? ` · ${o.implantacion}` : ''}
                    </div>
                  </div>
                );
              })}
            </VentanaKpi>
          )}

          {modalKpi === 'hs' && (
            <VentanaKpi
              titulo="Promedio HS MO / kWp"
              subtitulo="Cómo se llega al promedio general"
              onClose={() => setModalKpi(null)}
            >
              <div className="rounded-xl border border-white/5 bg-gray-800/60 p-4">
                <div className="text-3xl font-extrabold text-white">
                  {stats.avgHs}{' '}
                  <span className="text-lg font-normal text-gray-400">
                    HS MO / kWp
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-300">
                  Es el <strong>promedio simple</strong> del indicador (horas de
                  mano de obra por kWp instalado) de las obras que tienen ese
                  dato cargado: se suman los indicadores y se divide por la
                  cantidad de obras.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ['Obras registradas', obras.length, '#f4f8f8'],
                  ['Con indicador', stats.listaHs.length, '#95de1d'],
                  [
                    'Sin indicador',
                    obras.length - stats.listaHs.length,
                    '#ffc933',
                  ],
                ].map(([t, v, c]) => (
                  <div
                    key={t}
                    className="rounded-xl border border-white/5 bg-gray-800/60 p-3"
                  >
                    <div className="text-2xl font-extrabold" style={{ color: c }}>
                      {v}
                    </div>
                    <div className="text-[11px] text-gray-400">{t}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border border-white/5 bg-gray-800/60 p-3 text-sm text-gray-300">
                <div>
                  <strong className="text-white">Ponderado por kWp:</strong>{' '}
                  {stats.hsPonderado != null
                    ? stats.hsPonderado.toFixed(2)
                    : '—'}{' '}
                  HS MO / kWp (para comparar: las obras grandes pesan más).
                </div>
                <div className="mt-1.5 text-xs text-gray-400">
                  Este promedio incluye todas las obras con indicador, también
                  las "Alto" y "Crítico" (naranja y rojo). El estimador de
                  duración de obras las excluye para sugerir un valor.
                </div>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Obras incluidas ({stats.listaHs.length}) — de menor a mayor
                indicador
              </div>
              <div className="space-y-1">
                {stats.listaHs.map((o, i) => (
                  <div
                    key={`${o.nombre}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-800/40 px-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate">{o.nombre}</span>
                    <span className="w-20 shrink-0 text-right text-xs text-gray-400">
                      {formatKwp(Math.round(Number(o.kwp) || 0))}
                    </span>
                    <span
                      className="w-14 shrink-0 text-right font-semibold"
                      style={{ color: HsMoColor(Number(o.hs_mo_kwp)) }}
                    >
                      {Number(o.hs_mo_kwp).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </VentanaKpi>
          )}

          {modalKpi === 'capacidad' && (
            <VentanaKpi
              titulo="Capacidad total"
              subtitulo="Cómo se llega a la potencia instalada hasta la fecha"
              onClose={() => setModalKpi(null)}
            >
              <div className="rounded-xl border border-white/5 bg-gray-800/60 p-4">
                <div className="text-3xl font-extrabold text-[#ffc933]">
                  {potenciaTotalInstalada.disponible
                    ? formatKwp(Math.round(potenciaTotalInstalada.totalKwp))
                    : '—'}
                </div>
                <div className="mt-2 text-sm text-gray-300">
                  <strong>
                    Todo lo instalado hasta la fecha ({potenciaTotalInstalada.aniosTexto || '—'}):
                  </strong>{' '}
                  suma de la potencia instalada mes a mes en las hojas PI (
                  {potenciaTotalInstalada.cantMeses} meses con datos,{' '}
                  {potenciaTotalInstalada.cantObras} obras). Es el mismo dato
                  que la solapa "Potencia Instalada por año" en la vista
                  "Todos".
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-gray-800/60 p-4">
                <div className="text-2xl font-extrabold text-[#95de1d]">
                  {formatKwp(Math.round(stats.totalKwp))}
                </div>
                <div className="mt-1 text-sm text-gray-300">
                  <strong>Capacidad de las obras del panel:</strong> suma de los
                  kWp de las {obras.length} obras registradas en la hoja de
                  obras, sin importar en qué estado estén (detalle abajo).
                </div>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Obras del panel por estado
              </div>
              <div className="space-y-2">
                {stats.porEstado.map((e, i) => (
                  <div
                    key={e.estado}
                    className="rounded-xl border border-white/5 bg-gray-800/60 p-3"
                    style={{
                      animation: `slideUpAndFade 260ms ${i * 45}ms both cubic-bezier(0.16, 1, 0.3, 1)`,
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">{e.estado}</span>
                      <span className="text-gray-300">
                        {e.obras} {e.obras === 1 ? 'obra' : 'obras'} ·{' '}
                        <strong className="text-white">
                          {formatKwp(Math.round(e.kwp))}
                        </strong>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-950">
                        <div
                          className="h-2 rounded-full bg-[#ffc933]"
                          style={{
                            width: `${stats.totalKwp ? (e.kwp / stats.totalKwp) * 100 : 0}%`,
                          }}
                        />
                      </div>
                      <div className="w-12 text-right text-xs font-semibold">
                        {pctFmt(e.kwp, stats.totalKwp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </VentanaKpi>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              {
                title: 'Mejores indicadores — Obra completa',
                color: '#95de1d',
                barClass: 'bg-emerald-500',
                accent: 'bg-emerald-500/10 text-emerald-400',
                icon: RiTrophyLine,
                data: mejores,
              },
              {
                title: 'Peores indicadores — Obra completa',
                color: '#ff5f5f',
                barClass: 'bg-red-500',
                accent: 'bg-red-500/10 text-red-400',
                icon: RiAlarmWarningLine,
                data: peores,
              },
            ].map(({ title, color, barClass, accent, icon: Icon, data }) => (
              <Card key={title} className="p-5">
                <div className="mb-4 flex items-center gap-2.5">
                  <div
                    className={cx(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg',
                      accent,
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                    {title}
                  </div>
                </div>
                {data.map((o, i) => (
                  <div
                    key={`${o.nombre}-${i}`}
                    className="mb-2.5 flex items-center gap-2.5"
                  >
                    <span className="w-3.5 text-[10px] text-gray-500 dark:text-gray-600">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm text-gray-900 dark:text-gray-50">
                      {o.nombre}
                    </span>
                    <div className="h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-800">
                      <div
                        className={cx('h-2 rounded-full', barClass)}
                        style={{
                          width: `${Math.min((o.hs_mo_kwp / 25) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span
                      className="min-w-[130px] rounded px-1.5 py-0.5 text-right text-xs"
                      style={{ background: color + '1a' }}
                    >
                      <HsLabel
                        value={Number(o.hs_mo_kwp).toFixed(2)}
                        color={color}
                      />
                    </span>
                  </div>
                ))}
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                <RiHammerLine className="size-4" aria-hidden="true" />
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                Indicador específico — Armado de estructura
              </div>
            </div>
            <div className="grid grid-cols-[2fr_1fr] items-center gap-3">
              <div>
                <div className="mb-1 text-base font-bold">
                  Armado de Estructura Hincada Biposte
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Indicador específico para montaje de estructura únicamente.
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-extrabold tracking-tight">
                  <HsLabel
                    value={INDICADOR_ESTRUCTURA_BIPOSTE.toFixed(2)}
                    color="#4fc3f7"
                  />
                </div>
                <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
                  Indicador específico de estructura
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-500/10 text-gray-400">
                  <RiBarChartBoxLine className="size-4" aria-hidden="true" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                  Hs MO / kWp por obra
                </div>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={barData}
                  margin={{ top: 0, right: 0, bottom: 90, left: -10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c5059" />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#8fa6a9', fontSize: 9 }}
                    angle={-45}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fill: '#8fa6a9', fontSize: 10 }} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                    {barData.map((e, i) => (
                      <Cell key={i} fill={e.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap gap-3">
                {[
                  ['≤5', '#95de1d', 'Óptimo'],
                  ['5–8', '#c7ee8a', 'Bueno'],
                  ['8–12', '#ffc933', 'Regular'],
                  ['12–18', '#ff9f4a', 'Alto'],
                  ['>18', '#ff5f5f', 'Crítico'],
                ].map(([r, c, l]) => (
                  <div
                    key={r}
                    className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-500"
                  >
                    <div
                      className="size-2.5 rounded-sm"
                      style={{ background: c }}
                    />
                    {r} — {l}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
  <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
    <div className="flex items-center gap-2.5">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-500/10 text-gray-400">
        <RiPieChartLine className="size-4" aria-hidden="true" />
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-500">
        {criterioGraficoKwp === 'tipo_cliente'
          ? 'kWp por tipo de cliente'
          : 'kWp por implantación'}
      </div>
    </div>

    <SelectNative
      value={criterioGraficoKwp}
      onChange={(e) => setCriterioGraficoKwp(e.target.value)}
      className="w-auto"
    >
      <option value="implantacion">kWp por implantación</option>
      <option value="tipo_cliente">kWp por tipo de cliente</option>
    </SelectNative>
  </div>

  <DonutInteractivo
    data={pieData.map((d) => ({ ...d, fill: TIPO_COLORS[d.name] || '#8fa6a9' }))}
    height={220}
    fmtValor={(v) => formatKwp(v)}
    centroBig={formatKwp(pieData.reduce((t, d) => t + d.value, 0))}
    centroSmall="kWp totales"
  />
              <div className="mt-2 flex flex-col gap-1.5">
                {pieData.map((d) => (
  <div
    key={d.name}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: 12,
    }}
  >
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 7 }}
    >
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: 2,
          background: TIPO_COLORS[d.name] || '#8fa6a9',
        }}
      />

      <span style={{ color: '#b9c7c9' }}>
        {d.name}
      </span>
    </div>

    <span style={{ fontWeight: 600 }}>
  {formatKwp(d.value)} · {d.porcentajeEntero}%
</span>
  </div>
))}
              </div>
            </Card>
          </div>

          <div
            id="detalle-obras"
            className="scroll-mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-gray-200 p-3 dark:border-gray-800">
              <span className="text-[11px] font-semibold uppercase tracking-wider">
                Detalle de obras{' '}
                <span className="font-normal normal-case text-gray-500 dark:text-gray-500">
                  ({obrasFiltradas.length} de {obras.length})
                </span>
              </span>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="search"
                  placeholder="Buscar obra..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-40"
                />
                <MultiSelectFilter
                  allLabel="Todas las obras"
                  options={opcionesObrasDashboard}
                  selected={filtroObras}
                  onChange={setFiltroObras}
                  searchable
                  minWidth={170}
                />
                <MultiSelectFilter
                  allLabel="Todas las potencias"
                  options={OPCIONES_POTENCIA_LABELS}
                  selected={filtroPotencia}
                  onChange={setFiltroPotencia}
                  minWidth={170}
                />
                <MultiSelectFilter
                  allLabel="Todos los estados"
                  options={estados.slice(1)}
                  selected={filtroEstado}
                  onChange={setFiltroEstado}
                />
                <MultiSelectFilter
                  allLabel="Todos los clientes"
                  options={tiposCliente.slice(1)}
                  selected={filtroTipoCliente}
                  onChange={setFiltroTipoCliente}
                />
                <MultiSelectFilter
                  allLabel="Todas las implantaciones"
                  options={implantaciones.slice(1)}
                  selected={filtroImplantacion}
                  onChange={setFiltroImplantacion}
                  minWidth={190}
                />
                <MultiSelectFilter
                  allLabel="Todas las estructuras"
                  options={estructurasDashboard}
                  selected={filtroEstructura}
                  onChange={setFiltroEstructura}
                  align="right"
                  minWidth={190}
                />
                {(filtroEstado.length > 0 ||
                  filtroTipoCliente.length > 0 ||
                  filtroImplantacion.length > 0 ||
                  filtroEstructura.length > 0 ||
                  filtroObras.length > 0 ||
                  filtroPotencia.length > 0) && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setFiltroEstado([]);
                      setFiltroTipoCliente([]);
                      setFiltroImplantacion([]);
                      setFiltroEstructura([]);
                      setFiltroObras([]);
                      setFiltroPotencia([]);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
            <div style={S.thead}>
              {[
                ['nombre', 'Obra'],
                ['kwp', 'kWp'],
                ['estado', 'Estado'],
                ['avance', 'Avance'],
                ['hs_mo_kwp', 'Hs MO/kWp'],
                ['tipo_cliente', 'Tipo de cliente'],
                ['implantacion', 'Implantación'],
                ['estructura', 'Tipo de estructura'],
              ].map(([f, l]) => (
                <span
                  key={f}
                  onClick={() => handleSort(f)}
                  style={{ cursor: 'pointer' }}
                >
                  {l}
                  {sortField === f ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                </span>
              ))}
            </div>
            {obrasFiltradas.map((o, i) => (
              <div
                key={`${o.nombre}-${i}`}
                style={{
                  ...S.trow,
                  background: i % 2 === 0 ? 'transparent' : '#ffffff05',
                  borderBottom: '1px solid #2c5059',
                }}
              >
                <span
                  style={{
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {o.nombre}
                </span>
                <span style={{ color: '#b9c7c9' }}>{o.kwp} kWp</span>
                <span>
                  <EstadoBadge estado={o.estado} />
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div
                    style={{
                      width: 32,
                      height: 5,
                      background: '#2c5059',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${o.avance}%`,
                        height: 5,
                        background: '#4fc3f7',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 10, color: '#8fa6a9' }}>
                    {o.avance}%
                  </span>
                </div>
                <span>
                  {o.hs_mo_kwp != null ? (
                    <span
                      style={{
                        background: HsMoColor(o.hs_mo_kwp) + '22',
                        padding: '1px 7px',
                        borderRadius: 4,
                      }}
                    >
                      <HsLabel
                        value={Number(o.hs_mo_kwp).toFixed(2)}
                        color={HsMoColor(o.hs_mo_kwp)}
                      />
                    </span>
                  ) : (
                    <span style={{ color: '#55787f' }}>—</span>
                  )}
                </span>
                <span style={{ color: '#b9c7c9' }}>
                  {o.tipo_cliente || '—'}
                </span>
                <span>
                  <span
                    style={{
                      color: TIPO_COLORS[o.implantacion] || '#b9c7c9',
                      background:
                        (TIPO_COLORS[o.implantacion] || '#b9c7c9') + '22',
                      fontSize: 11,
                      padding: '1px 7px',
                      borderRadius: 4,
                    }}
                  >
                    {o.implantacion || '—'}
                  </span>
                </span>
                <span style={{ color: '#b9c7c9' }}>{o.estructura || '—'}</span>
              </div>
            ))}
            {obrasFiltradas.length > 0 && (
              <div
                style={{
                  ...S.trow,
                  background: '#16323a',
                  borderTop: '1px solid #3b5d65',
                  fontWeight: 700,
                }}
              >
                <span style={{ color: '#f4f8f8' }}>TOTAL / PROMEDIO</span>
                <span style={{ color: '#ffc933' }}>
                  {formatKwp(resumenTabla.totalKwpTabla)}
                </span>
                <span style={{ color: '#8fa6a9' }}>—</span>
                <span style={{ color: '#8fa6a9' }}>—</span>
                <span>
                  {resumenTabla.promedioHsTabla !== null ? (
                    <span
                      style={{
                        background:
                          HsMoColor(resumenTabla.promedioHsTabla) + '22',
                        padding: '1px 7px',
                        borderRadius: 4,
                      }}
                    >
                      <HsLabel
                        value={Number(resumenTabla.promedioHsTabla).toFixed(2)}
                        color={HsMoColor(resumenTabla.promedioHsTabla)}
                      />
                    </span>
                  ) : (
                    <span style={{ color: '#55787f' }}>—</span>
                  )}
                </span>
                <span style={{ color: '#8fa6a9' }}>—</span>
                <span style={{ color: '#8fa6a9' }}>—</span>
                <span style={{ color: '#8fa6a9' }}>—</span>
              </div>
            )}
            {obrasFiltradas.length === 0 && (
              <div
                style={{ textAlign: 'center', padding: 40, color: '#55787f' }}
              >
                Sin resultados
              </div>
            )}
          </div>

          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: '#3b5d65',
              paddingBottom: 16,
            }}
          >
            Panel de obras solares · Datos actualizados automáticamente cada 5
            minutos
          </div>
        </main>
      )}
    </div>
  );
}
