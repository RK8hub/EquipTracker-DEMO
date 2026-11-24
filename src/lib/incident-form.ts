import type { Assignment } from "../types";

/** Conserva el equipo fijo de la ficha; sin ficha, autocompleta si el operador tiene una sola asignación. */
export function equipmentForReporter(
  assignments: Assignment[],
  reporterId: string,
  currentEquipmentId: string,
  fixedEquipmentId?: number,
): string {
  if (fixedEquipmentId !== undefined) return currentEquipmentId;
  const ids = assignments
    .filter(
      (item) => item.status === "active" && item.operator_id === Number(reporterId),
    )
    .map((item) => item.equipment_id);
  if (currentEquipmentId && ids.includes(Number(currentEquipmentId))) {
    return currentEquipmentId;
  }
  return ids.length === 1 ? String(ids[0]) : "";
}
