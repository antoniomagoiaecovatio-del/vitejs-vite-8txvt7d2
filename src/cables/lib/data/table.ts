import type { BySection } from "./types";

/**
 * Convierte una tabla en filas [S, v1, v2, ...] a un mapa por columna.
 * `null` indica que el catálogo no tiene valor para esa combinación.
 */
export function columns<K extends string>(
  keys: readonly K[],
  rows: ReadonlyArray<ReadonlyArray<number | null>>,
): Record<K, BySection> {
  const out = {} as Record<K, BySection>;
  keys.forEach((k, i) => {
    const col: BySection = {};
    for (const row of rows) {
      const v = row[i + 1];
      if (v !== null && v !== undefined) col[row[0] as number] = v;
    }
    out[k] = col;
  });
  return out;
}

export const BCE_KEYS = ["B2_2c", "B2_3c", "C_2c", "C_3c", "E_2c", "E_3c"] as const;
export const FG_KEYS = ["F_2u", "F_3u_trebol", "F_3u_plano", "G_3u_horiz", "G_3u_vert"] as const;
export const D_KEYS = ["D1_2c", "D1_3c", "D2_3u", "D2_2c", "D2_3c"] as const;
