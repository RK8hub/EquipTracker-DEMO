import { Plus } from "lucide-react";

export function EmptyCollection({
  label,
  action,
  onCreate,
}: {
  label: string;
  action: string;
  onCreate?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-16 text-center">
      <p className="text-sm text-muted-foreground">Sin {label} registrados.</p>
      {onCreate && (
        <>
          <button
            type="button"
            onClick={onCreate}
            aria-label={`Crear ${action}`}
            className="flex size-24 items-center justify-center rounded-[var(--radius-card)] border border-stroke bg-object text-primary outline-none transition-colors hover:bg-border/60 focus-visible:ring-[3px] focus-visible:ring-zinc-400/50"
          >
            <Plus aria-hidden="true" strokeWidth={1.5} className="size-10" />
          </button>
          <span className="text-sm text-primary">Crear {action}</span>
        </>
      )}
    </div>
  );
}
