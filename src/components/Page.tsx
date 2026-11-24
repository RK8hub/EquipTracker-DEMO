import type { ReactNode } from "react";
import { cn } from "../eq-ui/lib/cn";

export interface PageProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  fluid?: boolean;
  className?: string;
}

export function Page({ title, subtitle, actions, children, fluid = false, className }: PageProps) {
  return (
    <div className={cn(fluid ? "flex w-full flex-col gap-8" : "mx-auto flex w-full max-w-[1165px] flex-col gap-8", className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}
