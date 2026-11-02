// Restricciones normativas y validaciones (electrical_rules_y_datos.md §8, §9 y §13).
import type { AcFamily } from "../data/types";
import type { Alert, CalcInputs } from "./types";

export function usesConduit(inp: CalcInputs): boolean {
  if (inp.side === "DC") return inp.dcInstallation === "PV_BURIED";
  return inp.routing === "cano" || inp.routing === "cano_enterrado";
}

export function isBuried(inp: CalcInputs): boolean {
  if (inp.side === "DC") return inp.dcInstallation === "PV_BURIED";
  return inp.routing === "cano_enterrado" || inp.routing === "enterrado";
}

export function isTray(inp: CalcInputs): boolean {
  return inp.side === "AC" && inp.routing.startsWith("bandeja");
}

/** Validaciones que no dependen de la familia de cable. */
export function globalAlerts(inp: CalcInputs, ib: number): Alert[] {
  const a: Alert[] = [];
  const bad = (code: string, message: string) => a.push({ level: "error", code, message });

  if (!(inp.lengthM > 0)) bad("ENTRADA", "La longitud del circuito debe ser mayor que 0.");
  if (!(inp.parallel >= 0 && inp.parallel <= 8)) bad("ENTRADA", "Conductores en paralelo por polo: automático o entre 1 y 8.");
  if (!(inp.circuits >= 1)) bad("ENTRADA", "La cantidad de circuitos agrupados debe ser al menos 1.");

  if (inp.side === "AC") {
    if (!(inp.voltage > 0)) bad("ENTRADA", "La tensión debe ser mayor que 0.");
    if (!(inp.cosPhi > 0 && inp.cosPhi <= 1)) bad("ENTRADA", "El factor de potencia debe estar entre 0 y 1.");
    if (!(ib > 0)) bad("ENTRADA", "Ingrese una potencia o corriente mayor que 0.");
    if (inp.circuitType === "inversor" && !(inp.serviceFactor >= 1)) {
      bad("ENTRADA", "El factor de servicio continuo del inversor debe ser ≥ 1.");
    }
  } else {
    if (!(inp.iscStc > 0)) bad("ENTRADA", "Ingrese la I_sc CEN del módulo.");
    if (!(inp.impStc > 0)) bad("ENTRADA", "Ingrese la I_mp CEN del módulo.");
    if (inp.impStc > inp.iscStc) bad("ENTRADA", "I_mp no puede ser mayor que I_sc.");
    if (!(inp.vmpString > 0)) bad("ENTRADA", "Ingrese la tensión V_mp de la cadena.");
    if (inp.dcRole === "principal" && !(inp.nStrings >= 1)) bad("ENTRADA", "N.º de cadenas en paralelo ≥ 1.");
    if (inp.family !== "solar" && inp.family !== "auto") {
      bad(
        "ERR-05",
        "CC FV: obligatorio cable H1Z2Z2-K (IRAM 62930) con doble aislación (AEA 712.413.2). Los cables de CA no están admitidos en el campo solar de CC.",
      );
    }
  }

  if (usesConduit(inp) && inp.conduit === "corrugado_naranja") {
    bad("ERR-01", "AEA: caño corrugado naranja prohibido (no autoextinguible, propagante de llama).");
  }

  if (inp.side === "AC" && inp.ikKa <= 0) {
    a.push({
      level: "warning",
      code: "CC-NV",
      message: "Cortocircuito no verificado: ingrese la I″k máxima del tablero para verificar el poder de corte y el esfuerzo térmico (k²S² ≥ I²t).",
    });
  }
  if (inp.side === "AC" && inp.circuitType === "inversor") {
    a.push({
      level: "info",
      code: "INV",
      message:
        inp.serviceFactor > 1
          ? `Salida de inversor: corriente de diseño = ${inp.serviceFactor.toLocaleString("es-AR")} × I_B (margen propio, no exigido por AEA/IEC). Con la I máx. de salida del manual alcanza con factor 1.`
          : "Salida de inversor: I_B = corriente máxima de salida del manual (peor caso: potencia máxima a tensión mínima).",
    });
  }
  if (inp.side === "DC") {
    a.push({
      level: "info",
      code: "CND-01",
      message: "CC FV: cable IRAM 62930 con doble aislación / Clase II (AEA 712.413.2).",
    });
  }
  if (usesConduit(inp)) {
    a.push({ level: "info", code: "WRN-02", message: "Prohibidas uniones o empalmes dentro de los caños. Respetar el factor de ocupación." });
  }
  if (isTray(inp)) {
    a.push({ level: "info", code: "WRN-03", message: "En bandeja, los cables deben cumplir IRAM NM IEC 60332-3 (no propagación del incendio)." });
  }
  if (isBuried(inp)) {
    a.push({
      level: "info",
      code: "WRN-01",
      message: "Enterrado: con tramos con agua o trayectos en «U», es obligatorio caño sintético o metálico con cable IRAM 2178-1 / 62266.",
    });
    a.push({
      level: "info",
      code: "FA-REF",
      message: "El factor de agrupamiento para enterrados es un valor IEC de referencia (no incluido en los datos AEA disponibles).",
    });
  }
  if (inp.side === "DC" && inp.dcInstallation === "PV_BURIED") {
    a.push({
      level: "warning",
      code: "PV-ENT",
      message: "Sin dato de catálogo para cable solar enterrado — verificar con el datasheet del proveedor. Se usa la columna «dos cables en contacto sobre superficie» corregida por temperatura y resistividad del terreno.",
    });
  }
  return a;
}

/** Validaciones que dependen de la familia de cable de CA. */
export function acFamilyAlerts(inp: CalcInputs, fam: AcFamily): Alert[] {
  const a: Alert[] = [];
  if (inp.location === "publica" && (fam.insulation === "PVC" || fam.jacket === "PVC")) {
    a.push({
      level: "error",
      code: "ERR-03",
      message: `${fam.name} (${fam.jacket === "PVC" ? "envoltura" : "aislación"} de PVC) prohibido en locales de pública concurrencia: usar cable LSOH IRAM 62266.`,
    });
  }
  if (isTray(inp) && !fam.hasJacket) {
    a.push({ level: "error", code: "ERR-02", message: "AEA: unipolar sin cubierta prohibido en bandeja." });
  }
  if (isBuried(inp) && !fam.hasJacket) {
    a.push({ level: "error", code: "ERR-04", message: "Enterrado: obligatorio cable con cubierta 0,6/1 kV (IRAM 2178-1 / 62266)." });
  }
  if (inp.environment === "intemperie" && fam.jacket === "PVC") {
    a.push({
      level: "warning",
      code: "ERR-06",
      message: `${fam.name} a la intemperie: verificar envoltura resistente a UV (negra) o usar canalización opaca. Prohibido PVC estándar expuesto al sol.`,
    });
  }
  return a;
}
