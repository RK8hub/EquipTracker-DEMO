import { useState } from "react";
import { Toaster } from "sonner";
import { Button, Sidebar, type SidebarItem } from "../eq-ui";
import { equiptrackerNavigation } from "../eq-ui/domain/navigation";
import { ModalCard } from "../components/ModalCard";
import { applyTheme, type Theme } from "../lib/theme";
import { DashboardScreen } from "../screens/Dashboard";
import { OperatorsScreen } from "../screens/Operators";
import { EquipmentScreen } from "../screens/Equipment";
import { AssignmentsScreen } from "../screens/Assignments";
import { IncidentsScreen } from "../screens/Incidents";
import { UsersScreen } from "../screens/Users";
import { SettingsScreen } from "../screens/Settings";
import { Banner } from "./Banner";

type PageId =
  | "dashboard"
  | "operadores"
  | "equipos"
  | "asignaciones"
  | "incidencias"
  | "usuarios"
  | "ajustes";

export function DemoApp() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [companyName, setCompanyName] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState("#0872D8");
  const [introOpen, setIntroOpen] = useState(true);

  function closeIntro() {
    setIntroOpen(false);
  }

  function reset() {
    window.location.reload();
  }

  const items: SidebarItem[] = equiptrackerNavigation.map((item) => ({
    ...item,
    active: item.id === page,
  }));

  let screen = <DashboardScreen />;
  if (page === "operadores") screen = <OperatorsScreen />;
  else if (page === "equipos") screen = <EquipmentScreen />;
  else if (page === "asignaciones") screen = <AssignmentsScreen />;
  else if (page === "incidencias") screen = <IncidentsScreen />;
  else if (page === "usuarios") screen = <UsersScreen />;
  else if (page === "ajustes")
    screen = (
      <SettingsScreen
        companyName={companyName}
        theme={theme}
        accent={accent}
        onCompanyChange={setCompanyName}
        onThemeChange={setTheme}
        onAccentChange={(value) => {
          setAccent(value);
          applyTheme(theme, value);
        }}
      />
    );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Banner onReset={reset} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          className="h-full shrink-0"
          workspace={{ name: "EquipTracker", company: companyName || "demo.local" }}
          user={{ name: "Administrador", email: "admin@demo.local" }}
          items={items}
          onNavigate={(id) => setPage(id as PageId)}
          onUserClick={() => setPage("ajustes")}
          onWorkspaceClick={() => setPage("usuarios")}
        />
        <main className="flex-1 overflow-y-auto p-8">{screen}</main>
      </div>

      <Toaster
        theme={theme === "light" ? "light" : "dark"}
        richColors
        position="top-right"
      />

      {introOpen && (
        <ModalCard
          title="Estás viendo una demo"
          description="Datos ficticios, sin servidor y sin persistencia."
          onClose={closeIntro}
          footer={<Button className="mx-auto" text="Entrar a la demo" variant="primary" onClick={closeIntro} />}
        >
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
            <li>Los datos son inventados y no se guardan en ningún sitio.</li>
            <li>Puedes agregar hasta 5 elementos por sección.</li>
            <li>La exportación a CSV está deshabilitada.</li>
            <li>Los usuarios son simulados; las contraseñas no se aplican.</li>
            <li>Todo se reinicia automáticamente cada 12 minutos.</li>
          </ul>
        </ModalCard>
      )}
    </div>
  );
}
