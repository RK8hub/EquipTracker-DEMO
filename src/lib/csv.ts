// DEMO: la exportación real descarga un archivo; aquí solo se avisa.
import { toast } from "sonner";

export interface CsvColumn {
  key: string;
  header: string;
}

export function exportToCsv(
  _rows: Record<string, unknown>[],
  _columns: CsvColumn[],
  _filename: string,
): void {
  toast.error("Exportación deshabilitada en la demo.");
}
