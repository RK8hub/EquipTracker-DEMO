// Genera src/demo/seed.json. Determinista: sin aleatoriedad.
// Uso: node scripts/seed.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DAY = 86_400_000;
const BASE = Date.UTC(2026, 0, 5, 9, 0, 0);
const iso = (days, hour = 9) =>
  new Date(BASE + days * DAY + (hour - 9) * 3_600_000).toISOString();

const specs = [
  ["Intel", "Core i5-12400", 16, "dual", 512, "SSD", "Intel", "UHD Graphics 730", "integrated", null],
  ["Intel", "Core i7-12700", 32, "dual", 1024, "NVMe", "NVIDIA", "GeForce RTX 3060", "dedicated", 12],
  ["AMD", "Ryzen 5 5600", 16, "dual", 500, "SSD", "NVIDIA", "GeForce GTX 1650", "dedicated", 4],
  ["AMD", "Ryzen 7 5800X", 32, "dual", 1024, "NVMe", "NVIDIA", "GeForce RTX 3070", "dedicated", 8],
  ["Intel", "Core i3-12100", 8, "single", 256, "SSD", "Intel", "UHD Graphics 730", "integrated", null],
  ["Apple", "M2", 16, "single", 512, "SSD", "Apple", "GPU 10 núcleos", "integrated", null],
  ["Intel", "Xeon E-2336", 64, "dual", 2048, "NVMe", "Intel", "UHD Graphics P750", "integrated", null],
  ["Intel", "Core i9-12900K", 64, "dual", 2048, "NVMe", "NVIDIA", "GeForce RTX 3080", "dedicated", 10],
  ["AMD", "Ryzen 3 4300G", 8, "single", 1024, "HDD", "AMD", "Radeon Vega 6", "integrated", null],
  ["Intel", "Core i5-1135G7", 16, "single", 512, "NVMe", "Intel", "Iris Xe", "integrated", null],
].map(([cpuBrand, cpuModel, ram, mode, disk, diskType, gpuBrand, gpuModel, gpuType, gpuMem], index) => ({
  id: index + 1,
  cpu: { brand: cpuBrand, model: cpuModel },
  ram: { capacity: { value: ram, unit: "GB" }, mode },
  storage: { capacity: { value: disk, unit: "GB" }, type: diskType },
  graphics: {
    brand: gpuBrand,
    model: gpuModel,
    type: gpuType,
    memory: gpuMem ? { value: gpuMem, unit: "GB" } : null,
  },
}));

const brands = [
  { brand: "Dell", models: ["Latitude 5430", "OptiPlex 7000", "Precision 3560", "Vostro 3520"] },
  { brand: "HP", models: ["ProBook 450 G9", "EliteBook 840 G8", "ProDesk 400 G7", "ZBook Firefly 14"] },
  { brand: "Lenovo", models: ["ThinkPad T14", "ThinkCentre M70q", "IdeaPad 3", "ThinkBook 15"] },
  { brand: "Asus", models: ["ExpertBook B1", "VivoBook 15", "ProArt Studiobook 16", "ExpertCenter D5"] },
  { brand: "Acer", models: ["TravelMate P2", "Aspire 5", "Veriton X", "Swift 3"] },
  { brand: "Apple", models: ["MacBook Air M2", "MacBook Pro 14", "Mac mini M2", "iMac 24"] },
];

const equipment = Array.from({ length: 50 }, (_, i) => {
  const maker = brands[i % brands.length];
  const author = i === 0; // Huevo sorpresa: el equipo del autor.
  return {
    id: i + 1,
    serial: `EQ-${2022 + (i % 3)}-${String(i + 1).padStart(4, "0")}`,
    brand: author ? "Lenovo" : maker.brand,
    model: author ? "ThinkPad T480" : maker.models[Math.floor(i / brands.length) % maker.models.length],
    specs_id: (i % specs.length) + 1,
    created_at: iso(i * 5, 9),
  };
});

const people = [
  "Raúl Emmanuel Aguilar González", "Carlos Rivas", "María López", "Jorge Castillo", "Lucía Herrera",
  "Miguel Ángel Torres", "Sofía Ramírez", "Diego Fuentes", "Valeria Cruz", "Andrés Palacios",
  "Camila Rojas", "José Antonio Silva", "Daniela Méndez", "Ricardo Navarro", "Paola Guzmán",
  "Fernando Salas", "Gabriela Ortiz", "Manuel Espinoza", "Isabel Cárdenas", "Óscar Delgado",
  "Natalia Vega", "Roberto Aguilar", "Claudia Pineda", "Alejandro Mora", "Teresa Solís",
  "Héctor Blandón", "Marcela Reyes", "Iván Gutiérrez", "Rosa Miranda", "Emilio Zapata",
  "Patricia Luna", "Sergio Cabrera", "Adriana Ríos", "Julián Montoya", "John Doe",
  "Markus Persson", "Victor von Doom", "William Afton", "Peter Benjamin Parker", "Juan Manuel Caldera",
  "William Sherlock Scott Holmes", "Patrick J. Jane",
];

// Puesto y departamento fijos de los personajes; el resto usa los arreglos.
const profiles = {
  "Raúl Emmanuel Aguilar González": ["Tecnología", "Desarrollador"],
  "John Doe": ["??????", "MissingNo."],
  "Markus Persson": ["Tecnología", "Programador de videojuegos"],
  "Victor von Doom": ["Tecnología", "Ingeniero de sistemas"],
  "William Afton": ["Tecnología", "Ingeniero de robótica"],
  "Peter Benjamin Parker": ["Ventas", "Fotógrafo"],
  "Juan Manuel Caldera": ["Ventas", "Gerente de sucursales"],
  "William Sherlock Scott Holmes": ["Dirección", "Detective consultor"],
  "Patrick J. Jane": ["Dirección", "Consultor"],
};

const departments = [
  "Tecnología", "Contabilidad", "Recursos Humanos", "Ventas",
  "Operaciones", "Logística", "Dirección", "Soporte",
];

const positions = [
  "Analista", "Coordinador", "Gerente", "Técnico",
  "Asistente", "Jefe de área",
];

const operators = people.map((name, i) => {
  const [department, position] = profiles[name] ?? [
    departments[i % departments.length],
    positions[i % positions.length],
  ];
  return { id: i + 1, name, department, position };
});

const users = [
  { id: 1, email: "admin@demo.local", role: "admin", created_at: iso(0, 8) },
  { id: 2, email: "soporte1@demo.local", role: "staff", created_at: iso(3, 9) },
  { id: 3, email: "soporte2@demo.local", role: "staff", created_at: iso(12, 10) },
  { id: 4, email: "sistemas@demo.local", role: "staff", created_at: iso(40, 11) },
];

// Operadores con un equipo distinto al de su mismo id.
const equipmentByOperator = { 38: 49 }; // Afton usa laptop, no el escritorio 38.

const assignments = Array.from({ length: 40 }, (_, i) => {
  const assigned = iso(30 + i * 6, 10);
  const returned = i % 5 === 4;
  return {
    id: i + 1,
    equipment_id: equipmentByOperator[i + 1] ?? i + 1,
    operator_id: i + 1,
    assigned_by: 1,
    assigned_at: assigned,
    returned_at: returned ? iso(30 + i * 6 + 20, 16) : null,
    status: returned ? "inactive" : "active",
  };
});

// Jane (42) recibe la Dell Vostro 3520 (43).
assignments.push({
  id: assignments.length + 1,
  equipment_id: 43,
  operator_id: 42,
  assigned_by: 1,
  assigned_at: iso(180, 10),
  returned_at: null,
  status: "active",
});

const incidentTypes = ["Hardware", "Software", "Red", "Periférico"];
const incidentReasons = [
  "No enciende",
  "Pantalla con líneas",
  "Disco lleno",
  "No conecta a la red",
  "Teclado defectuoso",
  "Sobrecalentamiento",
  "Batería no carga",
  "Sistema operativo lento",
  "Impresora no responde",
  "Actualización fallida",
];

const incidents = Array.from({ length: 20 }, (_, i) => {
  const created = iso(60 + i * 7, 11);
  const closed = i % 3 === 0;
  return {
    id: i + 1,
    equipment_id: i * 2 + 1,
    type: incidentTypes[i % incidentTypes.length],
    reason: incidentReasons[i % incidentReasons.length],
    status: closed ? "closed" : "open",
    reported_by: i * 2 + 1,
    technician_id: (i % 4) + 1,
    created_at: created,
    resolved_at: closed ? iso(60 + i * 7 + 3, 15) : null,
  };
});

// Incidencias de los personajes agregados.
incidents.push(
  {
    id: 21,
    equipment_id: 43,
    type: "Hardware",
    reason: "Teresa Lisbon le disparó a la laptop",
    status: "open",
    reported_by: 42,
    technician_id: 2,
    created_at: iso(200, 11),
    resolved_at: null,
  },
  {
    id: 22,
    equipment_id: 49,
    type: "Software",
    reason: "La laptop muestra «IT'S ME» y no se apaga ni desconectándola de la corriente o quitándole la batería",
    status: "open",
    reported_by: 38,
    technician_id: 3,
    created_at: iso(202, 10),
    resolved_at: null,
  },
  {
    id: 23,
    equipment_id: 39,
    type: "Software",
    reason: "La computadora no recuerda su usuario ni contraseña",
    status: "open",
    reported_by: 39,
    technician_id: 4,
    created_at: iso(205, 15),
    resolved_at: null,
  },
  {
    id: 24,
    equipment_id: 37,
    type: "Software",
    reason: "La laptop se infectó con un virus llamado Ultron",
    status: "open",
    reported_by: 37,
    technician_id: 2,
    created_at: iso(208, 9),
    resolved_at: null,
  },
);

const eqById = new Map(equipment.map((item) => [item.id, item]));
const operatorById = new Map(operators.map((item) => [item.id, item]));
const userById = new Map(users.map((item) => [item.id, item]));
const eqLabel = (item) => (item ? `${item.brand} ${item.model} · ${item.serial}` : "");

for (const incident of incidents) {
  const matches = assignments.filter((item) => item.equipment_id === incident.equipment_id);
  const original = matches.find((item) => item.status === "active") ?? matches.at(-1);
  incident.reported_by_original = original?.operator_id ?? incident.reported_by;
}
// Un operador distinto reporta una incidencia del equipo asignado a otro.
incidents.find((item) => item.id === 21).reported_by = 37;

const history = [];
for (const item of assignments) {
  if (item.status !== "inactive") continue;
  const eq = eqById.get(item.equipment_id);
  history.push({
    origen: "assignment",
    fecha: item.returned_at ?? item.assigned_at,
    serial: eq?.serial ?? "",
    equipo: eqLabel(eq),
    operador: operatorById.get(item.operator_id)?.name ?? `Operador #${item.operator_id}`,
    tecnico: userById.get(item.assigned_by)?.email ?? "",
    detalle: `Asignación devuelta · entregada el ${item.assigned_at.slice(0, 10)}`,
  });
}
for (const incident of incidents) {
  if (incident.status !== "closed") continue;
  const eq = eqById.get(incident.equipment_id);
  history.push({
    origen: "incident",
    fecha: incident.resolved_at ?? incident.created_at,
    serial: eq?.serial ?? "",
    equipo: eqLabel(eq),
    operador:
      operatorById.get(incident.reported_by_original)?.name ??
      `Operador #${incident.reported_by_original}`,
    tecnico: userById.get(incident.technician_id)?.email ?? "",
    detalle: `${incident.type} · ${incident.reason}`,
  });
}
history.sort((a, b) => b.fecha.localeCompare(a.fecha));
history.forEach((entry, index) => {
  entry.id = index + 1;
});

const seed = { specs, equipment, operators, users, assignments, incidents, history };

mkdirSync(resolve(root, "src/demo"), { recursive: true });
writeFileSync(resolve(root, "src/demo/seed.json"), JSON.stringify(seed, null, 2) + "\n");

console.log(
  `seed.json: ${specs.length} specs, ${equipment.length} equipos, ${operators.length} operadores, ` +
    `${assignments.length} asignaciones, ${incidents.length} incidencias, ${history.length} instantáneas, ${users.length} usuarios`,
);
