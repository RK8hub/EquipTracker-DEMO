import {
  BriefcaseBusiness,
  Building2,
  Laptop,
  UserRound,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn, DataTable, NavigationButton, Tooltip, type DataTableRow } from "../eq-ui";
import { api } from "../api/client";
import { useAsync } from "../hooks";
import { toMap } from "../lib/lookups";
import { ErrorState, ScreenSkeleton } from "../components/Feedback";
import { Page } from "../components/Page";
import {
  detailActivityColumns,
  detailAssignmentRow,
  detailIncidentRow,
} from "../tables/detail-activity";

export interface OperatorDetailProps {
  operatorId: number;
  onBack: () => void;
  canWrite?: boolean;
}

function detailLines(
  operator: { name: string; position?: string | null; department?: string | null },
  activeAssignments: number,
  openIncidents: number,
): { label: string; value: string; Icon: LucideIcon }[] {
  return [
    { label: "Nombre", value: operator.name, Icon: UserRound },
    { label: "Puesto", value: operator.position || "—", Icon: BriefcaseBusiness },
    { label: "Departamento", value: operator.department || "—", Icon: Building2 },
    { label: "Asignaciones", value: String(activeAssignments), Icon: Laptop },
    { label: "Incidencias", value: String(openIncidents), Icon: Wrench },
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

  if (loading && !data)
    return <ScreenSkeleton title="Operador" subtitle="Detalle del operador." variant="detail" />;
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
  const activityRows: DataTableRow[] = [
    ...assignmentsForOperator.map((assignment) =>
      detailAssignmentRow(assignment, { equipmentById, operatorById, userById }),
    ),
    ...incidentsForOperator.map((incident) =>
      detailIncidentRow(incident, { equipmentById, operatorById, userById }),
    ),
  ];

  const activeCount = assignmentsForOperator.filter(
    (assignment) => assignment.status === "active",
  ).length;
  const openIncidentCount = incidentsForOperator.filter(
    (incident) => incident.status === "open",
  ).length;

  return (
    <div className="flex min-h-full flex-col">
      <Page
        title={operator.name}
        subtitle={`Ficha del operador · ${operator.position || "sin puesto"} · ${operator.department || "sin departamento"}`}
        fluid
      >
        <div className="mb-6">
          <NavigationButton
            direction="previous"
            label="Volver a operadores"
            onClick={onBack}
          />
        </div>

        <section className="rounded-[24px] border border-stroke bg-card p-6">
          <h2 className="text-lg font-semibold">Datos</h2>
          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {detailLines(operator, activeCount, openIncidentCount).map(
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
                    <dd className="text-sm text-primary">
                      <Tooltip label={value} className="block w-full">
                        <span className="block w-full truncate">{value}</span>
                      </Tooltip>
                    </dd>
                  </div>
                </div>
              ),
            )}
          </dl>
        </section>

        <section className="mt-6">
          <DataTable
            columns={detailActivityColumns}
            rows={activityRows}
            selectable={false}
            showToolbar={false}
            summary={`${activityRows.length} registros de este operador`}
          />
        </section>
      </Page>
      <div className="flex-1" />
    </div>
  );
}
