export function hasActiveFilters(filters: Record<string, string>): boolean {
  return Object.values(filters).some((value) => value.trim() !== "");
}

export function shouldShowFirstUseGuide(
  total: number,
  filters: Record<string, string>,
): boolean {
  return total === 0 && !hasActiveFilters(filters);
}
