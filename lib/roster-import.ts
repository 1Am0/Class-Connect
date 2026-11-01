import type { Student } from "@/types";
import {
  schoolEmailFromStudentId,
  schoolStudentIdError,
} from "./school-student-id";

export interface RosterRow {
  first_name: string;
  last_name: string;
  school_student_id: string | null;
  school_email?: string | null;
  existing_student_id?: string | null;
}
export interface PlannedRow extends RosterRow {
  existing_student_id: string | null;
  issue: "possible_match" | "ambiguous" | "invalid" | "id_name_mismatch" | null;
  candidates: Student[];
}
export type ImportMode = "add" | "sync";

const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const key = (first: string, last: string) =>
  `${clean(first)}\0${clean(last)}`.toLocaleLowerCase();
export const rosterName = (row: Pick<RosterRow, "first_name" | "last_name">) =>
  `${row.first_name} ${row.last_name}`.trim();

export function parseDelimited(
  text: string,
  delimiter: "," | "\t" = ",",
): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted)
    throw new Error(
      "A quoted cell is not closed. Check the file and try again.",
    );
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

export function splitFullName(
  value: string,
  order: "first_last" | "last_first" = "first_last",
  commaOrder: "first_last" | "last_first" = "last_first",
) {
  const name = clean(value);
  if (name.includes(",")) {
    const [last, first] = name.split(/,(.*)/s).map(clean);
    return commaOrder === "last_first"
      ? { first_name: first, last_name: last }
      : { first_name: last, last_name: first };
  }
  const parts = name.split(" ");
  if (parts.length < 2) return { first_name: name, last_name: "" };
  return order === "last_first"
    ? { first_name: parts.slice(1).join(" "), last_name: parts[0] }
    : { first_name: parts[0], last_name: parts.slice(1).join(" ") };
}

const firstHeader = /^(first\s*name|given\s*name|first)$/i;
const lastHeader = /^(last\s*name|surname|family\s*name|last)$/i;
const fullHeader = /^(student|student\s*name|full\s*name|name)$/i;
const idHeader = /^(student\s*(number|id|#)|school\s*(number|id)|id)$/i;
const emailHeader =
  /^(school\s*(google\s*)?email|student\s*email|email\s*address|email)$/i;
export interface ColumnMap {
  first: number | null;
  last: number | null;
  full: number | null;
  id: number | null;
  email?: number | null;
}
export function suggestColumns(headers: string[]): ColumnMap {
  const find = (pattern: RegExp) => {
    const index = headers.findIndex((h) => pattern.test(h.trim()));
    return index < 0 ? null : index;
  };
  return {
    first: find(firstHeader),
    last: find(lastHeader),
    full: find(fullHeader),
    id: find(idHeader),
    email: find(emailHeader),
  };
}
export function mapRosterRows(
  rows: string[][],
  mapping: ColumnMap,
  order: "first_last" | "last_first" = "first_last",
  commaOrder: "first_last" | "last_first" = "last_first",
): RosterRow[] {
  const value = (row: string[], index: number | null) =>
    index === null ? "" : clean(row[index] ?? "");
  return rows.map((row) => ({
    ...(mapping.full !== null
      ? splitFullName(value(row, mapping.full), order, commaOrder)
      : {
          first_name: value(row, mapping.first),
          last_name: value(row, mapping.last),
        }),
    school_student_id: value(row, mapping.id) || null,
    ...(mapping.email != null
      ? { school_email: value(row, mapping.email).toLowerCase() || null }
      : {}),
  }));
}

export function parseRosterText(
  text: string,
  source: "paste" | "csv",
  order: "first_last" | "last_first" = "first_last",
  commaOrder: "first_last" | "last_first" = "last_first",
): RosterRow[] {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows = parseDelimited(text, delimiter);
  if (!rows.length) return [];
  const suggested = suggestColumns(rows[0]);
  if (
    suggested.full !== null ||
    (suggested.first !== null && suggested.last !== null)
  )
    return mapRosterRows(rows.slice(1), suggested, order, commaOrder);
  if (source === "csv")
    throw new Error("Map the file columns before previewing the roster.");
  return rows.map((row) => {
    if (delimiter === "\t" && row.length >= 2)
      return {
        first_name: clean(row[0]),
        last_name: clean(row[1]),
        school_student_id: clean(row[2] ?? "") || null,
      };
    if (row.length === 1)
      return {
        ...splitFullName(row[0], order, commaOrder),
        school_student_id: null,
      };
    if (row[0].includes(","))
      return {
        ...splitFullName(row[0], order, commaOrder),
        school_student_id: clean(row[1] ?? "") || null,
      };
    return commaOrder === "last_first"
      ? {
          first_name: clean(row[1]),
          last_name: clean(row[0]),
          school_student_id: clean(row[2] ?? "") || null,
        }
      : {
          first_name: clean(row[0]),
          last_name: clean(row[1]),
          school_student_id: clean(row[2] ?? "") || null,
        };
  });
}

export function planRoster(
  rows: RosterRow[],
  students: Student[],
  rosterIds: string[],
) {
  const enrolled = new Set(rosterIds);
  const byNumber = new Map(
    students
      .filter((student) => student.school_student_id)
      .map((student) => [student.school_student_id, student]),
  );
  const byEmail = new Map(
    students
      .filter((student) => student.school_email)
      .map((student) => [student.school_email!.toLowerCase(), student]),
  );
  const byName = new Map<string, Student[]>();
  for (const student of students) {
    const name = key(student.first_name, student.last_name);
    const group = byName.get(name);
    if (group) group.push(student);
    else byName.set(name, [student]);
  }
  const planned: PlannedRow[] = rows.map((row) => {
    const first_name = clean(row.first_name),
      last_name = clean(row.last_name);
    const school_student_id = clean(row.school_student_id ?? "") || null;
    const school_email = clean(row.school_email ?? "").toLowerCase() || null;
    const numberMatch = school_student_id
      ? byNumber.get(school_student_id)
      : undefined;
    const emailMatch = school_email ? byEmail.get(school_email) : undefined;
    const idMatch = numberMatch ?? emailMatch;
    const candidates = byName.get(key(first_name, last_name)) ?? [];
    const existing_student_id =
      row.existing_student_id === undefined
        ? (idMatch?.id ?? null)
        : row.existing_student_id;
    const issue =
      !first_name ||
      !last_name ||
      (numberMatch && emailMatch && numberMatch.id !== emailMatch.id)
        ? "invalid"
        : idMatch &&
            row.existing_student_id !== undefined &&
            row.existing_student_id !== idMatch.id
          ? "invalid"
          : idMatch &&
              key(idMatch.first_name, idMatch.last_name) !==
                key(first_name, last_name)
            ? "id_name_mismatch"
            : !existing_student_id && candidates.length > 1
              ? "ambiguous"
              : !existing_student_id && candidates.length === 1
                ? "possible_match"
                : null;
    return {
      first_name,
      last_name,
      school_student_id,
      ...(row.school_email !== undefined ? { school_email } : {}),
      existing_student_id,
      issue,
      candidates,
    };
  });
  const keep = new Set(
    planned.map((r) => r.existing_student_id).filter(Boolean),
  );
  return {
    rows: planned,
    removals: rosterIds.filter((id) => !keep.has(id)),
    enrolled,
  };
}

export function validateImport(
  rows: RosterRow[],
  students: Student[],
): string | null {
  if (!rows.length) return "Enter at least one student.";
  if (rows.length > 500) return "Import at most 500 students at a time.";
  const ids = new Set<string>(),
    numbers = new Set<string>(),
    emails = new Set<string>();
  const byId = new Map(students.map((student) => [student.id, student]));
  const byNumber = new Map(
    students
      .filter((student) => student.school_student_id)
      .map((student) => [student.school_student_id, student]),
  );
  const byEmail = new Map(
    students
      .filter((student) => student.school_email)
      .map((student) => [student.school_email!.toLowerCase(), student]),
  );
  for (const [index, row] of rows.entries()) {
    const line = index + 1;
    if (!clean(row.first_name) || !clean(row.last_name))
      return `Row ${line}: enter a first and last name.`;
    if (row.first_name.length > 100 || row.last_name.length > 100)
      return `Row ${line}: names must be 100 characters or less.`;
    if (schoolStudentIdError(row.school_student_id ?? ""))
      return `Row ${line}: enter a six-digit Student Number.`;
    const generatedEmail = schoolEmailFromStudentId(
      row.school_student_id ?? "",
    );
    if (
      row.school_email &&
      row.school_email.trim().toLowerCase() !== generatedEmail
    )
      return `Row ${line}: School email does not match the Student Number.`;
    if (
      row.school_student_id &&
      (row.school_student_id.length > 64 ||
        /[\x00-\x1F]/.test(row.school_student_id))
    )
      return `Row ${line}: Student Number is invalid.`;
    if (row.school_student_id) {
      if (numbers.has(row.school_student_id))
        return `Row ${line}: Student Number appears more than once.`;
      numbers.add(row.school_student_id);
      const owner = byNumber.get(row.school_student_id);
      if (owner && row.existing_student_id !== owner.id)
        return `Row ${line}: Student Number belongs to ${owner.display_name}. Choose that student.`;
    }
    if (row.school_email) {
      const email = row.school_email.trim().toLowerCase();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return `Row ${line}: School email is invalid.`;
      if (emails.has(email))
        return `Row ${line}: School email appears more than once.`;
      emails.add(email);
      const owner = byEmail.get(email);
      if (owner && row.existing_student_id !== owner.id)
        return `Row ${line}: School email belongs to ${owner.display_name}. Choose that student.`;
    }
    if (row.existing_student_id) {
      if (ids.has(row.existing_student_id))
        return `Row ${line}: the same student is listed more than once.`;
      ids.add(row.existing_student_id);
      const existing = byId.get(row.existing_student_id);
      if (!existing)
        return `Row ${line}: the selected existing student is unavailable.`;
      if (
        row.school_student_id &&
        existing.school_student_id &&
        existing.school_student_id !== row.school_student_id
      )
        return `Row ${line}: this student's saved Student Number is different.`;
      if (
        row.school_email &&
        existing.school_email &&
        existing.school_email.toLowerCase() !==
          row.school_email.trim().toLowerCase()
      )
        return `Row ${line}: this student's saved school email is different.`;
    }
  }
  return null;
}
