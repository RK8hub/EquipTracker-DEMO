import { ChevronRight, ChevronDown } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import "./tab.css";

export interface TabProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  icon?: ReactNode;
  active?: boolean;
  showChevron?: boolean;
  collapsed?: boolean;
}

export function Tab({
  label,
  icon,
  active = false,
  showChevron = true,
  collapsed = false,
  className,
  type = "button",
  title,
  ...props
}: TabProps) {
  const Chevron = active ? ChevronDown : ChevronRight;

  return (
    <button
      type={type}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={title ?? (collapsed ? label : undefined)}
      className={cn("eq-tab", active && "eq-tab--active", collapsed && "eq-tab--collapsed", className)}
      {...props}
    >
      <span className="eq-tab__label">
        {icon && <span className="eq-tab__icon">{icon}</span>}
        {!collapsed && label}
      </span>
      {showChevron && !collapsed && (
        <Chevron
          aria-hidden="true"
          strokeWidth={1.5}
          className="eq-tab__chevron"
        />
      )}
    </button>
  );
}
