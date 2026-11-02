// Contenido (textos y datos) del informe PDF: lenguaje simple, sin jerga innecesaria.
import { CIRCUITS } from "../engine/calc";
import { isBuried, usesConduit } from "../engine/rules";
import type { CalcInputs, CalcResult } from "../engine/types";
import { n } from "./steps";

const ROUTING: Record<string, string> = {
  cano: "Caño embutido o a la vista",
  bandeja_perforada: "Bandeja perforada",
  bandeja_escalera: "Bandeja escalera / canasta",
  bandeja_ciega: "Bandeja no perforada",
  cano_enterrado: "Caño enterrado",
  enterrado: "Directamente enterrado",
};
const DC_INSTALL: Record<string, string> = {
  PV_SURF2: "Sobre superficie, + y − juntos",
  PV_SURF1: "Sobre superficie, cable único",
  PV_AIR: "Al aire, suspendido",
  PV_BURIED: "En caño enterrado",
};
const CONDUIT: Record<string, string> = {
  rigido: "Sintético rígido",
  corrugado_autoext: "Corrugado autoextinguible",
  metalico: "Metálico",
  corrugado_naranja: "Corrugado naranja",
};
const UNI_ARR: Record<string, string> = {
  trebol: "en trébol",
  plano: "en plano",
  sep_horiz: "separados, horizontal",
  sep_vert: "separados, vertical",
  plano_sep: "en plano, separados",
};
const FAMILY: Record<string, string> = {
  auto: "Automática (según norma y ambiente)",
  pvc: "PVC / PVC",
  xlpe: "XLPE / PVC",
  lsoh: "XLPE / LSOH",
};

export type Fila = [string, string];
export interface Grupo {
  titulo: string;
  filas: Fila[];
}

/** Datos de partida: dos bloques (qué se alimenta / cómo se instala) y una franja de condiciones. */
export function datosPartida(res: CalcResult, i: CalcInputs): { a: Grupo; b: Grupo; franja: Fila[] } {
  const par = res.parallel;
  const paralelo = par > 1 ? `${par} por ${i.side === "DC" ? "polo" : "fase"}${res.parallelAuto ? " (automático)" : ""}` : "1 (sin paralelo)";

  if (i.side === "DC") {
    return {
      a: {
        titulo: "Los paneles",
        filas: [
          ["Cable", i.dcRole === "string" ? "De cadena (string)" : `Principal de CC (${i.nStrings} strings)`],
          ["Corriente de cortocircuito", `${n(i.iscStc, 2)} A`],
          ["Corriente de trabajo", `${n(i.impStc, 2)} A`],
          ["Tensión del string", `${n(i.vmpString, 0)} V`],
          ["Strings por entrada de caja", String(i.stringsAtCombiner)],
          ["Fusible máximo del panel", i.moduleMaxFuse > 0 ? `${n(i.moduleMaxFuse, 0)} A` : "sin dato"],
        ],
      },
      b: {
        titulo: "Cómo se instala",
        filas: [
          ["Instalación", DC_INSTALL[i.dcInstallation] ?? i.dcInstallation],
          ["Distancia (un sentido)", `${n(i.lengthM, 0)} m`],
          ["Cables en paralelo", paralelo],
          ["Circuitos en el mismo recorrido", String(i.circuits)],
          ["Tipo de cable", "Solar H1Z2Z2-K"],
        ],
      },
      franja: [
        ["Temperatura ambiente", `${n(i.ambientTemp, 0)} °C${i.solarDelta ? ` (+${n(i.solarDelta, 0)} °C sol)` : ""}`],
        ["Ambiente", i.environment === "intemperie" ? "Intemperie" : "Interior"],
        ["Caída de tensión máx.", `${n(res.duLimitPct, 1)} %`],
        ["Cortocircuito", "No aplica en CC"],
      ],
    };
  }

  const buried = isBuried(i);
  const carga = i.loadMode === "power" ? `${n(i.powerKw, 2)} kW` : `${n(i.current, 2)} A`;
  return {
    a: {
      titulo: "Qué se alimenta",
      filas: [
        [
          "Instalación",
          `${i.phase === "mono" ? "Monofásica" : "Trifásica"} · ${n(i.voltage, 0)} V${i.phase === "tri" ? (i.withNeutral ? " · con neutro" : " · sin neutro") : ""}`,
        ],
        ["Carga", `${carga} · cos φ ${n(i.cosPhi, 2)}`],
        ["Uso del circuito", CIRCUITS[i.circuitType].label],
        ["Material del cable", i.material === "Cu" ? "Cobre" : "Aluminio"],
        ["Aislación pedida", FAMILY[i.family] ?? i.family],
      ],
    },
    b: {
      titulo: "Cómo se instala",
      filas: [
        ["Canalización", ROUTING[i.routing] ?? i.routing],
        [
          "Tipo de cable",
          i.cableForm === "multi"
            ? "Multipolar"
            : `Unipolares${/bandeja_(perforada|escalera)/.test(i.routing) ? " " + (UNI_ARR[i.uniArrangement] ?? "") : i.routing === "enterrado" ? " " + (UNI_ARR[i.buriedArrangement] ?? "") : ""}`,
        ],
        ["Distancia (un sentido)", `${n(i.lengthM, 0)} m`],
        ...(usesConduit(i) ? ([["Tipo de caño", CONDUIT[i.conduit] ?? i.conduit]] as Fila[]) : []),
        ["Circuitos en el mismo recorrido", String(i.circuits)],
        ["Cables en paralelo", paralelo],
      ],
    },
    franja: [
      buried
        ? ["Terreno", `${n(i.groundTemp, 0)} °C · ${n(i.soilRho, 1)} K·m/W`]
        : ["Temperatura ambiente", `${n(i.ambientTemp, 0)} °C`],
      ["Local y ambiente", `${i.location === "publica" ? "Pública concurrencia" : "Estándar"} · ${i.environment === "intemperie" ? "Intemperie" : "Interior"}`],
      ["Caída de tensión máx.", `${n(res.duLimitPct, 1)} % ${i.duLimitOverride > 0 ? "(proyecto)" : "(reglamento)"}`],
      ["Cortocircuito", i.ikKa > 0 ? `${n(i.ikKa, 1)} kA · ${n(i.tScS, 2)} s` : "No verificado"],
    ],
  };
}

export const PROT_LABEL: Record<string, string> = {
  Tipo: "Tipo de protección",
  "Corriente nominal (I_n) o regulación térmica (I_r)": "Corriente nominal",
  "Valores normalizados en el rango": "Valores comerciales posibles",
  Polos: "Polos",
  "Tensión nominal de empleo": "Tensión de trabajo",
  "Poder de corte": "Poder de corte",
  "Norma del interruptor": "Norma",
};

export type ClavePaso = "corriente" | "minima" | "metodo" | "factores" | "ampacidad" | "caida" | "cortocircuito" | "final";

export const claveDe = (titulo: string): ClavePaso =>
  /^Corriente de (diseño|proyecto)/.test(titulo)
    ? "corriente"
    : /^Sección mínima/.test(titulo)
      ? "minima"
      : /^Método de instalación/.test(titulo)
        ? "metodo"
        : /^Factores/.test(titulo)
          ? "factores"
          : /^Verificación por ampacidad/.test(titulo)
            ? "ampacidad"
            : /^Caída de tensión/.test(titulo)
              ? "caida"
              : /^Cortocircuito/.test(titulo)
                ? "cortocircuito"
                : "final";

/** Cada paso del cálculo explicado en una pregunta y una o dos frases. */
export function explicacion(key: ClavePaso, res: CalcResult, i: CalcInputs): { pregunta: string; texto: string } {
  const dc = i.side === "DC";
  switch (key) {
    case "corriente":
      return dc
        ? {
            pregunta: "¿Qué corriente tiene que soportar el cable?",
            texto: "En una instalación solar el cable debe soportar un 25 % más que la corriente de cortocircuito de los paneles (AEA 90364-7-712).",
          }
        : {
            pregunta: "¿Cuánta corriente va a circular?",
            texto: "Es la corriente que consume la carga. Se calcula con la potencia, la tensión de la red y el factor de potencia (cos φ).",
          };
    case "minima":
      return {
        pregunta: "¿Cuál es el cable más fino que permite el reglamento?",
        texto: dc
          ? "El cable solar de este catálogo se fabrica desde 4 mm²: es la menor sección que se evalúa."
          : "Aunque la corriente sea baja, el reglamento no permite cables demasiado finos. El mínimo depende del uso del circuito.",
      };
    case "metodo":
      return {
        pregunta: "¿Cuánta corriente aguanta el cable en condiciones ideales?",
        texto: "Cada fabricante publica la capacidad base del cable según cómo se instale (en caño, en bandeja, enterrado).",
      };
    case "factores":
      return {
        pregunta: "¿Cómo cambia esa capacidad en la instalación real?",
        texto: "La capacidad baja con el calor, con varios cables juntos o con un terreno que disipa mal el calor. Se corrige con tres factores que se multiplican.",
      };
    case "ampacidad":
      return {
        pregunta: "¿El cable aguanta la corriente del circuito?",
        texto: "La capacidad corregida del cable (I_z) tiene que ser igual o mayor que la corriente que va a circular.",
      };
    case "caida":
      return {
        pregunta: "¿Cuánta tensión se pierde en el cable?",
        texto: `Cuanto más largo es el cable y más corriente lleva, más tensión se pierde en el camino. El máximo admitido acá es ${n(res.duLimitPct, 1)} %.`,
      };
    case "cortocircuito":
      return {
        pregunta: "¿El cable resiste un cortocircuito?",
        texto: "Ante un cortocircuito el cable se calienta muy rápido: la sección debe resistirlo hasta que la protección actúe.",
      };
    default:
      return {
        pregunta: "¿Qué cable se elige finalmente?",
        texto: dc
          ? "Se prueban las secciones de menor a mayor y se elige la primera que cumple todo a la vez."
          : "Se elige la menor sección que cumple todo a la vez y que permite un interruptor termomagnético comercial adecuado.",
      };
  }
}
