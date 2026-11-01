import type { Status } from "@/types";

export type RosterShortcut =
  | { kind: "search" }
  | { kind: "clear" }
  | { kind: "move"; studentId: string }
  | { kind: "mark"; studentId: string; status: Status; next: string | null }
  | { kind: "note"; studentId: string };

const statusKeys: Record<string, Status> = {
  p: "present",
  a: "absent",
  l: "late",
  e: "excused",
};

/**
 * What a key does on the roster, given the students in view and the one the
 * keyboard is on (null before the first move). Marking moves on to the next
 * student, so a class can be marked without leaving the keyboard.
 */
export function rosterShortcut(
  key: string,
  ids: readonly string[],
  current: string | null,
): RosterShortcut | null {
  if (key === "/") return { kind: "search" };
  const index = current ? ids.indexOf(current) : -1;
  if (key === "Escape") return index >= 0 ? { kind: "clear" } : null;
  if (!ids.length) return null;
  if (key === "ArrowDown" || key === "j" || key === "J")
    return {
      kind: "move",
      studentId: ids[index < 0 ? 0 : Math.min(index + 1, ids.length - 1)],
    };
  if (key === "ArrowUp" || key === "k" || key === "K")
    return { kind: "move", studentId: ids[index <= 0 ? 0 : index - 1] };
  const on = index < 0 ? 0 : index;
  const status = statusKeys[key.toLowerCase()];
  if (status && key.length === 1)
    return {
      kind: "mark",
      studentId: ids[on],
      status,
      next: ids[on + 1] ?? null,
    };
  if (key === "n" || key === "N") return { kind: "note", studentId: ids[on] };
  return null;
}
