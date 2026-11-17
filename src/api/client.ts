// DEMO: este archivo no habla con ningún servidor. Es un mock en memoria.
// Reemplaza al cliente HTTP del producto real; las pantallas no cambian.
import seed from "../demo/seed.json";
import type {
  Assignment,
  AssignmentInput,
  AssignmentUpdate,
  Equipment,
  EquipmentInput,
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

export class ApiError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ApiError";
  }
}

const MAX_EXTRA = 5;

interface Db {
  specs: Specs[];
  equipment: Equipment[];
  operators: Operator[];
  assignments: Assignment[];
  incidents: Incident[];
  users: User[];
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

async function listOf<T>(rows: T[], skip = 0, limit = 100): Promise<T[]> {
  await delay();
  return rows.slice(skip, skip + limit);
}

export const api = {
  users: {
    list: () => listOf(db.users),

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

    async create(input: OperatorInput): Promise<Operator> {
      await delay();
      ensureCapacity(db.operators, seed.operators.length, "operadores");
      const operator: Operator = { id: nextId(db.operators), ...input };
      db.operators.push(operator);
      return operator;
    },

    async update(id: number, input: Partial<OperatorInput>): Promise<Operator> {
      await delay();
      const operator = db.operators.find((item) => item.id === id);
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
      const equipment = db.equipment.find((item) => item.id === id);
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

    async create(input: SpecsInput): Promise<Specs> {
      await delay();
      const specs: Specs = { id: nextId(db.specs), ...input };
      db.specs.push(specs);
      return specs;
    },
  },

  assignments: {
    list: (skip = 0, limit = 100) => listOf(db.assignments, skip, limit),

    async create(input: AssignmentInput): Promise<Assignment> {
      await delay();
      ensureCapacity(db.assignments, seed.assignments.length, "asignaciones");
      if (!db.equipment.some((item) => item.id === input.equipment_id)) {
        throw new ApiError("El equipo no existe.");
      }
      if (!db.operators.some((item) => item.id === input.operator_id)) {
        throw new ApiError("El operador no existe.");
      }
      const active = db.assignments.some(
        (item) => item.equipment_id === input.equipment_id && item.status === "active",
      );
      if (active) throw new ApiError("El equipo ya tiene una asignación activa.");
      const assignment: Assignment = {
        id: nextId(db.assignments),
        equipment_id: input.equipment_id,
        operator_id: input.operator_id,
        assigned_by: input.assigned_by ?? 1,
        assigned_at: input.assigned_at ?? new Date().toISOString(),
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
      Object.assign(assignment, input);
      if (assignment.status === "inactive" && !assignment.returned_at) {
        assignment.returned_at = new Date().toISOString();
      }
      return assignment;
    },
  },

  incidents: {
    list: (skip = 0, limit = 100) => listOf(db.incidents, skip, limit),

    async create(input: IncidentInput): Promise<Incident> {
      await delay();
      ensureCapacity(db.incidents, seed.incidents.length, "incidencias");
      if (!db.equipment.some((item) => item.id === input.equipment_id)) {
        throw new ApiError("El equipo no existe.");
      }
      const incident: Incident = {
        id: nextId(db.incidents),
        ...input,
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
      Object.assign(incident, input);
      if (incident.status === "closed" && !incident.resolved_at) {
        incident.resolved_at = new Date().toISOString();
      }
      return incident;
    },
  },
};
