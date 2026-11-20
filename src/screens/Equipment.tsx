import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Button,
  CardEquipment,
  Header,
  Popup,
  Textfield,
} from "../eq-ui";
import { SortDropdown } from "../components/SortDropdown";
import { api } from "../api/client";
import { errorMessage, useAsync, useSort } from "../hooks";
import { toMap } from "../lib/lookups";
import { ErrorState, Loading } from "../components/Feedback";
import { ModalCard } from "../components/ModalCard";
import { Overlay } from "../components/Overlay";
import { Page } from "../components/Page";
import { SelectField } from "../components/SelectField";
import { SpecsModal } from "../components/SpecsModal";
import type { Specs } from "../types";

interface EquipmentForm {
  id?: number;
  serial: string;
  brand: string;
  model: string;
  specs_id: string;
}

const emptyForm: EquipmentForm = {
  serial: "",
  brand: "",
  model: "",
  specs_id: "",
};

function specsLabel(spec: Specs): string {
  return `#${spec.id} · ${spec.cpu.brand} ${spec.cpu.model} · ${spec.ram.capacity.value}${spec.ram.capacity.unit}`;
}

export interface EquipmentScreenProps {
  onOpenDetail: (id: number) => void;
  canWrite?: boolean;
}

const PAGE_SIZE = 12;

export function EquipmentScreen({ onOpenDetail, canWrite = true }: EquipmentScreenProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { sortBy, sortOpen, select: selectSort, toggle: toggleSort } = useSort<"modelo" | "serial" | "operador" | "estado" | "incidencias">("modelo");
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState<EquipmentForm | null>(null);
  const [specsOpen, setSpecsOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useAsync(async () => {
    const [equipment, specs, operators, assignments, incidents] =
      await Promise.all([
        api.equipment.paged({ skip: page * PAGE_SIZE, limit: PAGE_SIZE, search }),
        api.specs.list(0, 100),
        api.operators.list(0, 100),
        api.assignments.list(0, 100),
        api.incidents.list(0, 100),
      ]);
    return { ...equipment, specs, operators, assignments, incidents };
  }, [page, search]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  if (loading && !data) return <Loading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const operatorById = toMap(data.operators);
  const activeAssignmentByEquipment = new Map(
    data.assignments
      .filter((assignment) => assignment.status === "active")
      .map((assignment) => [assignment.equipment_id, assignment]),
  );
  const openIncidentsByEquipment = new Map<number, number>();
  for (const incident of data.incidents) {
    if (incident.status !== "open") continue;
    openIncidentsByEquipment.set(
      incident.equipment_id,
      (openIncidentsByEquipment.get(incident.equipment_id) ?? 0) + 1,
    );
  }

  const filtered = [...data.items].sort((a, b) => {
      const operatorName = (equipmentId: number) => {
        const assignment = data.assignments.find(
          (item) => item.equipment_id === equipmentId && item.status === "active",
        );
        const operator = assignment
          ? data.operators.find((item) => item.id === assignment.operator_id)
          : undefined;
        return operator?.name ?? "Sin asignar";
      };
      const isAssigned = (equipmentId: number) =>
        data.assignments.some(
          (item) => item.equipment_id === equipmentId && item.status === "active",
        )
          ? 1
          : 0;
      const av =
        sortBy === "modelo"
          ? `${a.brand} ${a.model}`
          : sortBy === "serial"
            ? a.serial
            : sortBy === "operador"
              ? operatorName(a.id)
              : sortBy === "incidencias"
                ? (openIncidentsByEquipment.get(a.id) ?? 0)
                : isAssigned(a.id);
      const bv =
        sortBy === "modelo"
          ? `${b.brand} ${b.model}`
          : sortBy === "serial"
            ? b.serial
            : sortBy === "operador"
              ? operatorName(b.id)
              : sortBy === "incidencias"
                ? (openIncidentsByEquipment.get(b.id) ?? 0)
                : isAssigned(b.id);
      if (sortBy === "estado") {
        return (av as number) - (bv as number);
      }
      if (sortBy === "incidencias") {
        return (bv as number) - (av as number);
      }
      return String(av).localeCompare(String(bv), "es", { sensitivity: "base" });
    });

  function toggleSelected(id: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...current, id] : current.filter((item) => item !== id),
    );
  }

  async function save() {
    if (!form || busy) return;
    const specsId = Number(form.specs_id);
    if (!form.serial.trim() || !form.brand.trim() || !form.model.trim()) {
      toast.error("Completa serial, marca y modelo.");
      return;
    }

    setBusy(true);
    try {
      const payload = {
        serial: form.serial.trim().toUpperCase(),
        brand: form.brand.trim(),
        model: form.model.trim(),
        specs_id: specsId || null,
      };
      if (form.id) {
        await api.equipment.update(form.id, payload);
        toast.success("Equipo actualizado");
      } else {
        await api.equipment.create(payload);
        toast.success("Equipo creado");
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
        await api.equipment.remove(Number(id));
      }
      toast.success("Equipos eliminados");
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
      title="Equipos"
      subtitle="Inventario de equipos registrados y su asignación actual."
      fluid
    >
      <Header
        variant="crud"
        searchProps={{
          placeholder: "Buscar equipos...",
          value: search,
          onChange: (event) => setSearch(event.target.value),
        }}
        actionProps={
          canWrite
            ? {
                onAdd: () => setForm({ ...emptyForm }),
                addLabel: "Crear equipo",
                onDelete: () =>
                  selected.length
                    ? setConfirmDelete(true)
                    : toast.error("Selecciona al menos un equipo."),
              }
            : { showDelete: false }
        }
        right={
          <div className="relative">
            <SortDropdown
              options={[
                { value: "modelo", label: "Modelo" },
                { value: "serial", label: "Serial" },
                { value: "operador", label: "Operador" },
                { value: "estado", label: "Estado" },
                { value: "incidencias", label: "Incidencias" },
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
          Sin equipos registrados.
        </p>
      ) : (
        <div className="grid justify-between items-center gap-x-7 2xl:gap-x-20 gap-y-10 [grid-template-columns:repeat(auto-fill,300px)]">
          {filtered.map((equipment) => {
            const active = activeAssignmentByEquipment.get(equipment.id);
            const operatorName = active
              ? operatorById.get(active.operator_id)?.name ?? "Sin asignar"
              : "Sin asignar";
            return (
              <CardEquipment
                key={equipment.id}
                name={equipment.model}
                serial={equipment.serial}
                operator={`${operatorName}`}
                incidents={openIncidentsByEquipment.get(equipment.id) ?? 0}
                selected={selected.includes(String(equipment.id))}
                onSelectedChange={(checked) =>
                  toggleSelected(String(equipment.id), checked)
                }
                onOpen={() => onOpenDetail(equipment.id)}
                onMore={() =>
                  canWrite
                    ? setForm({
                        id: equipment.id,
                        serial: equipment.serial,
                        brand: equipment.brand,
                        model: equipment.model,
                        specs_id: equipment.specs_id
                          ? String(equipment.specs_id)
                          : "",
                      })
                    : onOpenDetail(equipment.id)
                }
              />
            );
          })}
        </div>
      )}

      <div className="mt-8 flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <Button
          text="Anterior"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        />
        <span>
          {data.total} equipos · pág. {page + 1}/{Math.max(1, Math.ceil(data.total / PAGE_SIZE))}
        </span>
        <Button
          text="Siguiente"
          disabled={(page + 1) * PAGE_SIZE >= data.total}
          onClick={() => setPage((value) => value + 1)}
        />
      </div>

      {form && (
        <ModalCard
          title={form.id ? "Editar equipo" : "Nuevo equipo"}
          description="El serial debe usar mayúsculas, números y guiones."
          onClose={busy ? undefined : () => setForm(null)}
          footer={
            <>
              <Button
                text="Cancelar"
                onClick={() => setForm(null)}
                disabled={busy}
              />
              <Button
                text={busy ? "Guardando..." : "Guardar"}
                variant="primary"
                onClick={save}
                disabled={busy}
              />
            </>
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Textfield
              label="Serial"
              placeholder="SN-001"
              value={form.serial}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, serial: event.target.value } : current,
                )
              }
              showIcon={false}
            />
            <Textfield
              label="Marca"
              placeholder="Dell"
              value={form.brand}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, brand: event.target.value } : current,
                )
              }
              showIcon={false}
            />
            <Textfield
              label="Modelo"
              placeholder="Latitude 5440"
              value={form.model}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, model: event.target.value } : current,
                )
              }
              showIcon={false}
            />
          </div>

          <SelectField
            label="Especificación"
            value={form.specs_id}
            onChange={(value) =>
              setForm((current) =>
                current ? { ...current, specs_id: value } : current,
              )
            }
            options={data.specs.map((spec) => ({
              value: String(spec.id),
              label: specsLabel(spec),
            }))}
            placeholder={
              data.specs.length ? "Sin especificación" : "Sin especificaciones"
            }
          />

          <div className="flex justify-end">
            <Button
              text="Nueva especificación"
              onClick={() => setSpecsOpen(true)}
              disabled={busy}
            />
          </div>
        </ModalCard>
      )}

      {specsOpen && (
        <SpecsModal
          onClose={() => setSpecsOpen(false)}
          onCreated={(spec) => {
            setSpecsOpen(false);
            setForm((current) =>
              current ? { ...current, specs_id: String(spec.id) } : current,
            );
            reload();
          }}
        />
      )}

      {confirmDelete && (
        <Overlay onClose={() => !busy && setConfirmDelete(false)}>
          <Popup
            title="¿Eliminar equipos?"
            description={`Se eliminarán ${selected.length} equipo(s). La operación falla si tienen asignaciones o incidencias.`}
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
