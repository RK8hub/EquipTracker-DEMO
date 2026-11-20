import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  FileSpreadsheet,
  Laptop,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button, cn, DataTable, type DataTableRow } from "../eq-ui";
import { api } from "../api/client";
import { useAsync } from "../hooks";
import { toMap } from "../lib/lookups";
import { equipmentLabel, formatDate } from "../lib/format";
import { ErrorState, Loading } from "../components/Feedback";
import { Page } from "../components/Page";
import { assignmentColumns, assignmentRow } from "../tables/assignments";
import { incidentColumns, incidentRow } from "../tables/incidents";

export interface OperatorDetailProps {
  operatorId: number;
  onBack: () => void;
  canWrite?: boolean;
}

function detailLines(
  operator: { name: string; position?: string | null; department?: string | null },
  assignments: number,
  active: number,
  incidents: number,
): { label: string; value: string; Icon: LucideIcon }[] {
  return [
    { label: "Nombre", value: operator.name, Icon: UserRound },
    { label: "Puesto", value: operator.position || "—", Icon: BriefcaseBusiness },
    { label: "Departamento", value: operator.department || "—", Icon: Building2 },
    { label: "Asignaciones", value: `${assignments} (${active} activas)`, Icon: Laptop },
    { label: "Incidencias", value: String(incidents), Icon: FileSpreadsheet },
  ];
}

export function OperatorDetailScreen({ operatorId, onBack }: OperatorDetailProps) {
  // shortcut: se cargan hasta 100 filas por entidad; usar paged por operador si crece el volumen.
  const { data, loading, error, reload } = useAsync(async () => {
    const [operators, assignments, incidents, equipment, users] = await Promise.all([
      api.operators.list(0, 100),
      api.assignments.list(0, 100),
      api.incidents.list(0, 100),
      api.equipment.list(0, 100),
      api.users.list(),
    ]);
    return { operators, assignments, incidents, equipment, users };
  }, [operatorId]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const operator = data.operators.find((item) => item.id === operatorId);
  if (!operator) return <ErrorState message="El operador ya no existe." onRetry={reload} />;

  const operatorById = toMap(data.operators);
  const equipmentById = toMap(data.equipment);
  const userById = toMap(data.users);

  const assignmentsForOperator = data.assignments.filter(
    (assignment) => assignment.operator_id === operatorId,
  );
  const incidentsForOperator = data.incidents.filter(
    (incident) =>
      incident.reported_by === operatorId || incident.reported_by_original === operatorId,
  );
  const assignmentRows: DataTableRow[] = assignmentsForOperator.map((assignment) =>
    assignmentRow(assignment, { equipmentById, operatorById, userById }),
  );
  const incidentRows: DataTableRow[] = incidentsForOperator.map((incident) =>
    incidentRow(incident, { equipmentById, operatorById, userById }),
  );

  const activity = [
    ...assignmentsForOperator.map((assignment) => ({
      id: `asignacion-${assignment.id}`,
      date: assignment.returned_at ?? assignment.assigned_at,
      label: assignment.status === "active" ? "Asignación entregada" : "Asignación devuelta",
      detail: equipmentLabel(equipmentById.get(assignment.equipment_id), assignment.equipment_id),
    })),
    ...incidentsForOperator.map((incident) => ({
      id: `incidencia-${incident.id}`,
      date: incident.resolved_at ?? incident.created_at,
      label: incident.status === "open" ? "Incidencia reportada" : "Incidencia cerrada",
      detail: `${incident.type || "Incidencia"} · ${equipmentLabel(equipmentById.get(incident.equipment_id), incident.equipment_id)}`,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  const activeCount = assignmentsForOperator.filter(
    (assignment) => assignment.status === "active",
  ).length;

  return (
    <div className="flex min-h-full flex-col">
      <Page
        title={operator.name}
        subtitle={`Ficha del operador · ${operator.position || "sin puesto"} · ${operator.department || "sin departamento"}`}
        fluid
      >
        <div className="mb-6">
          <Button
            text="Volver a operadores"
            variant="ghost"
            leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
            showLeftIcon
            onClick={onBack}
          />
        </div>

        <section className="rounded-[24px] border border-stroke bg-card p-6">
          <h2 className="text-lg font-semibold">Datos</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {detailLines(operator, assignmentRows.length, activeCount, incidentRows.length).map(
              ({ label, value, Icon }, index) => (
                <div key={label} className="flex min-w-0 items-center gap-3">
                  {index > 0 && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "hidden text-2xl font-light leading-none text-stroke",
                        index === 2 || index === 4 ? "lg:block" : "sm:block",
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
                    <dd className="truncate text-sm text-primary" title={value}>
                      {value}
                    </dd>
                  </div>
                </div>
              ),
            )}
          </dl>
        </section>

        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ClipboardList aria-hidden="true" className="size-5 text-primary" />
            Asignaciones
          </h2>
          <DataTable
            columns={assignmentColumns}
            rows={assignmentRows}
            selectable={false}
            showToolbar={false}
            summary={`${assignmentRows.length} asignaciones de este operador`}
          />
        </section>

        <section className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <FileSpreadsheet aria-hidden="true" className="size-5 text-primary" />
            Incidencias
          </h2>
          <DataTable
            columns={incidentColumns}
            rows={incidentRows}
            selectable={false}
            showToolbar={false}
            summary={`${incidentRows.length} incidencias reportadas por este operador`}
          />
        </section>

        <section className="mt-6 rounded-[24px] border border-stroke bg-card p-6">
          <h2 className="text-lg font-semibold">Historial reciente</h2>
          {activity.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Sin actividad reciente registrada para este operador.
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {activity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stroke pb-2 text-sm last:border-0 last:pb-0"
                >
                  <span>
                    {entry.label} · {entry.detail}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Page>
      <div className="flex-1" />
    </div>
  );
}
