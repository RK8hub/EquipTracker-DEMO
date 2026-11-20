# EquipTracker — Demo

Demostración interactiva de **EquipTracker**, el sistema de control de
inventario de TI. Corre como página estática, sin servidor, sin login y sin
persistencia: los datos son ficticios y se cargan desde `src/demo/seed.json`.

Publicada en <https://demo.equiptracker.rk8.dev>.

La interfaz es la misma del cliente de escritorio; solo se sustituye el
acceso al servidor por un mock en memoria.

## Qué incluye

- Dashboard, Operadores, Equipos, Asignaciones, Incidencias e Historial con
  datos de ejemplo (50 equipos, 42 operadores, 41 asignaciones, 24 incidencias,
  15 instantáneas de historial, 4 usuarios y 10 especificaciones).
- Ficha de equipo con serial, especificaciones, asignaciones e incidencias del
  serial, alta de incidencias desde la ficha y columna «Reportado por» con el
  operador original.
- Historial de solo lectura agrupado por Origen (asignaciones e incidencias
  cerradas), con filtros por origen y serial.
- Alta, edición y eliminación en memoria, con un máximo de 5 elementos
  nuevos por sección. Cerrar una asignación o incidencia genera una
  instantánea nueva en el historial.
- Ajustes con tema (Oscuro, Claro, Dinámico) y nombre de empresa.
- Reinicio automático a los 12 minutos o manual desde el banner.

## Qué no incluye

- Servidor, base de datos, autenticación ni llamadas de red.
- Persistencia: recargar la página devuelve los datos originales.
- Exportación a CSV.
- Contraseñas reales.

## Tecnología

| Capa | Tecnología |
|---|---|
| Sitio | Astro 7 (salida estática) |
| Interfaz | React 19 + TypeScript |
| Estilos | Tailwind CSS v4 con tokens propios (`src/eq-ui`) |
| Iconos | lucide-react |
| Notificaciones | sonner |
| Despliegue | GitHub Pages vía GitHub Actions |

El cliente HTTP real se sustituyó por un mock en memoria en
`src/api/client.ts`, con la misma superficie que consumen las pantallas.

## Desarrollo

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # astro check + build a dist/
pnpm preview
pnpm seed       # regenera src/demo/seed.json
```

El codigo compartido (`eq-ui`, `components`, `tables`, `lib`, `hooks.ts`,
`types.ts`, `index.css`) esta copiado y versionado dentro de `src/`. El repo
no depende de ningun directorio externo ni de otro repositorio para compilar.

## Despliegue

Cada push a `main` publica `dist/` en GitHub Pages mediante
`.github/workflows/deploy.yml`. El dominio se declara en `public/CNAME`
y en `site` dentro de `astro.config.mjs`.

## Licencia

Software bajo **PolyForm Strict License 1.0.0**; marca y assets reservados.
Ver `LICENSE`, `ASSETS.md` y `NOTICE`.
