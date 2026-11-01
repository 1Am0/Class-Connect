export function sortClassesByPeriod<
  T extends { period_number: number; name: string },
>(classes: T[]): T[] {
  return [...classes].sort(
    (a, b) => a.period_number - b.period_number || a.name.localeCompare(b.name),
  );
}
