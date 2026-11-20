import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Monitor } from "lucide-react";
import { Button, CardOperador, Header, ModalOperator, Popup } from "../eq-ui";
import { SortDropdown } from "../components/SortDropdown";
import { api } from "../api/client";
import { errorMessage, useAsync, useSort } from "../hooks";
import { equipmentLabel, initials } from "../lib/format";
import { toMap } from "../lib/lookups";
import { ErrorState, Loading } from "../components/Feedback";
import { ModalCard } from "../components/ModalCard";
import { Overlay } from "../components/Overlay";
import { Page } from "../components/Page";

interface OperatorForm {
  id?: number;
  name: string;
  department: string;
  position: string;
}

const emptyForm: OperatorForm = { name: "", department: "", position: "" };

const PAGE_SIZE = 12;

export interface OperatorsScreenProps {
  onOpenDetail: (id: number) => void;
  canWrite?: boolean;
}

export function OperatorsScreen({ onOpenDetail, canWrite = true }: OperatorsScreenProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [detailId, setDetailId] = useState<number | null>(null);
  const { data, loading, error, reload } = useAsync(async () => {
    const [operators, assignments, incidents, equipment] = await Promise.all([
      api.operators.paged({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, search }),
      api.assignments.list(0, 100),
      api.incidents.list(0, 100),
      api.equipment.list(0, 100),
    ]);
    return { ...operators, assignments, incidents, equipment };
  }, [page, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const { sortBy, sortOpen, select: selectSort, toggle: toggleSort } = useSort<"name" | "department" | "position" | "equipos">("name");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<OperatorForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const activeByOperator = new Map<number, number>();
  for (const assignment of data.assignments) {
    if (assignment.status !== "active") continue;
    activeByOperator.set(
      assignment.operator_id,
      (activeByOperator.get(assignment.operator_id) ?? 0) + 1,
    );
  }

  const equipmentById = toMap(data.equipment);
  const detailOperator = data.items.find((item) => item.id === detailId);
  const detailEquipment = data.assignments.filter(
    (assignment) => assignment.status === "active" && assignment.operator_id === detailId,
  );
  const filtered = [...data.items].sort((a, b) => {
      if (sortBy === "equipos") {
        return (activeByOperator.get(a.id) ?? 0) - (activeByOperator.get(b.id) ?? 0);
      }
      return a[sortBy].localeCompare(b[sortBy], "es", { sensitivity: "base" });
    });

  function tagsFor(operatorId: number) {
    return [
      { label: "Equipos Activos", quantity: activeByOperator.get(operatorId) ?? 0 },
    ];
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || busy) return;
    if (!form.name.trim() || !form.department.trim() || !form.position.trim()) {
      toast.error("Completa nombre, departamento y puesto.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        department: form.department.trim(),
        position: form.position.trim(),
      };
      if (form.id) {
        await api.operators.update(form.id, payload);
        toast.success("Operador actualizado");
      } else {
        await api.operators.create(payload);
        toast.success("Operador creado");
      }
      setForm(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (busy) return;
    setBusy(true);
    try {
      for (const id of selected) {
        await api.operators.remove(Number(id));
      }
      toast.success("Operadores eliminados");
      setSelected([]);
      setConfirmDelete(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      reload();
    }
  }

  return (
    <Page
      title="Operadores"
      subtitle="Personas que reciben equipos y reportan incidencias."
      fluid
    >
      <Header
        variant={canWrite ? "crud" : "search"}
        searchProps={{
          placeholder: "Buscar operadores...",
          value: search,
          onChange: (event) => setSearch(event.target.value),
        }}
        actionProps={
          canWrite
            ? {
                onAdd: () => setForm({ ...emptyForm }),
                addLabel: "Crear operador",
                onDelete: () =>
                  selected.length
                    ? setConfirmDelete(true)
                    : toast.error("Selecciona al menos un operador."),
              }
            : undefined
        }
        right={
          <div className="relative">
            <SortDropdown
              options={[
                { value: "name", label: "Nombre" },
                { value: "department", label: "Departamento" },
                { value: "position", label: "Puesto" },
                { value: "equipos", label: "Equipos activos" },
              ]}
              value={sortBy}
              open={sortOpen}
              onToggle={toggleSort}
              onSelect={selectSort}
            />
          </div>
        }
      />

      {filtered.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          Sin operadores registrados.
        </p>
      ) : (
        <div className="grid justify-between items-center gap-x-12 2xl:gap-x-15 gap-y-15 [grid-template-columns:repeat(auto-fill,200px)]">
          {filtered.map((operator) => (
            <CardOperador
              key={operator.id}
              name={operator.name}
              area={operator.department}
              initials={initials(operator.name)}
              tags={tagsFor(operator.id)}
              selected={selected.includes(String(operator.id))}
              onSelectedChange={(checked) =>
                toggleSelected(String(operator.id), checked)
              }
              onOpen={() => setDetailId(operator.id)}
              onMore={() =>
                setForm({
                  id: operator.id,
                  name: operator.name,
                  department: operator.department,
                  position: operator.position,
                })
              }
            />
          ))}
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <Button
          text="Anterior"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        />
        <span>
          {data.total} operadores · pág. {page + 1}/
          {Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
        </span>
        <Button
          text="Siguiente"
          disabled={(page + 1) * PAGE_SIZE >= data.total}
          onClick={() => setPage((value) => value + 1)}
        />
      </div>

      {form && (
        <Overlay onClose={() => !busy && setForm(null)}>
          <ModalOperator
            initials={initials(form.name)}
            name={form.name}
            department={form.department}
            position={form.position}
            values={{
              name: form.name,
              department: form.department,
              position: form.position,
            }}
            onValueChange={(field, value) =>
              setForm((current) =>
                current ? { ...current, [field]: value } : current,
              )
            }
            tags={form.id ? tagsFor(form.id) : []}
            busy={busy}
            saveLabel={form.id ? "Guardar" : "Crear"}
            onSubmit={save}
            onCancel={() => setForm(null)}
          />
        </Overlay>
      )}

      {detailOperator && (
        <ModalCard
          title={detailOperator.name}
          description={`${detailOperator.department} · ${detailOperator.position}`}
          onClose={() => setDetailId(null)}
          footer={
            <Button
              text="Editar operador"
              variant="primary"
              onClick={() => {
                setForm({
                  id: detailOperator.id,
                  name: detailOperator.name,
                  department: detailOperator.department,
                  position: detailOperator.position,
                });
                setDetailId(null);
              }}
            />
          }
        >
          <p className="text-sm font-medium">Equipos activos</p>
          {detailEquipment.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin equipos asignados.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {detailEquipment.map((assignment) => {
                const equipment = equipmentById.get(assignment.equipment_id);
                return (
                  <li key={assignment.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-[10px] border border-stroke px-3 py-2 text-left text-sm transition-colors hover:bg-border/60"
                      onClick={() => {
                        setDetailId(null);
                        if (equipment) onOpenDetail(equipment.id);
                      }}
                    >
                      <Monitor aria-hidden="true" className="size-4 shrink-0" />
                      {equipmentLabel(equipment, assignment.equipment_id)}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ModalCard>
      )}

      {confirmDelete && (
        <Overlay onClose={() => !busy && setConfirmDelete(false)}>
          <Popup
            title="¿Eliminar operadores?"
            description={`Se eliminarán ${selected.length} operador(es). La operación falla si tienen asignaciones o incidencias.`}
            acceptLabel={busy ? "Eliminando..." : "Eliminar"}
            acceptVariant="destructive"
            onAccept={deleteSelected}
            onCancel={() => setConfirmDelete(false)}
          />
        </Overlay>
      )}
    </Page>
  );
}
