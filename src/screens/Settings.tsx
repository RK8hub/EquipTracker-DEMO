import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, SelectField, Textfield } from "../eq-ui";
import { Page } from "../components/Page";
import { applyTheme, type Theme } from "../lib/theme";

export interface SettingsScreenProps {
  companyName: string;
  theme: Theme;
  accent: string;
  onCompanyChange: (value: string) => void;
  onThemeChange: (value: Theme) => void;
  onAccentChange: (value: string) => void;
}

export function SettingsScreen({
  companyName,
  theme,
  accent,
  onCompanyChange,
  onThemeChange,
  onAccentChange,
}: SettingsScreenProps) {
  const [companyInput, setCompanyInput] = useState(companyName);
  const [accentInput, setAccentInput] = useState(accent);

  useEffect(() => {
    setCompanyInput(companyName);
  }, [companyName]);

  useEffect(() => {
    setAccentInput(accent);
  }, [accent]);

  return (
    <Page title="Ajustes" subtitle="Preferencias de la aplicación.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-[24px] border border-stroke bg-card p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Apariencia</h2>
          <SelectField
            label="Tema"
            value={theme}
            onChange={(value) => {
              const next = value as Theme;
              onThemeChange(next);
              applyTheme(next, accent);
              toast.success(
                `Tema ${next === "dark" ? "oscuro" : next === "light" ? "claro" : "dinámico"} activado`,
              );
            }}
            options={[
              { value: "dark", label: "Oscuro" },
              { value: "light", label: "Claro" },
              { value: "dynamic", label: "Dinámico" },
            ]}
          />
          {theme === "dynamic" && (
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={accentInput}
                onChange={(event) => setAccentInput(event.target.value)}
                className="h-[42px] w-[60px] cursor-pointer rounded-[8px] border border-stroke bg-object"
              />
              <span className="text-sm text-muted-foreground flex-1">
                {accentInput}
              </span>
              <Button
                text="Aplicar"
                onClick={() => {
                  onAccentChange(accentInput);
                  applyTheme("dynamic", accentInput);
                  toast.success("Color de acento actualizado");
                }}
              />
            </div>
          )}
        </section>

        <section className="rounded-[24px] border border-stroke bg-card p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Empresa</h2>
          <Textfield
            label="Nombre de la empresa"
            placeholder="Mi empresa"
            value={companyInput}
            onChange={(event) => setCompanyInput(event.target.value)}
            showIcon={false}
          />
          <Button
            text="Guardar"
            onClick={() => {
              onCompanyChange(companyInput.trim());
              toast.success("Empresa actualizada");
            }}
          />
        </section>
      </div>
    </Page>
  );
}
