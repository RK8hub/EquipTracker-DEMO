import { useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Button, Sidebar, type SidebarItem } from "../eq-ui";
import { equiptrackerNavigation } from "../eq-ui/domain/navigation";
import { ModalCard } from "../components/ModalCard";
import { applyTheme, isDarkSeed, type Theme } from "../lib/theme";
import { DashboardScreen } from "../screens/Dashboard";
import { OperatorsScreen } from "../screens/Operators";
import { EquipmentScreen } from "../screens/Equipment";
import { EquipmentDetailScreen } from "../screens/EquipmentDetail";
import { OperatorDetailScreen } from "../screens/OperatorDetail";
import { HistoryScreen } from "../screens/History";
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
  | "historial"
  | "usuarios"
  | "ajustes";

export function DemoApp() {
  const [page, setPage] = useState<PageId>("dashboard");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [operatorDetailId, setOperatorDetailId] = useState<number | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState("#0872D8");
  const [introOpen, setIntroOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  }));

  useEffect(() => {
    const update = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setDetailId(null);
    setOperatorDetailId(null);
  }, [page]);

  function closeIntro() {
    setIntroOpen(false);
  }

  function reset() {
    window.location.reload();
  }

  const shortSide = Math.min(viewport.width, viewport.height);
  const longSide = Math.max(viewport.width, viewport.height);
  const isPhoneLike = shortSide < 600 || longSide < 1024;
  const rotateScreen = !isPhoneLike && viewport.height > viewport.width;

  if (rotateScreen || isPhoneLike) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-[24px] border-2 border-stroke bg-object p-6 text-center text-primary">
          <h1 className="text-xl font-semibold">
            {rotateScreen ? "Rota la pantalla" : "Resolución no compatible"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {rotateScreen
              ? "Gira tu dispositivo a horizontal para usar EquipTracker en esta pantalla."
              : "EquipTracker está diseñado para PC y tablets. Esta resolución de pantalla no es compatible."}
          </p>
        </div>
      </div>
    );
  }

  const items: SidebarItem[] = equiptrackerNavigation.map((item) => ({
    ...item,
    active: item.id === page,
  }));

  let screen =
    detailId !== null ? (
      <EquipmentDetailScreen equipmentId={detailId} onBack={() => setDetailId(null)} />
    ) : operatorDetailId !== null ? (
      <OperatorDetailScreen
        operatorId={operatorDetailId}
        onBack={() => setOperatorDetailId(null)}
      />
    ) : (
      <DashboardScreen canExportCsv={false} />
    );
  const detailOpen = detailId !== null || operatorDetailId !== null;
  if (!detailOpen && page === "operadores")
    screen = <OperatorsScreen onOpenOperator={setOperatorDetailId} />;
  else if (!detailOpen && page === "equipos")
    screen = <EquipmentScreen onOpenDetail={setDetailId} />;
  else if (!detailOpen && page === "asignaciones") screen = <AssignmentsScreen />;
  else if (!detailOpen && page === "incidencias") screen = <IncidentsScreen />;
  else if (!detailOpen && page === "historial")
    screen = (
      <HistoryScreen
        historyNotice="El historial guarda instantáneas inmutables; la trazabilidad disponible depende del plan."
      />
    );
  else if (!detailOpen && page === "usuarios") screen = <UsersScreen />;
  else if (!detailOpen && page === "ajustes")
    screen = (
      <SettingsScreen
        companyName={companyName}
        theme={theme}
        accent={accent}
        onCompanyChange={setCompanyName}
        onThemeChange={(value) => {
          setTheme(value);
          applyTheme(value, accent);
        }}
        onAccentChange={(value) => {
          setAccent(value);
          applyTheme(theme, value);
        }}
      />
    );

  const toasterTheme =
    theme === "light" ? "light" : theme === "dark" ? "dark" : isDarkSeed(accent) ? "dark" : "light";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Banner onReset={reset} />
      <div className="flex min-h-0 flex-1">
        <Sidebar
          className="h-full shrink-0"
          workspace={{ name: "EquipTracker", company: companyName || "demo.local" }}
          user={{ name: "Administrador", email: "admin@demo.local" }}
          items={items}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
          onNavigate={(id) => setPage(id as PageId)}
          onUserClick={() => setPage("ajustes")}
          onWorkspaceClick={() => setPage("usuarios")}
        />
        <main className="flex-1 overflow-y-auto p-8">{screen}</main>
      </div>

      <Toaster theme={toasterTheme} richColors position="top-right" />

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
            <li>Abre la ficha de un equipo y consulta el historial; la exportación a CSV sigue deshabilitada.</li>
            <li>Los usuarios son simulados; las contraseñas no se aplican.</li>
            <li>Todo se reinicia automáticamente cada 12 minutos.</li>
          </ul>
        </ModalCard>
      )}
    </div>
  );
}
