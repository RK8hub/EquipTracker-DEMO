// DEMO: este archivo no habla con ningún servidor. Es un mock en memoria.
// Reemplaza al cliente HTTP del producto real; las pantallas no cambian.
import seed from "../demo/seed.json";
import type {
  Assignment,
  AssignmentInput,
  AssignmentUpdate,
  Equipment,
  EquipmentInput,
  HistoryEntry,
  Incident,
  IncidentInput,
  IncidentUpdate,
  Operator,
  OperatorInput,
  Specs,
  SpecsInput,
  User,
  UserInput,
} from "../types";
import { searchKey } from "../lib/format";
import type { ListQuery, Paged } from "./query";

export { unwrapList } from "./query";
export type { Paged } from "./query";

export class ApiError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ApiError";
  }
}

const MAX_EXTRA = 5;

interface HistoryRow extends HistoryEntry {
  id: number;
  origen: "assignment" | "incident";
  fecha: string;
  detalle: string;
  serial?: string;
  equipo?: string;
  operador?: string;
  tecnico?: string;
}

interface Db {
  specs: Specs[];
  equipment: Equipment[];
  operators: Operator[];
  assignments: Assignment[];
  incidents: Incident[];
  users: User[];
  history: HistoryRow[];
}

const db: Db = structuredClone(seed) as unknown as Db;

const delay = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));

const nextId = (rows: { id: number }[]) =>
  rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;

function ensureCapacity(rows: unknown[], seeded: number, label: string): void {
  if (rows.length >= seeded + MAX_EXTRA) {
    throw new ApiError(`La demo permite agregar hasta ${MAX_EXTRA} ${label} más.`);
  }
}

const eqOf = (id: number) => db.equipment.find((item) => item.id === id);
const operatorOf = (id: number) => db.operators.find((item) => item.id === id);
const userOf = (id: number) => db.users.find((item) => item.id === id);
const eqLabel = (item: Equipment | undefined) =>
  item ? `${item.brand} ${item.model} · ${item.serial}` : "";

function inDates(value: string, query: ListQuery): boolean {
  if (query.dateFrom && value < query.dateFrom) return false;
  if (query.dateTo && value.slice(0, 10) > query.dateTo.slice(0, 10)) return false;
  return true;
}

function page<T>(rows: T[], query: ListQuery): Paged<T> {
  const skip = Math.max(0, Number(query.skip ?? 0));
  const limit = Math.max(1, Number(query.limit ?? 100));
  return { items: rows.slice(skip, skip + limit), total: rows.length };
}

interface HistoryInput {
  origen: "assignment" | "incident";
  detalle: string;
  serial?: string;
  equipo?: string;
  operador?: string;
  tecnico?: string;
  fecha?: string;
}

function addHistory(entry: HistoryInput): void {
  db.history.unshift({
    ...entry,
    id: nextId(db.history),
    fecha: entry.fecha ?? new Date().toISOString(),
  });
}

async function listOf<T>(rows: T[], skip = 0, limit = 100): Promise<T[]> {
  await delay();
  return rows.slice(skip, skip + limit);
}

export const api = {
  me: async () => {
    await delay();
    return {
      id: 1,
      email: "admin@demo.local",
      role: "admin",
      plan: "integral",
      permissions: {
        manage_users: true,
        export_csv: false,
        can_write: true,
        api_access: true,
      },
    };
  },

  users: {
    list: () => listOf(db.users),

    technicians: () => listOf(db.users),

    async create(input: UserInput): Promise<User> {
      await delay();
      ensureCapacity(db.users, seed.users.length, "usuarios");
      const email = input.email.trim().toLowerCase();
      if (db.users.some((user) => user.email.toLowerCase() === email)) {
        throw new ApiError("Ese correo ya está registrado.");
      }
      const user: User = {
        id: nextId(db.users),
        email,
        role: "staff",
        created_at: new Date().toISOString(),
      };
      db.users.push(user);
      return user;
    },

    async delete(id: number): Promise<void> {
      await delay();
      if (id === 1) throw new ApiError("No puedes eliminar al administrador de la demo.");
      const index = db.users.findIndex((user) => user.id === id);
      if (index === -1) throw new ApiError("El usuario no existe.");
      db.users.splice(index, 1);
    },

    async changePassword(_id: number, _password: string): Promise<User> {
      await delay();
      throw new ApiError("En la demo no se guardan contraseñas.");
    },
  },

  operators: {
    list: (skip = 0, limit = 100) => listOf(db.operators, skip, limit),

    async paged(query: ListQuery = {}): Promise<Paged<Operator>> {
      await delay();
      const term = searchKey(query.search ?? "");
      return page(
        db.operators.filter((operator) =>
          searchKey(`${operator.name} ${operator.department} ${operator.position}`).includes(term),
        ),
        query,
      );
    },

    async create(input: OperatorInput): Promise<Operator> {
      await delay();
      ensureCapacity(db.operators, seed.operators.length, "operadores");
      const operator: Operator = { id: nextId(db.operators), ...input };
      db.operators.push(operator);
      return operator;
    },

    async update(id: number, input: Partial<OperatorInput>): Promise<Operator> {
      await delay();
      const operator = operatorOf(id);
      if (!operator) throw new ApiError("El operador no existe.");
      Object.assign(operator, input);
      return operator;
    },

    async remove(id: number): Promise<void> {
      await delay();
      const active = db.assignments.some(
        (item) => item.operator_id === id && item.status === "active",
      );
      if (active) throw new ApiError("El operador tiene asignaciones activas.");
      const index = db.operators.findIndex((item) => item.id === id);
      if (index === -1) throw new ApiError("El operador no existe.");
      db.operators.splice(index, 1);
    },
  },

  equipment: {
    list: (skip = 0, limit = 100) => listOf(db.equipment, skip, limit),

    async paged(query: ListQuery = {}): Promise<Paged<Equipment>> {
      await delay();
      const term = searchKey(query.search ?? "");
      return page(
        db.equipment.filter((equipment) =>
          searchKey(`${equipment.serial} ${equipment.brand} ${equipment.model}`).includes(term),
        ),
        query,
      );
    },

    async get(id: number): Promise<Equipment> {
      await delay();
      const equipment = eqOf(id);
      if (!equipment) throw new ApiError("El equipo no existe.", 404);
      return equipment;
    },

    async create(input: EquipmentInput): Promise<Equipment> {
      await delay();
      ensureCapacity(db.equipment, seed.equipment.length, "equipos");
      const serial = input.serial.trim();
      if (db.equipment.some((item) => item.serial.toLowerCase() === serial.toLowerCase())) {
        throw new ApiError("Ya existe un equipo con ese número de serie.");
      }
      const equipment: Equipment = {
        id: nextId(db.equipment),
        ...input,
        serial,
        created_at: new Date().toISOString(),
      };
      db.equipment.push(equipment);
      return equipment;
    },

    async update(id: number, input: Partial<EquipmentInput>): Promise<Equipment> {
      await delay();
      const equipment = eqOf(id);
      if (!equipment) throw new ApiError("El equipo no existe.");
      Object.assign(equipment, input);
      return equipment;
    },

    async remove(id: number): Promise<void> {
      await delay();
      const active = db.assignments.some(
        (item) => item.equipment_id === id && item.status === "active",
      );
      if (active) throw new ApiError("El equipo tiene una asignación activa.");
      const index = db.equipment.findIndex((item) => item.id === id);
      if (index === -1) throw new ApiError("El equipo no existe.");
      db.equipment.splice(index, 1);
    },
  },

  specs: {
    list: (skip = 0, limit = 100) => listOf(db.specs, skip, limit),

    async get(id: number): Promise<Specs> {
      await delay();
      const spec = db.specs.find((item) => item.id === id);
      if (!spec) throw new ApiError("Las especificaciones no existen.", 404);
      return spec;
    },

    async create(input: SpecsInput): Promise<Specs> {
      await delay();
      const specs: Specs = { id: nextId(db.specs), ...input };
      db.specs.push(specs);
      return specs;
    },
  },

  assignments: {
    list: (skip = 0, limit = 100) => listOf(db.assignments, skip, limit),

    async paged(query: ListQuery = {}): Promise<Paged<Assignment>> {
      await delay();
      const term = searchKey(query.search ?? "");
      const serialId = query.serial
        ? db.equipment.find((item) => item.serial === query.serial)?.id
        : undefined;
      const rows = db.assignments.filter((assignment) => {
        if (query.operatorId && assignment.operator_id !== Number(query.operatorId)) return false;
        if (query.status && assignment.status !== query.status) return false;
        if (query.serial && assignment.equipment_id !== serialId) return false;
        if (!inDates(assignment.assigned_at, query)) return false;
        return searchKey(
          `${eqLabel(eqOf(assignment.equipment_id))} ${operatorOf(assignment.operator_id)?.name ?? ""} ${userOf(assignment.assigned_by)?.email ?? ""}`,
        ).includes(term);
      });
      return page(rows, query);
    },

    async create(input: AssignmentInput): Promise<Assignment> {
      await delay();
      ensureCapacity(db.assignments, seed.assignments.length, "asignaciones");
      if (!eqOf(input.equipment_id)) throw new ApiError("El equipo no existe.");
      if (!operatorOf(input.operator_id)) throw new ApiError("El operador no existe.");
      const active = db.assignments.some(
        (item) => item.equipment_id === input.equipment_id && item.status === "active",
      );
      if (active) throw new ApiError("El equipo ya tiene una asignación activa.");
      const assignment: Assignment = {
        id: nextId(db.assignments),
        equipment_id: input.equipment_id,
        operator_id: input.operator_id,
        assigned_by: 1,
        assigned_at: new Date().toISOString(),
        returned_at: null,
        status: "active",
      };
      db.assignments.push(assignment);
      return assignment;
    },

    async update(id: number, input: AssignmentUpdate): Promise<Assignment> {
      await delay();
      const assignment = db.assignments.find((item) => item.id === id);
      if (!assignment) throw new ApiError("La asignación no existe.");
      const wasActive = assignment.status === "active";
      Object.assign(assignment, input);
      if (assignment.status === "inactive" && !assignment.returned_at) {
        assignment.returned_at = new Date().toISOString();
      }
      if (wasActive && assignment.status === "inactive") {
        addHistory({
          origen: "assignment",
          serial: eqOf(assignment.equipment_id)?.serial ?? "",
          equipo: eqLabel(eqOf(assignment.equipment_id)),
          operador: operatorOf(assignment.operator_id)?.name ?? `Operador #${assignment.operator_id}`,
          tecnico: userOf(assignment.assigned_by)?.email ?? "",
          detalle: `Asignación devuelta · ${assignment.returned_at ?? ""}`,
        });
      }
      return assignment;
    },
  },

  incidents: {
    list: (skip = 0, limit = 100) => listOf(db.incidents, skip, limit),

    async paged(query: ListQuery = {}): Promise<Paged<Incident>> {
      await delay();
      const term = searchKey(query.search ?? "");
      const serialId = query.serial
        ? db.equipment.find((item) => item.serial === query.serial)?.id
        : undefined;
      const rows = db.incidents.filter((incident) => {
        if (query.operatorId) {
          const wanted = Number(query.operatorId);
          if (incident.reported_by !== wanted && incident.reported_by_original !== wanted) {
            return false;
          }
        }
        if (query.status && incident.status !== query.status) return false;
        if (query.serial && incident.equipment_id !== serialId) return false;
        if (!inDates(incident.created_at, query)) return false;
        return searchKey(
          `${eqLabel(eqOf(incident.equipment_id))} ${incident.type} ${incident.reason} ${operatorOf(incident.reported_by)?.name ?? ""} ${userOf(incident.technician_id)?.email ?? ""}`,
        ).includes(term);
      });
      return page(rows, query);
    },

    async create(input: IncidentInput): Promise<Incident> {
      await delay();
      ensureCapacity(db.incidents, seed.incidents.length, "incidencias");
      if (!eqOf(input.equipment_id)) throw new ApiError("El equipo no existe.");
      const original =
        db.assignments.find(
          (item) => item.equipment_id === input.equipment_id && item.status === "active",
        )?.operator_id ?? input.reported_by;
      const incident: Incident = {
        id: nextId(db.incidents),
        ...input,
        reported_by_original: original,
        status: "open",
        created_at: new Date().toISOString(),
        resolved_at: null,
      };
      db.incidents.push(incident);
      return incident;
    },

    async update(id: number, input: IncidentUpdate): Promise<Incident> {
      await delay();
      const incident = db.incidents.find((item) => item.id === id);
      if (!incident) throw new ApiError("La incidencia no existe.");
      const wasOpen = incident.status === "open";
      Object.assign(incident, input);
      if (incident.status === "closed" && !incident.resolved_at) {
        incident.resolved_at = new Date().toISOString();
      }
      if (wasOpen && incident.status === "closed") {
        addHistory({
          origen: "incident",
          serial: eqOf(incident.equipment_id)?.serial ?? "",
          equipo: eqLabel(eqOf(incident.equipment_id)),
          operador:
            operatorOf(incident.reported_by_original ?? incident.reported_by)?.name ??
            `Operador #${incident.reported_by}`,
          tecnico: userOf(incident.technician_id)?.email ?? "",
          detalle: `${incident.type} · ${incident.reason}`,
        });
      }
      return incident;
    },
  },

  history: {
    async paged(query: ListQuery = {}): Promise<Paged<HistoryEntry>> {
      await delay();
      const origin = String(query.origin ?? "").toLowerCase();
      const term = searchKey(query.serial ?? "");
      const rows = db.history.filter((entry) => {
        if (origin && !String(entry.origen).includes(origin)) return false;
        return searchKey(`${entry.serial ?? ""} ${entry.equipo ?? ""} ${entry.operador ?? ""}`).includes(term);
      });
      return page(rows, query);
    },
  },

  exports: {
    async request(_kind: string): Promise<never> {
      await delay();
      throw new ApiError("La exportación a CSV está deshabilitada en la demo.");
    },
    wait: async (_job: unknown): Promise<string | null> => {
      throw new ApiError("La exportación a CSV está deshabilitada en la demo.");
    },
  },
};
