import { Button } from "../eq-ui";
import { Page } from "./Page";

export function Loading() {
  return (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Cargando…
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-destructive/40 bg-destructive/10 p-8 text-center">
      <p className="text-sm text-primary">{message}</p>
      {onRetry && <Button text="Reintentar" onClick={onRetry} />}
    </div>
  );
}

function Bar({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`eq-skeleton animate-pulse rounded bg-border/80 ${className}`}
    />
  );
}

function ToolbarSkeleton() {
  return (
    <div className="flex h-[46px] flex-wrap items-center justify-between gap-3">
      <Bar className="h-10 w-64 max-w-full" />
      <div className="flex gap-2">
        <Bar className="h-10 w-28" />
        <Bar className="h-10 w-32" />
      </div>
    </div>
  );
}

function TableSkeleton({ columns, rows }: { columns: number; rows: number }) {
  return (
    <div className="flex w-full flex-col gap-5">
      <ToolbarSkeleton />
      <div className="w-full overflow-x-auto">
        <div className="min-w-[900px] overflow-hidden rounded-[14px] border border-stroke bg-object">
          <div className="flex h-[48px] items-center gap-4 border-b border-stroke/60 px-3">
            <Bar className="size-4 shrink-0" />
            {Array.from({ length: columns }, (_, index) => (
              <Bar key={index} className="h-3 flex-1" />
            ))}
          </div>
          {Array.from({ length: rows }, (_, row) => (
            <div
              key={row}
              className="flex h-[64px] items-center gap-4 border-b border-stroke/60 px-3 last:border-b-0"
            >
              <Bar className="size-4 shrink-0" />
              {Array.from({ length: columns }, (_, column) => (
                <Bar key={column} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center">
        <Bar className="h-5 w-44" />
      </div>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 2 }, (_, card) => (
        <div
          key={card}
          className="flex flex-col gap-4 rounded-[24px] border border-stroke bg-card p-6"
        >
          <Bar className="h-6 w-40" />
          <Bar className="h-10 w-full" />
          <Bar className="h-10 w-full" />
          <Bar className="h-16 w-full" />
          <Bar className="h-10 w-32 self-end" />
        </div>
      ))}
    </div>
  );
}

function EquipmentCardsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8">
      <ToolbarSkeleton />
      <div className="grid justify-between items-center gap-x-7 gap-y-10 [grid-template-columns:repeat(auto-fill,300px)]">
        {Array.from({ length: 6 }, (_, card) => (
          <div
            key={card}
            data-skeleton-card="equipment"
            className="flex min-h-[160px] w-full max-w-[300px] flex-col justify-between gap-2.5 rounded-[24px] bg-object p-5"
          >
            <div className="flex w-full items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <Bar className="size-16 shrink-0 rounded-full" />
                <div className="flex flex-col gap-2">
                  <Bar className="h-4 w-28" />
                  <Bar className="h-3 w-20" />
                  <Bar className="h-3 w-24" />
                </div>
              </div>
              <Bar className="size-5 shrink-0" />
            </div>
            <div className="flex w-full items-center justify-between">
              <Bar className="h-4 w-24" />
              <Bar className="size-10 rounded-[14px]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperatorCardsSkeleton() {
  return (
    <div className="flex w-full flex-col gap-8">
      <ToolbarSkeleton />
      <div className="grid justify-between items-center gap-x-12 gap-y-15 [grid-template-columns:repeat(auto-fill,200px)]">
        {Array.from({ length: 8 }, (_, card) => (
          <div
            key={card}
            data-skeleton-card="operator"
            className="flex min-h-[300px] w-full max-w-[200px] flex-col items-center gap-[27px] rounded-[24px] bg-object p-5"
          >
            <div className="flex w-full items-center justify-between">
              <Bar className="size-4" />
              <Bar className="size-10 rounded-[14px]" />
            </div>
            <div className="flex flex-col items-center gap-[27px]">
              <Bar className="size-16 rounded-full" />
              <div className="flex flex-col items-center gap-2">
                <Bar className="h-4 w-24" />
                <Bar className="h-3 w-20" />
                <Bar className="h-3 w-16" />
              </div>
            </div>
            <Bar className="h-7 w-28 rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 4 }, (_, card) => (
          <Bar key={card} className="h-[110px] w-[180px] rounded-[14px]" />
        ))}
      </div>
      <Bar className="h-32 w-full rounded-[24px]" />
      <TableSkeleton columns={6} rows={3} />
      <TableSkeleton columns={6} rows={3} />
    </div>
  );
}

export function ScreenSkeleton({
  title,
  subtitle,
  variant = "table",
  columns = 5,
  rows = 5,
  fluid = false,
}: {
  title: string;
  subtitle?: string;
  variant?: "dashboard" | "table" | "users" | "equipment-cards" | "operator-cards" | "detail";
  columns?: number;
  rows?: number;
  fluid?: boolean;
}) {
  return (
    <Page title={title} subtitle={subtitle} fluid={fluid}>
      {variant === "dashboard" && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-16">
            {Array.from({ length: 3 }, (_, card) => (
              <div
                key={card}
                className="flex h-[136px] w-full max-w-[230px] flex-col items-center justify-evenly gap-1 rounded-[12px] bg-object px-6"
              >
                <Bar className="size-8 rounded-full" />
                <Bar className="h-10 w-20" />
                <Bar className="h-4 w-28" />
              </div>
            ))}
          </div>
          <TableSkeleton columns={columns} rows={rows} />
        </>
      )}
      {variant === "users" && <CardsSkeleton />}
      {variant === "equipment-cards" && <EquipmentCardsSkeleton />}
      {variant === "operator-cards" && <OperatorCardsSkeleton />}
      {variant === "detail" && <DetailSkeleton />}
      {variant === "table" && <TableSkeleton columns={columns} rows={rows} />}
    </Page>
  );
}
