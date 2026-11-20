import { useState } from "react";
import { toast } from "sonner";
import { Button, SelectField, Textfield } from "../eq-ui";
import { api } from "../api/client";
import { errorMessage } from "../hooks";
import { displayName } from "../lib/format";
import { ModalCard } from "./ModalCard";
import type { Assignment, Equipment, Operator, User } from "../types";

interface IncidentForm {
  equipment_id: string;
  type: string;
  reason: string;
  reported_by: string;
  technician_id: string;
  original_reported_by: string;
}

export interface IncidentFormModalProps {
  equipment: Equipment[];
  operators: Operator[];
  assignments: Assignment[];
  users: User[];
  /** Equipo fijo cuando el alta se abre desde su ficha. */
  equipmentId?: number;
  onClose: () => void;
  onCreated: () => void;
}

export function IncidentFormModal({
  equipment,
  operators,
  assignments,
  users,
  equipmentId,
  onClose,
  onCreated,
}: IncidentFormModalProps) {
  const initialAssignment = equipmentId
    ? assignments.find(
        (item) => item.status === "active" && item.equipment_id === equipmentId,
      )
    : undefined;
  const [form, setForm] = useState<IncidentForm>({
    equipment_id: equipmentId ? String(equipmentId) : "",
    type: "",
    reason: "",
    reported_by: initialAssignment ? String(initialAssignment.operator_id) : "",
    technician_id: "",
    original_reported_by: initialAssignment ? String(initialAssignment.operator_id) : "",
  });
  const [busy, setBusy] = useState(false);

  const operatorOptions = operators
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
    .map((operator) => ({ value: String(operator.id), label: operator.name }));
  const technicianOptions = users.map((user) => ({
    value: String(user.id),
    label: displayName(user.email),
  }));

  const reporterEquipmentIds = form.reported_by
    ? assignments
        .filter(
          (item) =>
            item.status === "active" &&
            item.operator_id === Number(form.reported_by),
        )
        .map((item) => item.equipment_id)
    : [];
  const equipmentOptions = (reporterEquipmentIds.length > 0
    ? equipment.filter((item) => reporterEquipmentIds.includes(item.id))
    : equipment
  ).map((item) => ({
    value: String(item.id),
    label: `${item.brand} ${item.model} · ${item.serial}`,
    search: item.serial,
  }));

  function chooseEquipment(value: string) {
    const assignment = assignments.find(
      (item) => item.status === "active" && item.equipment_id === Number(value),
    );
    setForm((current) =>
      current
        ? {
            ...current,
            equipment_id: value,
            reported_by: assignment ? String(assignment.operator_id) : current.reported_by,
            original_reported_by: assignment
              ? String(assignment.operator_id)
              : current.original_reported_by,
          }
        : current,
    );
  }

  function chooseReporter(value: string) {
    const ids = assignments
      .filter(
        (item) => item.status === "active" && item.operator_id === Number(value),
      )
      .map((item) => item.equipment_id);
    setForm((current) =>
      current
        ? {
            ...current,
            reported_by: value,
            equipment_id:
              current.equipment_id && ids.includes(Number(current.equipment_id))
                ? current.equipment_id
                : ids.length === 1
                  ? String(ids[0])
                  : "",
          }
        : current,
    );
  }

  async function save() {
    if (busy) return;
    const equipmentIdValue = Number(form.equipment_id);
    const reporterId = Number(form.reported_by);
    const technicianId = Number(form.technician_id);
    if (
      !equipmentIdValue ||
      !form.type.trim() ||
      !form.reason.trim() ||
      !reporterId ||
      !technicianId
    ) {
      toast.error("Completa todos los campos.");
      return;
    }

    setBusy(true);
    try {
      await api.incidents.create({
        equipment_id: equipmentIdValue,
        type: form.type.trim(),
        reason: form.reason.trim(),
        reported_by: reporterId,
        technician_id: technicianId,
      });
      toast.success("Incidencia registrada");
      onCreated();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalCard
      title="Reportar incidencia"
      description="Las incidencias no se eliminan; se cierran cuando se resuelven."
      widthClassName="w-[840px] max-w-[calc(100vw-3rem)]"
      onClose={busy ? undefined : onClose}
      footer={
        <>
          <Button text="Cancelar" onClick={onClose} disabled={busy} />
          <Button
            text={busy ? "Guardando..." : "Registrar"}
            variant="primary"
            onClick={save}
            disabled={busy}
          />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectField
          label="Reportado por"
          searchable
          value={form.reported_by}
          onChange={chooseReporter}
          options={operatorOptions}
          placeholder="Selecciona el operador"
        />
        <SelectField
          label="Equipo"
          searchable
          searchPlaceholder="Buscar por serial..."
          value={form.equipment_id}
          onChange={chooseEquipment}
          options={equipmentOptions}
          placeholder="Buscar por serial..."
          disabled={equipmentId !== undefined}
        />
        <Textfield
          label="Tipo"
          placeholder="Falla de hardware"
          value={form.type}
          onChange={(event) =>
            setForm((current) =>
              current ? { ...current, type: event.target.value } : current,
            )
          }
          showIcon={false}
        />
        <SelectField
          label="Técnico asignado"
          searchable
          value={form.technician_id}
          onChange={(value) =>
            setForm((current) =>
              current ? { ...current, technician_id: value } : current,
            )
          }
          options={technicianOptions}
          placeholder={
            users.length === 0
              ? "No se pudieron cargar los usuarios"
              : "Selecciona el técnico"
          }
        />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-base font-normal text-primary">Motivo</span>
        <textarea
          placeholder="Describe el problema"
          value={form.reason}
          onChange={(event) =>
            setForm((current) =>
              current ? { ...current, reason: event.target.value } : current,
            )
          }
          className="min-h-24 w-full resize-y rounded-[8px] border border-stroke bg-transparent p-2 text-base font-normal text-primary outline-none placeholder:text-primary/45 focus:ring-[1px] focus:ring-zinc-400/40"
        />
      </label>
    </ModalCard>
  );
}
