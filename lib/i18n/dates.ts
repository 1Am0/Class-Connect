/** Short weekday names, Sunday first, in a language ("Sun", "dom"). */
export function weekdayNames(
  intl: string,
  style: "short" | "narrow" = "short",
) {
  return Array.from({ length: 7 }, (_, day) =>
    new Date(2023, 0, 1 + day, 12).toLocaleDateString(intl, { weekday: style }),
  );
}

const weekdayIndex: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

/** "monday" → "Monday" or "Lunes", capitalized for labels. */
export function weekdayLabel(day: string, intl: string) {
  const index = weekdayIndex[day];
  if (index === undefined) return day;
  const name = new Date(2023, 0, 1 + index, 12).toLocaleDateString(intl, {
    weekday: "long",
  });
  return name[0].toLocaleUpperCase(intl) + name.slice(1);
}
