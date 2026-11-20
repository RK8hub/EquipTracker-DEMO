import { useEffect, useState } from "react";
import { DataTable, SelectField, Textfield, type DataTableRow } from "../eq-ui";
import { api } from "../api/client";
import { useAsync } from "../hooks";
import { formatDate } from "../lib/format";
import { ErrorState, Loading } from "../components/Feedback";
import { Page } from "../components/Page";
import type { HistoryEntry } from "../types";

const PAGE_SIZE = 8;

const historyColumns = [
  { key: "serial", header: "Serial" },
  { key: "equipo", header: "Equipo" },
  { key: "operador", header: "Operador" },
  { key: "fecha", header: "Fecha" },
];

const text = (value: unknown, fallback = "—") =>
  typeof value === "string" || typeof value === "number" ? String(value) : fallback;

function pick(...values: unknown[]): string {
  for (const value of values) {
    const found = text(value, "");
    if (found) return found;
  }
  return "—";
}

function snapshotFields(entry: HistoryEntry): Map<string, string> {
  const fields = new Map<string, string>();
  for (const line of text(entry.detalle ?? entry.snapshot).split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      fields.set(
        line.slice(0, separator).trim().toLowerCase(),
        line.slice(separator + 1).trim(),
      );
    }
  }
  return fields;
}

function isAssignment(entry: HistoryEntry): boolean {
  return /assignment|asign/i.test(String(entry.origen ?? entry.origin ?? ""));
}

function toRow(entry: HistoryEntry, index: number): DataTableRow {
  const fields = snapshotFields(entry);
  return {
    id: String(entry.id ?? index),
    serial: pick(entry.serial, fields.get("serial")),
    equipo: pick(
      entry.equipo,
      entry.equipment,
      [fields.get("marca"), fields.get("modelo")].filter(Boolean).join(" "),
    ),
    operador: pick(
      entry.operador,
      entry.operator,
      fields.get("reportado por"),
      fields.get("operador original"),
      fields.get("operador"),
    ),
    fecha: formatDate(text(entry.fecha ?? entry.created_at, "") || null),
  };
}

function QuotaDonut({ label, used, limit }: { label: string; used: number; limit: number }) {
  const remaining = Math.max(0, limit - used);
  const usedPercent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const format = (value: number) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (
    <div className="flex min-w-0 items-center gap-4">
      <div
        role="img"
        aria-label={`${label}: ${format(remaining)} disponibles de ${format(limit)}`}
        className="grid size-20 shrink-0 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--eq-brand) ${usedPercent}%, var(--eq-object) ${usedPercent}%)`,
        }}
      >
        <div className="grid size-14 place-items-center rounded-full bg-card text-center">
          <span className="text-sm font-semibold text-primary">{format(remaining)}</span>
          <span className="text-[10px] text-muted-foreground">libres</span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-primary">{label}</p>
        <p className="text-xs text-muted-foreground">
          {format(used)} usadas · {format(limit)} de cupo
        </p>
      </div>
    </div>
  );
}

export interface HistoryScreenProps {
  historyNotice?: string;
  historyLimit?: number;
}

export function HistoryScreen({ historyNotice, historyLimit = 3000 }: HistoryScreenProps) {
  const [origin, setOrigin] = useState("");
  const [serial, setSerial] = useState("");
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(async () => {
    const [result, assignmentTotals, incidentTotals] = await Promise.all([
      api.history.paged({
        origin: origin || undefined,
        serial,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
      api.history.paged({ origin: "assignment", skip: 0, limit: 1 }),
      api.history.paged({ origin: "incident", skip: 0, limit: 1 }),
    ]);
    // Algunas versiones del backend separan el cupo por origen en dos listas.
    const merged = Array.isArray(result.items)
      ? result.items
      : ((result as unknown as { assignments?: HistoryEntry[]; incidents?: HistoryEntry[] })
          .assignments ?? []).concat(
          (result as unknown as { incidents?: HistoryEntry[] }).incidents ?? [],
        );
    const assignments = merged.filter(isAssignment);
    return {
      ...result,
      items: merged,
      assignments,
      incidents: merged.filter((entry) => !isAssignment(entry)),
      usedAssignments: assignmentTotals.total,
      usedIncidents: incidentTotals.total,
    };
  }, [origin, serial, page]);

  useEffect(() => {
    setPage(0);
  }, [origin, serial]);

  if (loading && !data) return <Loading />;
  if (error)
    return (
      <ErrorState
        message={
          error.includes("404")
            ? "El historial aún no está disponible en este servidor."
            : error
        }
        onRetry={reload}
      />
    );
  if (!data) return null;

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const sections = [
    { title: "Asignaciones cerradas", rows: data.assignments },
    { title: "Incidencias cerradas", rows: data.incidents },
  ];

  return (
    <Page title="Historial" subtitle="Instantáneas inmutables de asignaciones e incidencias cerradas.">
      <div className="mb-6 rounded-[24px] border border-stroke bg-card p-6">
        <p className="text-sm text-muted-foreground">
          {historyNotice ??
            "El historial guarda instantáneas inmutables; la trazabilidad disponible depende del plan."}
        </p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <QuotaDonut label="Asignaciones" used={data.usedAssignments} limit={historyLimit} />
          <QuotaDonut label="Incidencias" used={data.usedIncidents} limit={historyLimit} />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SelectField
          label="Origen"
          value={origin}
          onChange={setOrigin}
          options={[
            { value: "assignment", label: "Asignaciones" },
            { value: "incident", label: "Incidencias" },
          ]}
          placeholder="Todos los orígenes"
        />
        <Textfield
          label="Serial"
          placeholder="Buscar por serial"
          value={serial}
          onChange={(event) => setSerial(event.target.value)}
          showIcon={false}
        />
      </div>

      {sections.map((section) =>
        section.rows.length === 0 ? null : (
          <section key={section.title} className="mb-6">
            <h2 className="mb-3 text-lg font-semibold">{section.title}</h2>
            <DataTable
              columns={historyColumns}
              rows={section.rows.map(toRow)}
              selectable={false}
              showToolbar={false}
            />
          </section>
        ),
      )}
      {data.items.length === 0 && (
        <p className="p-10 text-center text-sm text-muted-foreground">
          No hay instantáneas con estos filtros.
        </p>
      )}

      <div className="mt-4 flex items-center justify-center gap-4 text-sm text-muted-foreground">
        <button
          type="button"
          className="cursor-pointer rounded-[8px] border border-stroke px-4 py-2 disabled:opacity-50"
          disabled={page === 0}
          onClick={() => setPage((value) => Math.max(0, value - 1))}
        >
          Anterior
        </button>
        <span>
          pág. {safePage + 1}/{totalPages}
        </span>
        <button
          type="button"
          className="cursor-pointer rounded-[8px] border border-stroke px-4 py-2 disabled:opacity-50"
          disabled={(page + 1) * PAGE_SIZE >= data.total}
          onClick={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
        >
          Siguiente
        </button>
      </div>
    </Page>
  );
}
