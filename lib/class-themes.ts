// Built-in class banner themes, in the spirit of Google Classroom: a subject
// illustration (transparent white art) over a color the teacher can change.
export interface ClassTheme {
  id: string;
  name: string;
  color: string;
}

export const classThemes: ClassTheme[] = [
  { id: "languages", name: "World languages", color: "#1967d2" },
  { id: "math", name: "Math", color: "#3949ab" },
  { id: "science", name: "Science", color: "#007b83" },
  { id: "history", name: "History", color: "#8a4b16" },
  { id: "reading", name: "Reading & writing", color: "#c2185b" },
  { id: "art", name: "Art", color: "#8430ce" },
  { id: "music", name: "Music", color: "#c5221f" },
  { id: "sports", name: "PE & sports", color: "#137333" },
  { id: "computing", name: "Computer science", color: "#37474f" },
  { id: "classroom", name: "General", color: "#b05a00" },
];

/** Older saves used this id for an uploaded photo. */
export const CUSTOM_THEME = "custom";

/** Banner colors; each carries white text at 4.5:1 or better. */
export const classColors = [
  { name: "Blue", value: "#1967d2" },
  { name: "Indigo", value: "#3949ab" },
  { name: "Purple", value: "#8430ce" },
  { name: "Pink", value: "#c2185b" },
  { name: "Red", value: "#c5221f" },
  { name: "Orange", value: "#b05a00" },
  { name: "Brown", value: "#8a4b16" },
  { name: "Green", value: "#137333" },
  { name: "Teal", value: "#007b83" },
  { name: "Slate", value: "#37474f" },
];

/** A saved color if it is one of the palette's, otherwise the theme's own. */
export function resolveColor(saved: string | undefined, theme: ClassTheme) {
  return classColors.some((color) => color.value === saved)
    ? saved!
    : theme.color;
}

export const themeImage = (id: string) => `/banners/${id}.svg`;

/** A class without a saved choice gets a theme by its period number. */
export function defaultTheme(periodNumber: number) {
  return classThemes[(Math.max(1, periodNumber) - 1) % classThemes.length];
}

/** The saved theme if it is still a built-in one, otherwise the default. */
export function resolveTheme(saved: string | undefined, periodNumber: number) {
  return (
    classThemes.find((theme) => theme.id === saved) ??
    defaultTheme(periodNumber)
  );
}
