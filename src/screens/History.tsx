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
  { key: "detalle", header: "Instantánea" },
  { key: "fecha", header: "Fecha" },
];

const text = (value: unknown, fallback = "—") =>
  typeof value === "string" || typeof value === "number" ? String(value) : fallback;

function isAssignment(entry: HistoryEntry): boolean {
  return /assignment|asign/i.test(String(entry.origen ?? entry.origin ?? ""));
}

function toRow(entry: HistoryEntry, index: number): DataTableRow {
  const recorded =
    text(entry.serial ?? entry.equipo ?? entry.operador ?? entry.detalle ?? entry.snapshot) === "—"
      ? Object.entries(entry)
          .filter(([key]) => !["id", "origen", "origin", "created_at", "fecha"].includes(key))
          .map(([key, value]) => `${key}: ${text(value)}`)
          .join(" · ")
      : "";
  return {
    id: String(entry.id ?? index),
    serial: text(entry.serial),
    equipo: text(entry.equipo ?? entry.equipment),
    operador: text(entry.operador ?? entry.operator),
    detalle: text(entry.detalle ?? entry.snapshot, recorded),
    fecha: formatDate(text(entry.fecha ?? entry.created_at, "") || null),
  };
}

export interface HistoryScreenProps {
  historyNotice?: string;
  historyQuota?: string;
}

export function HistoryScreen({ historyNotice, historyQuota }: HistoryScreenProps) {
  const [origin, setOrigin] = useState("");
  const [serial, setSerial] = useState("");
  const [page, setPage] = useState(0);
  const { data, loading, error, reload } = useAsync(async () => {
    const result = await api.history.paged({
      origin: origin || undefined,
      serial,
      skip: page * PAGE_SIZE,
      limit: PAGE_SIZE,
    });
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
      <div className="mb-4 rounded-[16px] border border-stroke bg-card p-4 text-sm text-muted-foreground">
        {historyNotice ??
          "La trazabilidad disponible depende del plan contratado. Las instantáneas no se pueden editar ni borrar."}
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
            <DataTable
              columns={historyColumns}
              rows={section.rows.map(toRow)}
              selectable={false}
              showToolbar={false}
              summary={section.title}
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
          {historyQuota ? ` · cupo: ${historyQuota}` : ""}
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
