import { useEffect, useState } from "react";
import { Handshake, Monitor, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, DataTable, Header, SelectField, Textfield, type DataTableColumn, type DataTableRow } from "../eq-ui";
import { SortDropdown } from "../components/SortDropdown";
import { assignmentColumns, assignmentRow } from "../tables/assignments";
import { api } from "../api/client";
import { errorMessage, useAsync, useDebouncedValue, useFieldFlash, useScrollPreserve, useSort } from "../hooks";
import { displayName, equipmentLabel, operatorLabel } from "../lib/format";
import { toMap } from "../lib/lookups";
import { ErrorState, ScreenSkeleton } from "../components/Feedback";
import { FieldError } from "../components/FieldError";
import { FirstUseGuide, GuideSteps } from "../components/FirstUseGuide";
import { ModalCard } from "../components/ModalCard";
import { Page } from "../components/Page";
import { hasActiveFilters, shouldShowFirstUseGuide } from "../lib/first-use";

const PAGE_SIZE = 5;
const assignmentSteps = [
  { label: "Elige un equipo disponible", icon: <Monitor strokeWidth={1.5} className="size-4" /> },
  { label: "Elige quién lo recibe", icon: <Users strokeWidth={1.5} className="size-4" /> },
  { label: "Guarda; después podrás devolverlo", icon: <Handshake strokeWidth={1.5} className="size-4" /> },
];

export function AssignmentsScreen({ canWrite = true }: { canWrite?: boolean }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [operatorFilter, setOperatorFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<{ equipment_id: string; operator_id: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [busy, setBusy] = useState(false);
  const { flash, clear, error: fieldError, field } = useFieldFlash();
  const { sortBy, sortOpen, select: selectSort, toggle: toggleSort } = useSort<"equipo" | "operador" | "fecha" | "asignador">("fecha");
  const { capture: captureScroll, restore: restoreScroll } = useScrollPreserve();

  const { data, loading, error, reload } = useAsync(async () => {
    const [assignments, equipment, operators] = await Promise.all([
      api.assignments.paged({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: debouncedSearch,
        operatorId: operatorFilter || undefined,
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
  }, [page, debouncedSearch, operatorFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, operatorFilter, dateFrom, dateTo]);
  useEffect(() => {
    restoreScroll();
  }, [page, restoreScroll]);

  if (loading && !data)
    return (
      <ScreenSkeleton
        title="Asignaciones"
        subtitle="Equipos entregados y su historial de devolución."
        columns={5}
      />
    );
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const equipmentById = toMap(data.equipment);
  const operatorById = toMap(data.operators);
  const userById = toMap(data.users);

  const filters = { search, operatorFilter, dateFrom, dateTo };
  const filtersActive = hasActiveFilters(filters);
  const firstUse = shouldShowFirstUseGuide(data.total, filters);
  const clearFilters = () => {
    setSearch("");
    setOperatorFilter("");
    setDateFrom("");
    setDateTo("");
  };

  const visible = [...data.items].sort((a, b) => {
    const av =
      sortBy === "equipo"
        ? equipmentLabel(equipmentById.get(a.equipment_id), a.equipment_id)
        : sortBy === "operador"
          ? operatorLabel(operatorById.get(a.operator_id), a.operator_id)
          : sortBy === "asignador"
            ? userById.get(a.assigned_by)?.email ?? `Usuario #${a.assigned_by}`
            : a.assigned_at;
    const bv =
      sortBy === "equipo"
        ? equipmentLabel(equipmentById.get(b.equipment_id), b.equipment_id)
        : sortBy === "operador"
          ? operatorLabel(operatorById.get(b.operator_id), b.operator_id)
          : sortBy === "asignador"
            ? userById.get(b.assigned_by)?.email ?? `Usuario #${b.assigned_by}`
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
    const missing: string[] = [];
    if (!equipmentId) missing.push("equipment_id");
    if (!operatorId) missing.push("operator_id");
    if (missing.length > 0) {
      flash(missing);
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
      <Page
        title="Asignaciones"
        subtitle="Equipos entregados y su historial de devolución."
        actions={
          firstUse ? undefined : (
            <Button
              text="? Cómo funciona"
              variant="ghost"
              onClick={() => setHelpOpen(true)}
            />
          )
        }
      >
        {firstUse && !advanced ? (
          <FirstUseGuide
            icon={<Handshake aria-hidden="true" strokeWidth={1.5} className="size-8" />}
            title="Todavía no hay asignaciones"
            description="Una asignación dice qué equipo tiene cada operador y desde cuándo."
            steps={assignmentSteps}
            action="asignación"
            onCreate={canWrite ? () => setForm({ equipment_id: "", operator_id: "" }) : undefined}
            onAdvanced={() => setAdvanced(true)}
          />
        ) : (
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
                  <div className="flex items-center gap-2">
                    {filtersActive && (
                      <Button
                        text="Quitar filtros"
                        variant="ghost"
                        onClick={clearFilters}
                      />
                    )}
                    <div className="relative">
                      <SortDropdown
                        options={[
                          { value: "equipo", label: "Equipo" },
                          { value: "operador", label: "Operador" },
                          { value: "asignador", label: "Asignador" },
                          { value: "fecha", label: "Fecha" },
                        ]}
                        value={sortBy}
                        open={sortOpen}
                        onToggle={toggleSort}
                        onSelect={selectSort}
                      />
                    </div>
                  </div>
                }
              />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
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
        )}

        {helpOpen && (
          <ModalCard
            title="Cómo funcionan las asignaciones"
            description="El responsable de cada equipo queda registrado; al devolverlo se guarda el historial."
            onClose={() => setHelpOpen(false)}
            footer={
              <>
                <Button text="Cerrar" onClick={() => setHelpOpen(false)} />
                {canWrite && (
                  <Button
                    text="Asignar equipo"
                    variant="primary"
                    onClick={() => {
                      setHelpOpen(false);
                      setForm({ equipment_id: "", operator_id: "" });
                    }}
                  />
                )}
              </>
            }
          >
            <GuideSteps steps={assignmentSteps} />
          </ModalCard>
        )}

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
              {...field("equipment_id")}
              label="Equipo"
              searchable
              value={form.equipment_id}
              onChange={(value) => {
                clear();
                setForm((current) => (current ? { ...current, equipment_id: value } : current));
              }}
              options={data.equipment
                .filter((item) => !assignedEquipmentIds.has(item.id))
                .map((item) => ({
                  value: String(item.id),
                  label: `${item.brand} ${item.model} · ${item.serial}`,
                }))}
              placeholder="Selecciona un equipo"
            />
            <FieldError message={fieldError("equipment_id")} />
            <SelectField
              {...field("operator_id")}
              label="Operador"
              searchable
              value={form.operator_id}
              onChange={(value) => {
                clear();
                setForm((current) => (current ? { ...current, operator_id: value } : current));
              }}
              options={operatorOptions}
              placeholder="Selecciona un operador"
            />
            <FieldError message={fieldError("operator_id")} />
          </ModalCard>
        )}
      </Page>
      <div className="flex-1" />
    </div>
  );
}
