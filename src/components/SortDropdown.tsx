import { useEffect, useId, useRef } from "react";
import { DropdownButton, Tooltip } from "../eq-ui";

export interface SortOption<T extends string> {
  value: T;
  label: string;
}

export interface SortDropdownProps<T extends string> {
  options: readonly SortOption<T>[];
  value: T;
  open: boolean;
  onToggle: () => void;
  onSelect: (value: T) => void;
}

export function SortDropdown<T extends string>({
  options,
  value,
  open,
  onToggle,
  onSelect,
}: SortDropdownProps<T>) {
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onToggle();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onToggle();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <Tooltip label="Ordenar por criterio">
        <DropdownButton
          label={current?.label ?? ""}
          open={open}
          aria-haspopup="menu"
          aria-controls={open ? menuId : undefined}
          onClick={onToggle}
        />
      </Tooltip>
      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-11.5 z-10 w-40 rounded-[8px] border border-stroke bg-object p-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={option.value === value}
              className="flex w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-border/60"
              onClick={() => onSelect(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
