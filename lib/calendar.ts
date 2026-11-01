export function parseCalendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error("Invalid calendar date");
  const date = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12,
  );
  if (calendarDate(date) !== value) throw new Error("Invalid calendar date");
  return date;
}

export function calendarDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function addCalendarDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    12,
  );
}

export function calendarMonth(value: string): Date {
  const date = parseCalendarDate(value);
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function shiftCalendarMonth(date: Date, months: number): Date {
  const first = new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
  const lastDay = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
    12,
  ).getDate();
  return new Date(
    first.getFullYear(),
    first.getMonth(),
    Math.min(date.getDate(), lastDay),
    12,
  );
}

export function calendarGrid(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = addCalendarDays(first, -first.getDay());
  return Array.from({ length: 42 }, (_, index) =>
    addCalendarDays(start, index),
  );
}
