import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, DataTable, Header, SelectField, Textfield, type DataTableColumn, type DataTableRow } from "../eq-ui";
import { SortDropdown } from "../components/SortDropdown";
import { assignmentColumns, assignmentRow } from "../tables/assignments";
import { api } from "../api/client";
import { errorMessage, useAsync, useScrollPreserve, useSort } from "../hooks";
import { displayName, equipmentLabel, operatorLabel } from "../lib/format";
import { toMap } from "../lib/lookups";
import { ErrorState, Loading } from "../components/Feedback";
import { ModalCard } from "../components/ModalCard";
import { Page } from "../components/Page";

const PAGE_SIZE = 5;

export function AssignmentsScreen({ canWrite = true }: { canWrite?: boolean }) {
  const [search, setSearch] = useState("");
  const [operatorFilter, setOperatorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{ equipment_id: string; operator_id: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const { sortBy, sortOpen, select: selectSort, toggle: toggleSort } = useSort<"equipo" | "operador" | "estado" | "fecha" | "asignador">("fecha");
  const { capture: captureScroll, restore: restoreScroll } = useScrollPreserve();

  const { data, loading, error, reload } = useAsync(async () => {
    const [assignments, equipment, operators] = await Promise.all([
      api.assignments.paged({
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
    ]);
    let users: Awaited<ReturnType<typeof api.users.list>> = [];
    try {
      users = await api.users.technicians();
    } catch {
      users = [];
    }
    return { ...assignments, equipment, operators, users };
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
        : sortBy === "operador"
          ? operatorLabel(operatorById.get(a.operator_id), a.operator_id)
          : sortBy === "asignador"
            ? userById.get(a.assigned_by)?.email ?? `Usuario #${a.assigned_by}`
            : sortBy === "estado"
              ? a.status
              : a.assigned_at;
    const bv =
      sortBy === "equipo"
        ? equipmentLabel(equipmentById.get(b.equipment_id), b.equipment_id)
        : sortBy === "operador"
          ? operatorLabel(operatorById.get(b.operator_id), b.operator_id)
          : sortBy === "asignador"
            ? userById.get(b.assigned_by)?.email ?? `Usuario #${b.assigned_by}`
            : sortBy === "estado"
              ? b.status
              : b.assigned_at;
    return String(av).localeCompare(String(bv), "es", { sensitivity: "base" });
  });

  const columns: DataTableColumn[] = canWrite
    ? [...assignmentColumns, { key: "accion", header: "Acción", className: "justify-center" }]
    : assignmentColumns;
  const rows: DataTableRow[] = visible.map((assignment) => ({
    ...assignmentRow(assignment, { equipmentById, operatorById, userById }),
    accion:
      canWrite && assignment.status === "active" ? (
        <Button
          text="Devolver"
          variant="ghost"
          className="h-8 px-3"
          disabled={busy}
          onClick={() => giveBack(assignment.id)}
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

  async function save() {
    if (!form || busy) return;
    const equipmentId = Number(form.equipment_id);
    const operatorId = Number(form.operator_id);
    if (!equipmentId || !operatorId) {
      toast.error("Selecciona equipo y operador.");
      return;
    }
    setBusy(true);
    try {
      // El backend toma assigned_by del token; el cliente no lo envía.
      await api.assignments.create({ equipment_id: equipmentId, operator_id: operatorId });
      toast.success("Equipo asignado");
      setForm(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function giveBack(id: number) {
    if (busy) return;
    setBusy(true);
    try {
      await api.assignments.update(id, {
        returned_at: new Date().toISOString(),
        status: "inactive",
      });
      toast.success("Equipo devuelto");
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const operatorOptions = data.operators
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
    .map((operator) => ({ value: String(operator.id), label: operator.name }));
  const assignedEquipmentIds = new Set(
    data.equipment
      .filter((item) =>
        data.items.some(
          (assignment) =>
            assignment.status === "active" && assignment.equipment_id === item.id,
        ),
      )
      .map((item) => item.id),
  );

  return (
    <div className="flex min-h-full flex-col">
      <Page title="Asignaciones" subtitle="Equipos entregados y su historial de devolución.">
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
                  placeholder: "Buscar asignación...",
                  value: search,
                  onChange: (event) => setSearch(event.target.value),
                }}
                actionProps={
                  canWrite
                    ? {
                        onAdd: () => setForm({ equipment_id: "", operator_id: "" }),
                        addLabel: "Crear asignación",
                        showDelete: false,
                      }
                    : undefined
                }
                right={
                  <div className="relative">
                    <SortDropdown
                      options={[
                        { value: "equipo", label: "Equipo" },
                        { value: "operador", label: "Operador" },
                        { value: "asignador", label: "Asignador" },
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
                  label="Operador"
                  searchable
                  searchPlaceholder="Escribe el nombre del operador"
                  tooltip="Filtra por operador asignado"
                  value={operatorFilter}
                  onChange={setOperatorFilter}
                  options={operatorOptions}
                  placeholder="Todos los operadores"
                />
                <SelectField
                  label="Estado"
                  tooltip="Filtra por estado de la asignación"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: "active", label: "Activo" },
                    { value: "inactive", label: "Devuelto" },
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
          summary={`${data.total} asignaciones · pág. ${safePage + 1}/${totalPages}`}
        />

        {canWrite && form && (
          <ModalCard
            title="Asignar equipo"
            description="Un equipo solo puede tener una asignación activa a la vez."
            onClose={busy ? undefined : () => setForm(null)}
            footer={
              <>
                <Button text="Cancelar" onClick={() => setForm(null)} disabled={busy} />
                <Button
                  text={busy ? "Guardando..." : "Asignar"}
                  variant="primary"
                  onClick={save}
                  disabled={busy}
                />
              </>
            }
          >
            <SelectField
              label="Equipo"
              searchable
              value={form.equipment_id}
              onChange={(value) =>
                setForm((current) => (current ? { ...current, equipment_id: value } : current))
              }
              options={data.equipment
                .filter((item) => !assignedEquipmentIds.has(item.id))
                .map((item) => ({
                  value: String(item.id),
                  label: `${item.brand} ${item.model} · ${item.serial}`,
                }))}
              placeholder="Selecciona un equipo"
            />
            <SelectField
              label="Operador"
              searchable
              value={form.operator_id}
              onChange={(value) =>
                setForm((current) => (current ? { ...current, operator_id: value } : current))
              }
              options={operatorOptions}
              placeholder="Selecciona un operador"
            />
          </ModalCard>
        )}
      </Page>
      <div className="flex-1" />
    </div>
  );
}
