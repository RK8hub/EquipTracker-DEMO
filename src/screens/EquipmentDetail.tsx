import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Cpu,
  FileSpreadsheet,
  HardDrive,
  MemoryStick,
  MonitorCog,
  type LucideIcon,
} from "lucide-react";
import {
  Button,
  cn,
  DataTable,
  type DataTableColumn,
  type DataTableRow,
} from "../eq-ui";
import { api } from "../api/client";
import { errorMessage, useAsync } from "../hooks";
import { toMap } from "../lib/lookups";
import { ErrorState, Loading } from "../components/Feedback";
import { Page } from "../components/Page";
import { IncidentFormModal } from "../components/IncidentFormModal";
import { assignmentColumns, assignmentRow } from "../tables/assignments";
import { incidentColumns, incidentRow } from "../tables/incidents";
import type { Specs } from "../types";

export interface EquipmentDetailProps {
  equipmentId: number;
  onBack: () => void;
  canWrite?: boolean;
  historyNotice?: string;
}

function specLines(spec: Specs | null): { label: string; value: string; Icon: LucideIcon }[] {
  if (!spec) return [];
  return [
    { label: "CPU", value: `${spec.cpu.brand} ${spec.cpu.model}`.trim(), Icon: Cpu },
    {
      label: "RAM",
      value: `${spec.ram.capacity.value} ${spec.ram.capacity.unit} · ${spec.ram.mode}`,
      Icon: MemoryStick,
    },
    {
      label: "Almacenamiento",
      value: `${spec.storage.capacity.value} ${spec.storage.capacity.unit} · ${spec.storage.type}`,
      Icon: HardDrive,
    },
    {
      label: "Gráficos",
      value: `${spec.graphics.brand} ${spec.graphics.model} · ${spec.graphics.type}`,
      Icon: MonitorCog,
    },
  ];
}

export function EquipmentDetailScreen({
  equipmentId,
  onBack,
  canWrite = true,
  historyNotice,
}: EquipmentDetailProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const equipment = await api.equipment.get(equipmentId);
    const [spec, operators, users, assignments, incidents] = await Promise.all([
      equipment.specs_id ? api.specs.get(equipment.specs_id).catch(() => null) : Promise.resolve(null),
      api.operators.list(0, 100),
      api.users.technicians().catch(() => []),
      api.assignments.paged({ serial: equipment.serial, limit: 100 }),
      api.incidents.paged({ serial: equipment.serial, limit: 100 }),
    ]);
    return { equipment, spec, operators, users, assignments, incidents };
  }, [equipmentId]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const lines = specLines(data.spec);
  const operatorById = toMap(data.operators);
  const equipmentById = toMap([data.equipment]);
  const userById = toMap(data.users);

  // El filtro por serial va al servidor; este filtro local cubre versiones que lo ignoran.
  const assignmentsForEquipment = data.assignments.items.filter(
    (assignment) => assignment.equipment_id === equipmentId,
  );
  const incidentsForEquipment = data.incidents.items.filter(
    (incident) => incident.equipment_id === equipmentId,
  );
  const assignmentRows: DataTableRow[] = assignmentsForEquipment.map((assignment) =>
    assignmentRow(assignment, { equipmentById, operatorById, userById }),
  );
  const incidentColumnsWithAction: DataTableColumn[] = canWrite
    ? [...incidentColumns, { key: "accion", header: "Acción", className: "justify-center" }]
    : incidentColumns;
  const incidentRows: DataTableRow[] = incidentsForEquipment.map((incident) => ({
    ...incidentRow(incident, { equipmentById, operatorById, userById }),
    ...(canWrite
      ? {
          accion:
            incident.status === "open" ? (
              <Button
                text="Cerrar"
                variant="ghost"
                className="h-8 px-3"
                disabled={busy}
                onClick={() => closeIncident(incident.id)}
              />
            ) : (
              "—"
            ),
        }
      : {}),
  }));

  async function closeIncident(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await api.incidents.update(id, {
        status: "closed",
        resolved_at: new Date().toISOString(),
      });
      toast.success("Incidencia cerrada");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Page
        title={`${data.equipment.brand} ${data.equipment.model}`.trim()}
        subtitle={`Ficha del equipo · ${data.equipment.serial || "sin serial"}`}
        fluid
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button
            text="Volver a equipos"
            variant="ghost"
            leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
            showLeftIcon
            onClick={onBack}
          />
          {canWrite && (
            <Button
              text="Reportar incidencia"
              variant="primary"
              leftIcon={<FileSpreadsheet aria-hidden="true" className="size-4" />}
              showLeftIcon
              onClick={() => setFormOpen(true)}
            />
          )}
        </div>

        <section className="rounded-[24px] border border-stroke bg-card p-6">
          <h2 className="text-lg font-semibold">Especificaciones</h2>
          {lines.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Este equipo no tiene especificaciones registradas.
            </p>
          ) : (
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {lines.map(({ label, value, Icon }, index) => (
                <div key={label} className="flex min-w-0 items-center gap-3">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "hidden text-2xl font-light leading-none text-stroke",
                        index === 2 ? "lg:block" : "sm:block",
                      )}
                    >
                      |
                    </span>
                  )}
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-stroke bg-object text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="truncate text-sm text-primary" title={value || undefined}>
                      {value || "—"}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          )}
        </section>

        <section className="mt-6">
          <DataTable
            columns={assignmentColumns}
            rows={assignmentRows}
            selectable={false}
            showToolbar={false}
            summary={`${assignmentRows.length} asignaciones de este serial`}
          />
        </section>

        <section className="mt-6">
          <DataTable
            columns={incidentColumnsWithAction}
            rows={incidentRows}
            selectable={false}
            showToolbar={false}
            summary={`${incidentRows.length} incidencias de este serial`}
          />
        </section>

        {historyNotice && (
          <p className="mt-6 text-xs text-muted-foreground">{historyNotice}</p>
        )}

        {formOpen && (
          <IncidentFormModal
            equipment={[data.equipment]}
            operators={data.operators}
            assignments={assignmentsForEquipment}
            users={data.users}
            equipmentId={data.equipment.id}
            onClose={() => setFormOpen(false)}
            onCreated={reload}
          />
        )}
      </Page>
      <div className="flex-1" />
    </div>
  );
}
