/** Filtros compartidos por los listados del servidor. */
export interface ListQuery {
  skip?: number;
  limit?: number;
  search?: string;
  operatorId?: number | string | null;
  serial?: string | null;
  status?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  equipmentId?: number | string | null;
  origin?: string | null;
  operador?: string | null;
}

export interface Paged<T> {
  items: T[];
  total: number;
}

/**
 * El backend puede devolver un array o un objeto con total. Se aceptan ambos
 * para no romper versiones anteriores del servidor mientras se despliega la nueva API.
 */
export function unwrapList<T>(payload: unknown, totalHeader?: string | null): Paged<T> {
  if (Array.isArray(payload)) {
    return { items: payload as T[], total: Number(totalHeader ?? payload.length) || 0 };
  }
  if (payload && typeof payload === "object") {
    const body = payload as Record<string, unknown>;
    const rawItems = body.items ?? body.data ?? body.results;
    const items = Array.isArray(rawItems) ? (rawItems as T[]) : [];
    const total = body.total ?? body.count ?? totalHeader ?? items.length;
    return { items, total: Number(total) || 0 };
  }
  return { items: [], total: 0 };
}

/**
 * shortcut: se envían alias de parámetros por compatibilidad con el backend en despliegue;
 * FastAPI ignora los desconocidos. Quitar los alias cuando la API esté cerrada.
 */
export function listParams(query: ListQuery = {}): string {
  const params = new URLSearchParams();
  const put = (key: string, value: string | number | null | undefined) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  };
  put("skip", query.skip ?? 0);
  put("limit", query.limit ?? 100);
  if (query.search) {
    put("search", query.search);
    put("q", query.search);
  }
  if (query.operatorId) {
    put("operator_id", query.operatorId);
    put("reported_by", query.operatorId);
  }
  put("serial", query.serial);
  put("operador", query.operador);
  put("status", query.status);
  if (query.dateFrom) {
    put("date_from", query.dateFrom);
    put("from", query.dateFrom);
  }
  if (query.dateTo) {
    put("date_to", query.dateTo);
    put("to", query.dateTo);
  }
  put("equipment_id", query.equipmentId);
  if (query.origin) {
    put("origin", query.origin);
    put("origen", query.origin);
  }
  return params.toString();
}
