import type { DataTableColumn, DataTableRow } from "../eq-ui";
import type { Assignment, Equipment, Incident, Operator, User } from "../types";
import { assignmentRow } from "./assignments";
import { incidentRow } from "./incidents";

export const detailActivityColumns: DataTableColumn[] = [
  { key: "origen", header: "Origen" },
  { key: "equipo", header: "Equipo" },
  { key: "serial", header: "Serial" },
  { key: "operador", header: "Operador" },
  { key: "detalle", header: "Detalle" },
  { key: "fecha", header: "Fecha" },
];

type Lookups = {
  equipmentById: Map<number, Equipment>;
  operatorById: Map<number, Operator>;
  userById: Map<number, User>;
};

export function detailAssignmentRow(assignment: Assignment, lookups: Lookups): DataTableRow {
  const row = assignmentRow(assignment, lookups);
  return {
    ...row,
    id: `asignacion-${assignment.id}`,
    origen: "Asignación",
    detalle: row.asignador,
  };
}

export function detailIncidentRow(incident: Incident, lookups: Lookups): DataTableRow {
  const row = incidentRow(incident, lookups);
  return {
    ...row,
    id: `incidencia-${incident.id}`,
    origen: "Incidencia",
    operador: row.reportado,
    detalle: (
      <>
        {row.tipo} · {row.motivo}
      </>
    ),
  };
}
