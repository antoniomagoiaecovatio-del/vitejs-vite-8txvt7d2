// Cable 0,6/1 kV aislación XLPE 90 °C / envoltura LSOH, IRAM 62266. Solo cobre.
// Valores de referencia: catálogo AFX (ver docs/electrical_rules_y_datos.md).
// R' a 90 °C y 50 Hz; ampacidades a 40 °C (aire) / 25 °C y 1,0 K·m/W (enterrado).
import type { AcFamily, DataNote, RxTable } from "./types";
import { D_KEYS, FG_KEYS, columns } from "./table";
import { xlpeCuBCE } from "./xlpe";

// Erratas: 6 mm² R' = «2,44» → 4,2; 35 mm² X' = «1,150» → 0,150.
const cuUni: RxTable = {
  1.5: [17.2, 0.21],
  2.5: [10.2, 0.199],
  4: [6.3, 0.189],
  6: [4.2, 0.18],
  10: [2.44, 0.17],
  16: [1.54, 0.162],
  25: [0.995, 0.154],
  35: [0.707, 0.15],
  50: [0.493, 0.149],
  70: [0.347, 0.148],
  95: [0.264, 0.145],
  120: [0.207, 0.143],
  150: [0.166, 0.143],
  185: [0.137, 0.142],
  240: [0.105, 0.14],
  300: [0.078, 0.139],
};

const cuBi: RxTable = {
  1.5: [17.2, 0.107],
  2.5: [10.2, 0.0957],
  4: [6.3, 0.0896],
  6: [4.2, 0.0851],
  10: [2.44, 0.0798],
  16: [1.54, 0.0761],
};

const cuTri: RxTable = {
  1.5: [17.0, 0.103],
  2.5: [10.2, 0.0957],
  4: [6.3, 0.0896],
  6: [4.2, 0.085],
  10: [2.44, 0.0798],
  16: [1.54, 0.0761],
  25: [0.995, 0.0746],
  35: [0.707, 0.0726],
  50: [0.493, 0.0718],
  70: [0.341, 0.0716],
  95: [0.246, 0.07],
  120: [0.195, 0.0697],
  150: [0.158, 0.0704],
  185: [0.126, 0.0704],
  240: [0.0961, 0.0697],
};

// Tetrapolar (AFX p.4): igual R' que el tripolar, X' 8–12 % mayor.
const cuTetra: RxTable = {
  1.5: [17.0, 0.114],
  2.5: [10.2, 0.103],
  4: [6.3, 0.0969],
  6: [4.2, 0.0924],
  10: [2.44, 0.0871],
  16: [1.54, 0.0834],
  25: [0.995, 0.0819],
  35: [0.707, 0.0799],
  50: [0.493, 0.0789],
  70: [0.341, 0.079],
  95: [0.246, 0.0773],
  120: [0.195, 0.077],
  150: [0.158, 0.0774],
  185: [0.126, 0.0777],
  240: [0.0961, 0.0771],
};

// B2/C/E: igual a la tabla XLPE/PVC salvo la fila de 50 mm² (AFX p.5).
const cuBCE = Object.fromEntries(
  Object.entries(xlpeCuBCE).map(([k, col]) => [k, { ...col }]),
) as typeof xlpeCuBCE;
const row50 = { B2_2c: 151, B2_3c: 133, C_2c: 181, C_3c: 155, E_2c: 195, E_3c: 166 } as const;
for (const [k, v] of Object.entries(row50)) cuBCE[k as keyof typeof row50][50] = v;

// F/G: la fila de 300 mm² del catálogo es copia de la tabla XLPE/PVC → se ajusta
// como LSOH 240 × (XLPE 300 / XLPE 240), redondeado hacia abajo (§4.13).
const cuFG = columns(FG_KEYS, [
  [25, 140, 117, 122, 158, 140],
  [35, 173, 146, 152, 196, 174],
  [50, 209, 179, 187, 238, 213],
  [70, 268, 232, 241, 305, 275],
  [95, 326, 283, 295, 371, 336],
  [120, 378, 332, 346, 432, 392],
  [150, 436, 384, 401, 499, 456],
  [185, 497, 441, 461, 572, 523],
  [240, 587, 524, 548, 675, 621],
  [300, 677, 607, 636, 779, 719],
]);

const cuD = columns(D_KEYS, [
  [1.5, 28, 24, 32, 32, 28],
  [2.5, 37, 31, 43, 44, 37],
  [4, 48, 40, 53, 57, 48],
  [6, 60, 49, 67, 72, 61],
  [10, 79, 66, 89, 97, 83],
  [16, 101, 85, 115, 128, 107],
  [25, 130, 108, 149, 166, 141],
  [35, 157, 131, 180, 200, 168],
  [50, 186, 155, 219, 238, 199],
  [70, 241, 202, 266, 307, 256],
  [95, 285, 239, 311, 369, 308],
  [120, 325, 272, 360, 420, 351],
  [150, 367, 307, 403, 472, 393],
  [185, 411, 344, 449, 535, 447],
  [240, 475, 398, 527, 623, 519],
  [300, 537, 449, 624, 704, 586],
]);

const fg300: DataNote[] = [
  {
    section: 300,
    text: "Dato ajustado: la fila de 300 mm² del catálogo de referencia presenta una errata; se usa un valor proporcional conservador. Verificar con el datasheet del proveedor.",
  },
];

export const cableLsoh: AcFamily = {
  id: "lsoh",
  name: "Cable 0,6/1 kV XLPE/LSOH",
  norma: "IRAM 62266 (0,6/1 kV)",
  covering: "Aislación XLPE 90 °C · envoltura poliolefina LSOH (libre de halógenos, baja emisión de humos)",
  insulation: "XLPE",
  jacket: "LSOH",
  halogenFree: true,
  hasJacket: true,
  thetaMax: 90,
  thetaSc: 250,
  materials: ["Cu"],
  rx: { Cu: { uni: cuUni, bi: cuBi, tri: cuTri, tetra: cuTetra } },
  ampacity: { Cu: { ...cuBCE, ...cuFG, ...cuD } },
  ampacityNotes: {
    Cu: {
      F_2u: fg300,
      F_3u_trebol: fg300,
      F_3u_plano: fg300,
      G_3u_horiz: fg300,
      G_3u_vert: fg300,
    },
  },
  source: "AFX",
};
