import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button, CardOperador, Header, ModalOperator, Popup } from "../eq-ui";
import { SortDropdown } from "../components/SortDropdown";
import { api } from "../api/client";
import { errorMessage, useAsync, useDebouncedValue, useFieldFlash, useSort } from "../hooks";
import { initials } from "../lib/format";
import { EmptyCollection } from "../components/EmptyCollection";
import { ErrorState, ScreenSkeleton } from "../components/Feedback";
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
  onOpenOperator: (id: number) => void;
  canWrite?: boolean;
}

export function OperatorsScreen({ onOpenOperator, canWrite = true }: OperatorsScreenProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(async () => {
    const [operators, assignments, incidents] = await Promise.all([
      api.operators.paged({
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
        search: debouncedSearch,
      }),
      api.assignments.list(0, 100),
      api.incidents.list(0, 100),
    ]);
    return { ...operators, assignments, incidents };
  }, [page, debouncedSearch]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const { sortBy, sortOpen, select: selectSort, toggle: toggleSort } = useSort<"name" | "department" | "position" | "equipos">("name");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<OperatorForm | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const { flash, clear, error: fieldError, textField } = useFieldFlash();

  if (loading && !data)
    return (
      <ScreenSkeleton
        title="Operadores"
        subtitle="Personas que reciben equipos y reportan incidencias."
        variant="operator-cards"
        fluid
      />
    );
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

  // El mock filtra por texto en servidor; aquí solo se ordena la página actual.
  const filtered = [...data.items].sort((a, b) => {
    if (sortBy === "equipos") {
      return (activeByOperator.get(a.id) ?? 0) - (activeByOperator.get(b.id) ?? 0);
    }
    return a[sortBy].localeCompare(b[sortBy], "es", { sensitivity: "base" });
  });
  const visible = filtered;
  const total = data.total;

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
    if (!canWrite || !form || busy) return;
    const missing: string[] = [];
    if (!form.name.trim()) missing.push("name");
    if (!form.department.trim()) missing.push("department");
    if (!form.position.trim()) missing.push("position");
    if (missing.length > 0) {
      flash(missing);
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
    if (!canWrite || busy) return;
    setBusy(true);
    const failed: string[] = [];
    let deleted = 0;
    try {
      for (const id of selected) {
        try {
          await api.operators.remove(Number(id));
          deleted += 1;
        } catch (err) {
          const name = data?.items.find((item) => String(item.id) === id)?.name ?? id;
          failed.push(`${name}: ${errorMessage(err)}`);
        }
      }
      if (deleted > 0) toast.success(`Se eliminaron ${deleted} operador(es)`);
      if (failed.length > 0) {
        toast.error(`No se eliminaron ${failed.length} operador(es). ${failed.join(" · ")}`);
      }
      setSelected([]);
      setConfirmDelete(false);
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
      className="min-h-full"
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

      {data.total === 0 ? (
        <EmptyCollection
          label="operadores"
          action="operador"
          onCreate={canWrite ? () => setForm({ ...emptyForm }) : undefined}
        />
      ) : visible.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          Sin resultados.
        </p>
      ) : (
        <div className="grid justify-between items-center gap-x-12 2xl:gap-x-15 gap-y-15 [grid-template-columns:repeat(auto-fill,200px)]">
          {visible.map((operator) => (
            <CardOperador
              key={operator.id}
              name={operator.name}
              area={operator.department}
              canWrite={canWrite}
              initials={initials(operator.name)}
              tags={tagsFor(operator.id)}
              selected={selected.includes(String(operator.id))}
              onSelectedChange={(checked) =>
                toggleSelected(String(operator.id), checked)
              }
              onOpen={() => onOpenOperator(operator.id)}
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

      {total > 0 && (
        <div className="mt-auto flex items-center justify-center gap-4 pt-8 text-sm text-muted-foreground">
          <Button
            text="Anterior"
            disabled={page === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          />
          <span>
            {total} operadores · pág. {page + 1}/
            {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <Button
            text="Siguiente"
            disabled={(page + 1) * PAGE_SIZE >= total}
            onClick={() => setPage((value) => value + 1)}
          />
        </div>
      )}

      {form && (
        <Overlay onClose={() => !busy && setForm(null)}>
          <ModalOperator
            noValidate
            flash={textField}
            fieldError={fieldError}
            initials={initials(form.name)}
            name={form.name}
            department={form.department}
            position={form.position}
            values={{
              name: form.name,
              department: form.department,
              position: form.position,
            }}
            onValueChange={(field, value) => {
              clear();
              setForm((current) =>
                current ? { ...current, [field]: value } : current,
              );
            }}
            tags={form.id ? tagsFor(form.id) : []}
            busy={busy}
            saveLabel={form.id ? "Guardar" : "Crear"}
            onSubmit={save}
            onCancel={() => setForm(null)}
          />
        </Overlay>
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
