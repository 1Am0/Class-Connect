/**
 * Accept minute-based 24-hour times and hour/minute AM/PM times, including
 * Spanish "8:45 a. m.".
 */
export function normalizeTimeInput(value: string): string | null {
  const match = value
    .trim()
    .replace(/[\u00a0\u202f]/g, " ")
    .match(/^(\d{1,2})(?::([0-5]\d))?\s*([ap]\.?\s?m\.?)?$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const meridiem = match[3]?.replace(/[.\s]/g, "").toLowerCase();
  const minute = match[2] ?? (meridiem ? "00" : null);
  if (minute === null) return null;
  if (meridiem) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridiem === "pm" ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${minute}`;
}

export function formatSchoolTime(value: string, intl?: string): string {
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  // Other languages write times their own way ("8:05 a. m.").
  if (intl && !intl.startsWith("en"))
    return new Date(2020, 0, 1, hour, minute).toLocaleTimeString(intl, {
      hour: "numeric",
      minute: "2-digit",
    });
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}
