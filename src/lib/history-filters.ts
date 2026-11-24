import type { HistoryEntry } from "../types";

export interface HistoryFilterOption {
  value: string;
  label: string;
  search: string;
}

export function snapshotFields(entry: HistoryEntry): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of String(entry.detalle ?? entry.snapshot ?? "").split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      fields.set(
        line.slice(0, separator).trim().toLowerCase(),
        line.slice(separator + 1).trim(),
      );
    }
  }
  return fields;
}

/** Opciones de filtro tomadas de las instantáneas, no de equipos/operadores activos. */
export function historyFilterOptions(entries: HistoryEntry[]): {
  equipment: HistoryFilterOption[];
  operators: HistoryFilterOption[];
} {
  const equipment = new Map<string, string>();
  const operators = new Set<string>();
  for (const entry of entries) {
    const fields = snapshotFields(entry);
    const serial = fields.get("serial") ?? entry.serial;
    if (serial && serial !== "-") {
      const brandModel = [fields.get("marca"), fields.get("modelo")].filter(Boolean).join(" ");
      equipment.set(serial, brandModel ? `${brandModel} ${serial}` : entry.equipo || serial);
    }
    for (const name of [
      fields.get("operador"),
      fields.get("reportado por"),
      fields.get("operador original"),
      entry.operador,
    ]) {
      if (name && name !== "-") operators.add(name);
    }
  }
  const compare = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });
  return {
    equipment: [...equipment]
      .sort(([a], [b]) => compare(a, b))
      .map(([value, label]) => ({ value, label, search: value })),
    operators: [...operators]
      .sort(compare)
      .map((value) => ({ value, label: value, search: value })),
  };
}
