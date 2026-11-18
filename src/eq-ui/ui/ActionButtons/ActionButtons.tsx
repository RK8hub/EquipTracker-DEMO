import { Plus, Trash2 } from "lucide-react";
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "../../lib/cn";
import { Tooltip } from "../Tooltip";
import "./action-buttons.css";

export interface ActionButtonsProps extends HTMLAttributes<HTMLDivElement> {
  onAdd?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  onDelete?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  showDelete?: boolean;
  addLabel?: string;
  deleteLabel?: string;
}

export function ActionButtons({
  onAdd,
  onDelete,
  showDelete = true,
  addLabel = "Agregar",
  deleteLabel = "Eliminar",
  className,
  ...props
}: ActionButtonsProps) {
  return (
    <div className={cn("eq-action-buttons", className)} {...props}>
      <Tooltip label={addLabel}>
        <button type="button" aria-label={addLabel} onClick={onAdd}>
          <Plus aria-hidden="true" strokeWidth={1.5} />
        </button>
      </Tooltip>
      {showDelete && (
        <Tooltip label={deleteLabel}>
          <button type="button" aria-label={deleteLabel} onClick={onDelete}>
            <Trash2 aria-hidden="true" strokeWidth={1.5} />
          </button>
        </Tooltip>
      )}
    </div>
  );
}
