import type { ReactNode } from "react";
import { Plus } from "lucide-react";

export interface GuideStep {
  label: string;
  icon: ReactNode;
}

export function GuideSteps({ steps }: { steps: GuideStep[] }) {
  return (
    <ol className="flex w-full max-w-xl flex-wrap justify-between gap-x-4 gap-y-3">
      {steps.map((step, index) => (
        <li
          key={step.label}
          className="flex h-28 w-[134px] flex-col items-center gap-1 rounded-[var(--radius-field)] border border-stroke p-3 text-center"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-input)] bg-border/60 text-primary">
            {step.icon}
          </span>
          <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
            Paso {index + 1}
          </span>
          <span className="mt-auto flex h-10 items-end justify-center overflow-hidden text-center">
            <span className="line-clamp-3 text-[11px] leading-tight text-primary">
              {step.label}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function FirstUseGuide({
  icon,
  title,
  description,
  steps,
  action,
  onCreate,
  onAdvanced,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  steps: GuideStep[];
  action: string;
  onCreate?: () => void;
  onAdvanced?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[var(--radius-card)] border border-stroke bg-object px-8 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-[var(--radius-card)] bg-border/40 text-primary">
        {icon}
      </div>
      <div className="max-w-xl space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <GuideSteps steps={steps} />
      {onCreate && (
        <>
          <button
            type="button"
            onClick={onCreate}
            aria-label={`Crear ${action}`}
            className="flex size-20 items-center justify-center rounded-[var(--radius-card)] border border-stroke bg-object text-primary outline-none transition-colors hover:bg-border/60 focus-visible:ring-[3px] focus-visible:ring-zinc-400/50"
          >
            <Plus aria-hidden="true" strokeWidth={1.5} className="size-9" />
          </button>
          <span className="text-sm text-primary">Crear {action}</span>
        </>
      )}
      {onAdvanced && (
        <button
          type="button"
          onClick={onAdvanced}
          className="text-xs text-muted-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-zinc-400/50"
        >
          Ver tabla y filtros
        </button>
      )}
    </div>
  );
}
