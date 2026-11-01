import type { SchoolWeekday } from "@/types";
import { schoolWeekdays } from "./weekly-schedule";

// Validated by firstRunSchema in lib/server/first-run.ts.
export interface FirstRunInput {
  timezone: string;
  className: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  weekdays: SchoolWeekday[];
}

export function firstRunError(input: FirstRunInput): string | null {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: input.timezone });
  } catch {
    return "Choose a valid time zone.";
  }
  if (!input.className?.trim() || input.className.trim().length > 100)
    return "Enter a class name (up to 100 characters).";
  if (
    !Number.isInteger(input.periodNumber) ||
    input.periodNumber < 1 ||
    input.periodNumber > 20
  )
    return "Choose a period from 1 to 20.";
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    !timePattern.test(input.startTime) ||
    !timePattern.test(input.endTime) ||
    input.endTime <= input.startTime
  )
    return "Enter a start and end time, with the end after the start.";
  if (
    !Array.isArray(input.weekdays) ||
    !input.weekdays.length ||
    input.weekdays.some((day) => !schoolWeekdays.includes(day)) ||
    new Set(input.weekdays).size !== input.weekdays.length
  )
    return "Choose at least one weekday for this class.";
  return null;
}
