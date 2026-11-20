import { Monitor, Users, Wrench, FileSpreadsheet } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { Button, DataTable, DropdownButton, Header, InfoCard, type DataTableColumn, type DataTableRow } from "../eq-ui";
import { api, type Paged } from "../api/client";
import { errorMessage, useAsync, useScrollPreserve } from "../hooks";
import { displayName } from "../lib/format";
import { toMap } from "../lib/lookups";
import { assignmentColumns, assignmentRow } from "../tables/assignments";
import { incidentColumns, incidentRow } from "../tables/incidents";
import { ErrorState, Loading } from "../components/Feedback";
import { Page } from "../components/Page";
import type { Assignment, Equipment, Incident, Operator, Specs, User } from "../types";

type View = "assignments" | "operators" | "equipment" | "incidents";

const viewLabels: Record<View, string> = {
  assignments: "Asignaciones",
  operators: "Operadores",
  equipment: "Equipos",
  incidents: "Incidencias",
};

const PAGE_SIZE = 5;

export interface DashboardScreenProps {
  canExportCsv?: boolean;
}

export function DashboardScreen({ canExportCsv = true }: DashboardScreenProps) {
  const [view, setView] = useState<View>("assignments");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { capture: captureScroll, restore: restoreScroll } = useScrollPreserve();
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuId = useId();

  const { data, loading, error, reload } = useAsync(async () => {
    const query = { skip: page * PAGE_SIZE, limit: PAGE_SIZE, search };
    const [
      operators,
      equipment,
      specs,
      users,
      activeIncidents,
      equipmentCount,
      operatorsCount,
      activeAssignments,
      pageData,
    ] = await Promise.all([
      api.operators.list(0, 100),
      api.equipment.list(0, 100),
      api.specs.list(0, 100),
      api.users.technicians().catch(() => [] as User[]),
      api.incidents.paged({ status: "open", limit: 1 }),
      api.equipment.paged({ limit: 1 }),
      api.operators.paged({ limit: 1 }),
      api.assignments.paged({ status: "active", limit: 100 }),
      view === "assignments"
        ? api.assignments.paged(query)
        : view === "incidents"
          ? api.incidents.paged(query)
          : view === "equipment"
            ? api.equipment.paged(query)
            : api.operators.paged(query),
    ]);
    return {
      operators,
      equipment,
      specs,
      users,
      activeIncidents: activeIncidents.total,
      pageData: pageData as Paged<Assignment | Incident | Equipment | Operator>,
      equipmentTotal: equipmentCount.total,
      operatorsTotal: operatorsCount.total,
      activeAssignments,
    };
  }, [view, search, page]);

  useEffect(() => {
    setPage(0);
    setSelectedIds([]);
  }, [view, search]);
  useEffect(() => {
    restoreScroll();
  }, [page, restoreScroll]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!viewMenuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const operatorById = toMap(data.operators);
  const equipmentById = toMap(data.equipment);
  const specsById = toMap(data.specs);
  const userById = toMap(data.users);

  let columns: DataTableColumn[] = [];
  let rows: DataTableRow[] = [];

  if (view === "assignments") {
    columns = assignmentColumns;
    rows = (data.pageData.items as Assignment[]).map((assignment) =>
      assignmentRow(assignment, { equipmentById, operatorById, userById }),
    );
  } else if (view === "operators") {
    columns = [
      { key: "nombre", header: "Nombre" },
      { key: "departamento", header: "Departamento" },
      { key: "puesto", header: "Puesto" },
    ];
    rows = (data.pageData.items as Operator[]).map((operator) => ({
      id: String(operator.id),
      nombre: operator.name,
      departamento: operator.department,
      puesto: operator.position,
    }));
  } else if (view === "equipment") {
    columns = [
      { key: "equipo", header: "Equipo" },
      { key: "serial", header: "Serial" },
      { key: "cpu", header: "CPU" },
      { key: "ram", header: "RAM" },
      { key: "almacenamiento", header: "Almacenamiento" },
      { key: "graficos", header: "Graficos" },
      { key: "estado", header: "Estado" },
    ];
    const assigned = new Set(
      data.activeAssignments.items.map((assignment) => assignment.equipment_id),
    );
    rows = (data.pageData.items as Equipment[]).map((item) => {
      const spec = item.specs_id != null ? specsById.get(item.specs_id) : undefined;
      return {
        id: String(item.id),
        equipo: `${item.brand} ${item.model}`.trim() || "—",
        serial: item.serial || "—",
        cpu: spec ? `${spec.cpu.brand} ${spec.cpu.model}`.trim() || "—" : "—",
        ram: spec ? `${spec.ram.capacity.value} ${spec.ram.capacity.unit} ${spec.ram.mode}`.trim() || "—" : "—",
        almacenamiento: spec ? `${spec.storage.capacity.value} ${spec.storage.capacity.unit} ${spec.storage.type}`.trim() || "—" : "—",
        graficos: spec ? `${spec.graphics.brand} ${spec.graphics.model} (${spec.graphics.type})`.trim() || "—" : "—",
        estado: assigned.has(item.id) ? "Asignado" : "Disponible",
      };
    });
  } else {
    columns = incidentColumns;
    rows = (data.pageData.items as Incident[]).map((incident) =>
      incidentRow(incident, { equipmentById, operatorById, userById }),
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.pageData.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const handlePrev = () => {
    captureScroll();
    setPage((value) => Math.max(0, value - 1));
  };
  const handleNext = () => {
    captureScroll();
    setPage((value) => Math.min(totalPages - 1, value + 1));
  };

  async function exportCsv() {
    if (!canExportCsv) return;
    try {
      toast.info("Exportación en cola. Te avisaremos cuando esté lista.");
      const kind = view === "operators" ? "equipment" : view;
      const job = await api.exports.request(kind);
      const url = await api.exports.wait(job);
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = `${view}.csv`;
        link.click();
      }
      toast.success("Exportación completada");
    } catch (err) {
      const message = errorMessage(err);
      toast.error(
        message.includes("404")
          ? "La exportación por cola aún no está disponible en este servidor."
          : message,
      );
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <Page
        title="Dashboard"
        subtitle="Resumen del inventario y las asignaciones registradas."
      >
        <div className="flex flex-wrap items-center justify-center gap-16">
          <InfoCard
            icon={<Monitor aria-hidden="true" strokeWidth={1.5} className="size-8" />}
            quantity={data.equipmentTotal}
            label="Equipos"
          />
          <InfoCard
            icon={<Users aria-hidden="true" strokeWidth={1.5} className="size-8" />}
            quantity={data.operatorsTotal}
            label="Operadores"
          />
          <InfoCard
            icon={<Wrench aria-hidden="true" strokeWidth={1.5} className="size-8" />}
            quantity={data.activeIncidents}
            label="Incidencias activas"
          />
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          selectable
          allRowIds={rows.map((row) => row.id)}
          selectedIds={selectedIds}
          onPrevious={handlePrev}
          onNext={handleNext}
          onSelectedChange={setSelectedIds}
          toolbar={
            <Header
              variant="search"
              searchProps={{
                placeholder: "Buscar...",
                value: search,
                onChange: (event) => setSearch(event.target.value),
              }}
              right={
                <div className="flex items-center gap-2">
                  {canExportCsv && (
                    <Button
                      leftIcon={<FileSpreadsheet aria-hidden="true" strokeWidth={1.5} className="size-4" />}
                      showLeftIcon={true}
                      text="Exportar CSV"
                      onClick={exportCsv}
                    />
                  )}
                  <div ref={viewMenuRef} className="relative">
                    <DropdownButton
                      label={viewLabels[view]}
                      open={open}
                      aria-haspopup="menu"
                      aria-controls={open ? viewMenuId : undefined}
                      onClick={() => setOpen((value) => !value)}
                    />
                    {open && (
                      <div
                        id={viewMenuId}
                        role="menu"
                        className="absolute right-0 top-[46px] z-10 w-44 rounded-[8px] border border-stroke bg-object p-1 shadow-lg"
                      >
                        {(Object.keys(viewLabels) as View[]).map((option) => (
                          <button
                            key={option}
                            type="button"
                            role="menuitemradio"
                            aria-checked={option === view}
                            className="flex w-full cursor-pointer rounded-[6px] px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-border/60"
                            onClick={() => {
                              setView(option);
                              setOpen(false);
                            }}
                          >
                            {viewLabels[option]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              }
            />
          }
          summary={`${data.pageData.total} registros · pág. ${safePage + 1}/${totalPages}`}
        />
      </Page>
      <div className="flex-1" />
    </div>
  );
}
