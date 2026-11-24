import { useEffect, useMemo, useState } from "react";
import { DataTable, SelectField, Tooltip, type DataTableRow } from "../eq-ui";
import { api } from "../api/client";
import type { ListQuery } from "../api/query";
import { useAsync } from "../hooks";
import { historyFilterOptions, snapshotFields } from "../lib/history-filters";
import { formatDate } from "../lib/format";
import { ErrorState, ScreenSkeleton } from "../components/Feedback";
import { Page } from "../components/Page";
import type { HistoryEntry } from "../types";

const PAGE_SIZE = 8;
const EXPORT_PAGE_SIZE = 1000;

const historyColumns = [
  { key: "origen", header: "Origen", className: "text-center" },
  { key: "serial", header: "Serial", className: "text-center" },
  { key: "equipo", header: "Equipo", className: "text-center" },
  { key: "operador", header: "Operador", className: "text-center" },
  { key: "fecha", header: "Fecha", className: "text-center" },
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

async function allHistory(filters: ListQuery = {}): Promise<HistoryEntry[]> {
  const entries: HistoryEntry[] = [];
  for (let skip = 0; ; skip += EXPORT_PAGE_SIZE) {
    const result = await api.history.paged({ ...filters, skip, limit: EXPORT_PAGE_SIZE });
    entries.push(...result.items);
    if (result.items.length === 0 || entries.length >= result.total) break;
  }
  return entries;
}

function isAssignment(entry: HistoryEntry): boolean {
  return /assignment|asign/i.test(String(entry.origen ?? entry.origin ?? ""));
}

function toRow(entry: HistoryEntry, index: number): DataTableRow {
  const fields = snapshotFields(entry);
  return {
    id: String(entry.id ?? index),
    origen: isAssignment(entry) ? "Asignación" : "Incidencia",
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
    <div className="flex min-w-0 items-center gap-2">
      <Tooltip
        placement="bottom"
        label={`${format(used)} usadas · ${format(limit)} de cupo · ${usedPercent.toFixed(1).replace(".", ",")}%`}
      >
        <div
          role="img"
          aria-label={`${label}: ${format(remaining)} disponibles de ${format(limit)}`}
          className="grid size-12 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--eq-brand) ${usedPercent}%, var(--eq-object) ${usedPercent}%)`,
          }}
        >
          <div className="grid size-9 place-items-center rounded-full bg-card">
            <span className="text-[11px] font-semibold leading-none tracking-tight text-primary">
              {format(remaining)}
            </span>
          </div>
        </div>
      </Tooltip>
      <p className="text-xs font-medium text-primary">
        {label} <span className="font-normal text-muted-foreground">libres</span>
      </p>
    </div>
  );
}

export interface HistoryScreenProps {
  historyLimit?: number;
}

export function HistoryScreen({ historyLimit = 3000 }: HistoryScreenProps) {
  const [origin, setOrigin] = useState("");
  const [serial, setSerial] = useState("");
  const [operador, setOperador] = useState("");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { data: options } = useAsync(() => allHistory(), []);
  const filterOptions = useMemo(() => historyFilterOptions(options ?? []), [options]);
  const { data, loading, error, reload } = useAsync(async () => {
    const [result, assignmentTotals, incidentTotals] = await Promise.all([
      api.history.paged({
        origin: origin || undefined,
        serial: serial || undefined,
        operador: operador || undefined,
        skip: page * PAGE_SIZE,
        limit: PAGE_SIZE,
      }),
      api.history.paged({ origin: "assignment", skip: 0, limit: 1 }),
      api.history.paged({ origin: "incident", skip: 0, limit: 1 }),
    ]);
    const assignments = result.items.filter(isAssignment);
    return {
      ...result,
      items: [...assignments, ...result.items.filter((entry) => !isAssignment(entry))],
      usedAssignments: assignmentTotals.total,
      usedIncidents: incidentTotals.total,
    };
  }, [origin, serial, operador, page]);

  useEffect(() => {
    setPage(0);
  }, [origin, serial, operador]);

  useEffect(() => {
    setSelectedIds([]);
  }, [origin, serial, operador]);

  if (loading && !data)
    return (
      <ScreenSkeleton
        title="Historial"
        subtitle="Instantáneas inmutables de asignaciones e incidencias cerradas."
        columns={4}
      />
    );
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
  const rows = data.items.map(toRow);
  return (
    <Page
      title="Historial"
      subtitle="Instantáneas inmutables de asignaciones e incidencias cerradas."
      className="gap-[30px]"
      actions={
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <QuotaDonut label="Asignaciones" used={data.usedAssignments} limit={historyLimit} />
          <QuotaDonut label="Incidencias" used={data.usedIncidents} limit={historyLimit} />
        </div>
      }
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(150px,0.7fr)_minmax(220px,1fr)_minmax(220px,1fr)]">
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
        <SelectField
          label="Equipo"
          searchable
          searchPlaceholder="Buscar por serial..."
          value={serial}
          onChange={setSerial}
          options={filterOptions.equipment}
          placeholder="Todos los equipos"
        />
        <SelectField
          label="Operador"
          searchable
          searchPlaceholder="Buscar operador..."
          value={operador}
          onChange={setOperador}
          options={filterOptions.operators}
          placeholder="Todos los operadores"
        />
      </div>

      <DataTable
        columns={historyColumns}
        rows={rows}
        selectable
        allRowIds={rows.map((row) => row.id)}
        selectedIds={selectedIds}
        onSelectedChange={setSelectedIds}
        showToolbar={false}
        summary={`pág. ${safePage + 1}/${totalPages}`}
        onPrevious={() => setPage((value) => Math.max(0, value - 1))}
        onNext={() => setPage((value) => Math.min(totalPages - 1, value + 1))}
      />
      {data.items.length === 0 && (
        <p className="p-10 text-center text-sm text-muted-foreground">
          No hay instantáneas con estos filtros.
        </p>
      )}
    </Page>
  );
}
