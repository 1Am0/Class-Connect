import { CUSTOM_THEME, classColors, classThemes } from "./class-themes";

/**
 * What a teacher chose for one class. Missing fields use the defaults.
 * `photo` is the uploaded picture's version, or "local" for one kept only in
 * this browser (demo mode, or before migration 014).
 */
export interface BannerChoice {
  theme?: string;
  color?: string;
  photo?: string;
}
export type BannerChoices = Record<string, BannerChoice>;
export const LOCAL_PHOTO = "local";

/** One saved choice. Earlier versions saved a bare theme id or "custom". */
export function readChoice(value: unknown): BannerChoice {
  if (typeof value === "string")
    return value === CUSTOM_THEME ? { photo: LOCAL_PHOTO } : { theme: value };
  if (!value || typeof value !== "object") return {};
  const { theme, color, photo } = value as Record<string, unknown>;
  return {
    ...(typeof theme === "string" && { theme }),
    ...(typeof color === "string" && { color }),
    ...(photo === true && { photo: LOCAL_PHOTO }),
    ...(typeof photo === "string" && photo && { photo }),
  };
}

export function readChoices(value: unknown): BannerChoices {
  const choices: BannerChoices = {};
  if (value && typeof value === "object" && !Array.isArray(value))
    for (const [periodId, choice] of Object.entries(value))
      choices[periodId] = readChoice(choice);
  return choices;
}

export type BannerChange =
  | { kind: "theme"; theme: string }
  | { kind: "color"; color: string }
  | { kind: "photo"; photo: string }
  | { kind: "removePhoto" };

/** A theme replaces any photo and starts in its own color. */
export function applyBannerChange(
  old: BannerChoice,
  change: BannerChange,
): BannerChoice {
  switch (change.kind) {
    case "theme":
      return { theme: change.theme };
    case "color":
      return { ...old, color: change.color };
    case "photo":
      return { ...old, photo: change.photo };
    case "removePhoto": {
      const { photo, ...rest } = old;
      void photo;
      return rest;
    }
  }
}

/** Why a change from the browser cannot be saved, or null when it can. */
export function bannerChangeError(change: BannerChange): string | null {
  if (
    change.kind === "theme" &&
    !classThemes.some((theme) => theme.id === change.theme)
  )
    return "Choose one of the built-in themes.";
  if (
    change.kind === "color" &&
    !classColors.some((color) => color.value === change.color)
  )
    return "Choose one of the banner colors.";
  return null;
}

/** Where a class's synced photo is served from; the version busts caches. */
export const bannerPhotoUrl = (periodId: string, version: string) =>
  `/api/class-banners?class=${periodId}&v=${encodeURIComponent(version)}`;
