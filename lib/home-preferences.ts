import type { Period } from "@/types";

// Validated by homeClassesInput in lib/server/home-preferences.ts.
export interface HomeClassPreferences {
  order: string[];
}

export function orderHomeClasses(classes: Period[], order: string[]): Period[] {
  const positions = new Map(order.map((id, index) => [id, index]));
  return [...classes].sort((a, b) => {
    const aPosition = positions.get(a.id);
    const bPosition = positions.get(b.id);
    if (aPosition !== undefined || bPosition !== undefined) {
      if (aPosition === undefined) return 1;
      if (bPosition === undefined) return -1;
      return aPosition - bPosition;
    }
    return a.period_number - b.period_number || a.name.localeCompare(b.name);
  });
}

export function reorderHomeClass(
  order: string[],
  draggedId: string,
  targetId: string,
): string[] {
  const from = order.indexOf(draggedId);
  const to = order.indexOf(targetId);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, draggedId);
  return next;
}
