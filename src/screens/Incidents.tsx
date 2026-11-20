import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, DataTable, Header, SelectField, Textfield, type DataTableColumn, type DataTableRow } from "../eq-ui";
import { SortDropdown } from "../components/SortDropdown";
import { incidentColumns, incidentRow } from "../tables/incidents";
import { api } from "../api/client";
import { errorMessage, useAsync, useScrollPreserve, useSort } from "../hooks";
import { displayName, equipmentLabel, userLabel } from "../lib/format";
import { toMap } from "../lib/lookups";
import { ErrorState, Loading } from "../components/Feedback";
import { ModalCard } from "../components/ModalCard";
import { Page } from "../components/Page";
import { IncidentFormModal } from "../components/IncidentFormModal";

const PAGE_SIZE = 5;

export function IncidentsScreen({ canWrite = true }: { canWrite?: boolean }) {
  const [search, setSearch] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { sortBy, sortOpen, select: selectSort, toggle: toggleSort } = useSort<"equipo" | "tipo" | "tecnico" | "estado" | "fecha">("fecha");
  const { capture: captureScroll, restore: restoreScroll } = useScrollPreserve();

  const { data, loading, error, reload } = useAsync(async () => {
    const [incidents, equipment, operators, assignments] = await Promise.all([
      api.incidents.paged({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search,
        operatorId: operatorFilter || undefined,
        status: statusFilter || undefined,
        dateFrom,
        dateTo,
      }),
      api.equipment.list(0, 100),
      api.operators.list(0, 100),
      api.assignments.list(0, 100),
    ]);
    const users = await api.users.technicians().catch(() => []);
    return { ...incidents, equipment, operators, assignments, users };
  }, [page, search, operatorFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
  }, [search, operatorFilter, statusFilter, dateFrom, dateTo]);
  useEffect(() => {
    restoreScroll();
  }, [page, restoreScroll]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const equipmentById = toMap(data.equipment);
  const operatorById = toMap(data.operators);
  const userById = toMap(data.users);

  const visible = [...data.items].sort((a, b) => {
    const av =
      sortBy === "equipo"
        ? equipmentLabel(equipmentById.get(a.equipment_id), a.equipment_id)
        : sortBy === "tipo"
          ? a.type
          : sortBy === "tecnico"
            ? userLabel(userById.get(a.technician_id), a.technician_id)
            : sortBy === "estado"
              ? a.status
              : a.created_at;
    const bv =
      sortBy === "equipo"
        ? equipmentLabel(equipmentById.get(b.equipment_id), b.equipment_id)
        : sortBy === "tipo"
          ? b.type
          : sortBy === "tecnico"
            ? userLabel(userById.get(b.technician_id), b.technician_id)
            : sortBy === "estado"
              ? b.status
              : b.created_at;
    return String(av).localeCompare(String(bv), "es", { sensitivity: "base" });
  });

  const columns: DataTableColumn[] = canWrite
    ? [...incidentColumns, { key: "accion", header: "Acción", className: "justify-center" }]
    : incidentColumns;
  const rows: DataTableRow[] = visible.map((incident) => ({
    ...incidentRow(incident, { equipmentById, operatorById, userById }),
    accion:
      canWrite && incident.status === "open" ? (
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
  }));

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);

  const handlePrev = () => {
    captureScroll();
    setPage((value) => Math.max(value - 1, 0));
  };
  const handleNext = () => {
    captureScroll();
    setPage((value) => Math.min(value + 1, totalPages - 1));
  };

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
      <Page title="Incidencias" subtitle="Reportes de fallas y su seguimiento hasta el cierre.">
        <DataTable
          columns={columns}
          rows={rows}
          selectable={false}
          onPrevious={handlePrev}
          onNext={handleNext}
          toolbar={
            <>
              <Header
                variant={canWrite ? "crud" : "search"}
                searchProps={{
                  placeholder: "Buscar incidencia...",
                  value: search,
                  onChange: (event) => setSearch(event.target.value),
                }}
                actionProps={
                  canWrite
                    ? {
                        onAdd: () => setFormOpen(true),
                        addLabel: "Crear incidencia",
                        showDelete: false,
                      }
                    : undefined
                }
                right={
                  <div className="relative">
                    <SortDropdown
                      options={[
                        { value: "equipo", label: "Equipo" },
                        { value: "tipo", label: "Tipo" },
                        { value: "tecnico", label: "Técnico" },
                        { value: "estado", label: "Estado" },
                        { value: "fecha", label: "Fecha" },
                      ]}
                      value={sortBy}
                      open={sortOpen}
                      onToggle={toggleSort}
                      onSelect={selectSort}
                    />
                  </div>
                }
              />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <SelectField
                  label="Reportado por"
                  searchable
                  searchPlaceholder="Escribe el nombre del operador"
                  tooltip="Filtra por el operador que reportó la incidencia"
                  value={operatorFilter}
                  onChange={setOperatorFilter}
                  options={data.operators.map((operator) => ({
                    value: String(operator.id),
                    label: operator.name,
                  }))}
                  placeholder="Todos los operadores"
                />
                <SelectField
                  label="Estado"
                  tooltip="Filtra por el estado de la incidencia"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "open", label: "Abierta" },
                    { value: "closed", label: "Cerrada" },
                  ]}
                  placeholder="Todos los estados"
                />
                <Textfield
                  label="Desde"
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  showIcon={false}
                />
                <Textfield
                  label="Hasta"
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  showIcon={false}
                />
              </div>
            </>
          }
          summary={`${data.total} incidencias · pág. ${safePage + 1}/${totalPages}`}
        />

        {canWrite && formOpen && (
          <IncidentFormModal
            equipment={data.equipment}
            operators={data.operators}
            assignments={data.assignments}
            users={data.users}
            onClose={() => setFormOpen(false)}
            onCreated={reload}
          />
        )}
      </Page>
      <div className="flex-1" />
    </div>
  );
}
