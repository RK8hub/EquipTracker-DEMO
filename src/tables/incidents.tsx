import { Tooltip, type DataTableColumn, type DataTableRow } from "../eq-ui";
import type { Equipment, Incident, Operator, User } from "../types";
import { equipmentLabel, formatDate, operatorLabel, userLabel } from "../lib/format";

export const incidentColumns: DataTableColumn[] = [
  { key: "equipo", header: "Equipo" },
  { key: "serial", header: "Serial" },
  { key: "tipo", header: "Tipo" },
  { key: "motivo", header: "Motivo" },
  { key: "reportado", header: "Reportado por" },
  { key: "tecnico", header: "Técnico" },
  { key: "fecha", header: "Fecha" },
];

export function incidentRow(
  incident: Incident,
  lookups: {
    equipmentById: Map<number, Equipment>;
    operatorById: Map<number, Operator>;
    userById: Map<number, User>;
  },
): DataTableRow {
  const equipment = lookups.equipmentById.get(incident.equipment_id);
  return {
    id: String(incident.id),
    equipo: equipmentLabel(equipment, incident.equipment_id),
    serial: equipment?.serial || "—",
    tipo: incident.type || "—",
    motivo: incident.reason ? (
      <Tooltip label={incident.reason} className="flex w-full">
        <span className="block w-full truncate">{incident.reason}</span>
      </Tooltip>
    ) : (
      "—"
    ),
    reportado: operatorLabel(
      lookups.operatorById.get(incident.reported_by),
      incident.reported_by,
    ),
    tecnico: userLabel(lookups.userById.get(incident.technician_id), incident.technician_id),
    fecha: formatDate(incident.created_at),
  };
}
