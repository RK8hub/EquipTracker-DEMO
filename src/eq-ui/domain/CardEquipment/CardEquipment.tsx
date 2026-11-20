import { EllipsisVertical, Monitor, User } from "lucide-react";
import type { HTMLAttributes } from "react";
import { Checkbox } from "../../ui/Checkbox";
import { Tag } from "../../ui/Tag";
import { cn } from "../../lib/cn";
import "./card-equipment.css";

export interface CardEquipmentProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  serial?: string;
  operator: string;
  incidents?: number | string;
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  onOpen?: () => void;
  onMore?: () => void;
}

export function CardEquipment({
  name,
  serial,
  operator,
  incidents = 0,
  selected = false,
  onSelectedChange,
  onOpen,
  onMore,
  className,
  ...props
}: CardEquipmentProps) {
  const hasIncidents = Number(incidents) > 0;

  return (
    <div className={cn("eq-card-equipment", className)} {...props}>
      <div className="eq-card-equipment__head">
        <button
          type="button"
          className="eq-card-equipment__open"
          aria-label={`Abrir ficha de ${name}${serial ? ` · ${serial}` : ""}`}
          onClick={onOpen}
        >
          <div className="eq-card-equipment__avatar">
            <Monitor aria-hidden="true" strokeWidth={1.5} />
          </div>
          <div className="eq-card-equipment__info">
            <span className="eq-card-equipment__name">{name}</span>
            {serial && <span className="eq-card-equipment__serial">{serial}</span>}
            <span className="eq-card-equipment__operator">
              <User aria-hidden="true" strokeWidth={1.5} />
              {operator}
            </span>
          </div>
        </button>
        <Checkbox
          label="Seleccionar equipo"
          checked={selected}
          onCheckedChange={onSelectedChange}
        />
      </div>

      <div className="eq-card-equipment__footer">
        <button
          type="button"
          aria-label="Más opciones"
          onClick={onMore}
          className="eq-card-equipment__more"
        >
          <EllipsisVertical aria-hidden="true" strokeWidth={1.5} />
        </button>
        {hasIncidents && <Tag label="Incidencias" quantity={incidents} />}
      </div>
    </div>
  );
}
