import type { BellPeriod } from "@/types";

const schoolTime = /^([01]\d|2[0-3]):[0-5]\d$/;

export function bellTimeFor(
  schedule: BellPeriod[] | undefined,
  periodNumber: number,
) {
  return schedule?.find((period) => period.period_number === periodNumber);
}

export function bellScheduleError(schedule: BellPeriod[]): string | null {
  const numbers = new Set<number>();
  for (const period of schedule) {
    if (
      !Number.isInteger(period.period_number) ||
      period.period_number < 1 ||
      period.period_number > 20
    )
      return "Periods must be numbered from 1 to 20.";
    if (numbers.has(period.period_number))
      return `Period ${period.period_number} appears more than once.`;
    numbers.add(period.period_number);
    if (
      !schoolTime.test(period.start_time) ||
      !schoolTime.test(period.end_time) ||
      period.end_time <= period.start_time
    )
      return `Period ${period.period_number} needs a valid start and end time.`;
  }
  return null;
}
