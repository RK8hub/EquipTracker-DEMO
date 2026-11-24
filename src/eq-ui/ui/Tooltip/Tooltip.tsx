import { useCallback, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";
import "./tooltip.css";

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  children: ReactNode;
  placement?: "top" | "bottom";
}

export function Tooltip({ label, children, className, placement = "top", ...props }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const update = useCallback(() => {
    const r = ref.current?.getBoundingClientRect();
    if (r)
      setPos({
        top: placement === "bottom" ? r.bottom + 6 : r.top - 6,
        left: r.left + r.width / 2,
      });
  }, [placement]);

  const hide = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", hide, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", hide, true);
    };
  }, [pos, update, hide]);

  return (
    <span
      ref={ref}
      className={cn("eq-tooltip", className)}
      onMouseEnter={update}
      onMouseLeave={hide}
      onFocus={update}
      onBlur={hide}
      {...props}
    >
      {children}
      {pos &&
        createPortal(
          <span
            role="tooltip"
            className="eq-tooltip__bubble"
            style={{
              top: pos.top,
              left: pos.left,
              transform: `translate(-50%, ${placement === "bottom" ? "0" : "-100%"})`,
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  );
}
