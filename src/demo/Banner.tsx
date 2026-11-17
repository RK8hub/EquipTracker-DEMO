import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "../eq-ui";

const LIMIT_MS = 12 * 60 * 1000;

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function Banner({ onReset }: { onReset: () => void }) {
  const [deadline] = useState(() => Date.now() + LIMIT_MS);
  const [remaining, setRemaining] = useState(LIMIT_MS);

  useEffect(() => {
    const id = setInterval(() => {
      const left = deadline - Date.now();
      setRemaining(left);
      if (left <= 0) {
        clearInterval(id);
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke bg-card px-6 py-2 text-sm text-muted-foreground">
      <p>
        <span className="font-semibold text-primary">MODO DEMO</span> · datos
        ficticios · los cambios no se guardan · reinicio en{" "}
        <span className="tabular-nums text-primary">{format(remaining)}</span>
      </p>
      <Button
        text="Reiniciar"
        leftIcon={<RotateCcw aria-hidden="true" strokeWidth={1.5} className="size-4" />}
        showLeftIcon
        onClick={onReset}
      />
    </div>
  );
}
