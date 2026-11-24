import { useCallback, useEffect, useRef, useState } from "react";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado";
}

export type FieldFlash = (name: string) => {
  className?: string;
  containerClassName?: string;
};

/** Destello y mensaje de validación; alterna clases para repetir la animación sin remontar. */
export function useFieldFlash() {
  const [state, setState] = useState<{
    fields: string[];
    id: number;
    messages: Record<string, string>;
  }>({ fields: [], id: 0, messages: {} });
  const animationClass = state.id % 2 ? "eq-field-flash-b" : "eq-field-flash-a";
  const field: FieldFlash = (name) => ({
    className: state.fields.includes(name) ? animationClass : undefined,
  });
  return {
    flash: (fields: string[], message = "Requerido") =>
      setState((current) => ({
        fields,
        id: current.id + 1,
        messages: Object.fromEntries(fields.map((name) => [name, message])),
      })),
    clear: () =>
      setState((current) => ({ fields: [], id: current.id + 1, messages: {} })),
    error: (name: string) => state.messages[name],
    field,
    textField: (name: string) => ({ containerClassName: field(name).className }),
  };
}

export function useSort<T extends string>(initial: T) {
  const [sortBy, setSortBy] = useState<T>(initial);
  const [sortOpen, setSortOpen] = useState(false);
  return {
    sortBy,
    sortOpen,
    setSortBy,
    toggle: () => setSortOpen((value) => !value),
    select: (value: T) => {
      setSortBy(value);
      setSortOpen(false);
    },
  };
}

export function usePagination<T>(items: T[], pageSize = 8) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  useEffect(() => {
    setPage(0);
  }, [items.length]);
  const start = safePage * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    page: safePage,
    totalPages,
    pageItems,
    next: () => setPage((value) => Math.min(value + 1, totalPages - 1)),
    prev: () => setPage((value) => Math.max(value - 1, 0)),
  };
}

/** Evita una petición por tecla en búsquedas; el valor visible sigue siendo inmediato. */
export function useDebouncedValue<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fn()
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(errorMessage(err));
        setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, reload };
}

export function useScrollPreserve() {
  const distanceRef = useRef(0);
  const capture = useCallback(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (main) {
      distanceRef.current = main.scrollHeight - main.scrollTop - main.clientHeight;
    }
  }, []);
  const restore = useCallback(() => {
    const main = document.querySelector("main") as HTMLElement | null;
    if (main) {
      const target = main.scrollHeight - main.clientHeight - distanceRef.current;
      main.scrollTop = Math.max(0, target);
    }
  }, []);
  return { capture, restore };
}
