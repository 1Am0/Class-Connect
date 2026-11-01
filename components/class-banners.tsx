"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { Period } from "@/types";
import {
  deleteBannerPhoto,
  loadBannerPhoto,
  prepareBannerPhoto,
  saveBannerPhoto,
} from "@/lib/banner-photos";
import { resolveColor, resolveTheme, themeImage } from "@/lib/class-themes";
import {
  LOCAL_PHOTO,
  applyBannerChange,
  bannerPhotoUrl,
  readChoice,
  readChoices,
  type BannerChange,
  type BannerChoice,
  type BannerChoices,
} from "@/lib/class-banners";
import type { ClassTheme } from "@/lib/class-themes";

export type { BannerChoice } from "@/lib/class-banners";

export interface ClassBanner {
  theme: ClassTheme;
  /** True when the teacher's own photo is showing. */
  custom: boolean;
  /** Banner color: the chosen one, or the theme's own. */
  color: string;
  style: React.CSSProperties;
}

type BannersContextValue = {
  banner: (period: Pick<Period, "id" | "period_number">) => ClassBanner;
  saved: (periodId: string) => BannerChoice;
  /** True when choices follow the teacher to other browsers. */
  synced: boolean;
  chooseTheme: (periodId: string, themeId: string) => Promise<void>;
  chooseColor: (periodId: string, color: string) => Promise<void>;
  upload: (periodId: string, file: File) => Promise<void>;
  removeUpload: (periodId: string) => Promise<void>;
  /** Choices loaded from the server, e.g. after another browser saved. */
  receive: (choices: unknown) => void;
};
const BannersContext = createContext<BannersContextValue | null>(null);

export function useClassBanners() {
  const context = useContext(BannersContext);
  if (!context) throw new Error("Class banners provider missing.");
  return context;
}

async function request(input: string, init: RequestInit) {
  const response = await fetch(input, { credentials: "same-origin", ...init });
  const result = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(result.error || "The banner could not be saved.");
  return readChoice(result.choice);
}

/**
 * Each class's banner, Google Classroom style: a built-in theme in any palette
 * color, or the teacher's own photo. With migration 014 (`initial` is set) the
 * choices and photos are saved to the account; otherwise, as in the demo, they
 * stay in this browser.
 */
export function ClassBannersProvider({
  teacherId,
  initial,
  children,
}: {
  teacherId: string;
  initial: BannerChoices | null;
  children: React.ReactNode;
}) {
  const synced = initial !== null;
  const storageKey = `class-connect-banners:${teacherId}`;
  const [choices, setChoices] = useState<BannerChoices>(initial ?? {});
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const urls = useRef<Record<string, string>>({});
  // Saves run one at a time so each builds on the last.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const saving = useRef(0);
  // When each class was last changed here; the cloud can't undo it for a while.
  const changedHere = useRef<Record<string, number>>({});

  function setPhoto(periodId: string, url: string | null) {
    if (urls.current[periodId]) URL.revokeObjectURL(urls.current[periodId]);
    if (url) urls.current[periodId] = url;
    else delete urls.current[periodId];
    setPhotos({ ...urls.current });
  }

  function apply(periodId: string, change: BannerChange) {
    setChoices((current) => {
      const next = {
        ...current,
        [periodId]: applyBannerChange(current[periodId] ?? {}, change),
      };
      if (!synced)
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* The choice still applies for this visit. */
        }
      return next;
    });
  }

  /** Shows a change now, then saves it; a failed save puts the old one back. */
  function save(
    periodId: string,
    change: BannerChange,
    send: () => Promise<BannerChoice>,
  ) {
    const before = choices[periodId];
    apply(periodId, change);
    saving.current++;
    changedHere.current[periodId] = Date.now();
    const task = queue.current
      .catch(() => {})
      .then(send)
      .then(
        (choice) =>
          setChoices((current) => ({ ...current, [periodId]: choice })),
        (cause) => {
          setChoices((current) => {
            const next = { ...current };
            if (before) next[periodId] = before;
            else delete next[periodId];
            return next;
          });
          throw cause;
        },
      )
      .finally(() => {
        saving.current--;
        changedHere.current[periodId] = Date.now();
      });
    queue.current = task;
    return task;
  }

  const putChoice = (periodId: string, change: BannerChange) =>
    request("/api/class-banners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ class: periodId, change }),
    });
  const sendPhoto = (periodId: string, image: Blob) => {
    const form = new FormData();
    form.set("class", periodId);
    form.set("photo", image);
    return request("/api/class-banners", { method: "POST", body: form });
  };

  useEffect(() => {
    let active = true;
    const stored: BannerChoices = {};
    try {
      Object.assign(
        stored,
        readChoices(JSON.parse(localStorage.getItem(storageKey) ?? "{}")),
      );
    } catch {
      /* Fall back to the default themes. */
    }
    const localPhoto = (periodId: string) =>
      loadBannerPhoto(`${teacherId}:${periodId}`).catch(() => null);
    if (!synced) {
      setChoices(stored);
      for (const [periodId, choice] of Object.entries(stored))
        if (choice.photo)
          void localPhoto(periodId).then((image) => {
            if (active && image) setPhoto(periodId, URL.createObjectURL(image));
          });
    } else if (
      Object.keys(stored).length &&
      !Object.keys(initial ?? {}).length
    ) {
      // First visit with syncing: carry this browser's banners to the account.
      void (async () => {
        for (const [periodId, choice] of Object.entries(stored)) {
          try {
            let saved: BannerChoice = {};
            if (choice.theme)
              saved = await putChoice(periodId, {
                kind: "theme",
                theme: choice.theme,
              });
            if (choice.color)
              saved = await putChoice(periodId, {
                kind: "color",
                color: choice.color,
              });
            const image = choice.photo ? await localPhoto(periodId) : null;
            if (image) saved = await sendPhoto(periodId, image);
            if (active)
              setChoices((current) => ({ ...current, [periodId]: saved }));
            await deleteBannerPhoto(`${teacherId}:${periodId}`).catch(() => {});
          } catch {
            return; // Try again on the next visit.
          }
        }
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* Nothing left to move. */
        }
      })();
    }
    // The old single classroom background is no longer used.
    void deleteBannerPhoto(teacherId).catch(() => {});
    const current = urls.current;
    return () => {
      active = false;
      for (const url of Object.values(current)) URL.revokeObjectURL(url);
      urls.current = {};
    };
    // initial is only read on the first render; later updates use receive().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId, storageKey, synced]);

  function banner(period: Pick<Period, "id" | "period_number">): ClassBanner {
    const choice = choices[period.id] ?? {};
    const theme = resolveTheme(choice.theme, period.period_number);
    const color = resolveColor(choice.color, theme);
    const photo = !choice.photo
      ? undefined
      : synced && choice.photo !== LOCAL_PHOTO
        ? bannerPhotoUrl(period.id, choice.photo)
        : photos[period.id];
    return {
      theme,
      custom: Boolean(photo),
      color,
      style: {
        "--banner": color,
        backgroundImage: photo
          ? `linear-gradient(#00000059, #00000059), url("${photo}")`
          : `url("${themeImage(theme.id)}")`,
        // Photos fill the banner; themes keep their art at the right.
        ...(photo && { backgroundSize: "cover", backgroundPosition: "center" }),
      } as React.CSSProperties,
    };
  }

  async function upload(periodId: string, file: File) {
    const image = await prepareBannerPhoto(file, synced ? 1600 : 2400);
    if (synced) {
      // Show the picture right away while it uploads.
      setPhoto(periodId, URL.createObjectURL(image));
      try {
        await save(periodId, { kind: "photo", photo: LOCAL_PHOTO }, () =>
          sendPhoto(periodId, image),
        );
      } finally {
        setPhoto(periodId, null);
      }
      return;
    }
    try {
      await saveBannerPhoto(`${teacherId}:${periodId}`, image);
    } catch {
      throw new Error(
        "This browser could not save the picture. Check its available storage.",
      );
    }
    setPhoto(periodId, URL.createObjectURL(image));
    apply(periodId, { kind: "photo", photo: LOCAL_PHOTO });
  }

  async function removeUpload(periodId: string) {
    if (synced)
      return void (await save(periodId, { kind: "removePhoto" }, () =>
        request(`/api/class-banners?class=${periodId}`, { method: "DELETE" }),
      ));
    await deleteBannerPhoto(`${teacherId}:${periodId}`);
    setPhoto(periodId, null);
    apply(periodId, { kind: "removePhoto" });
  }

  async function choose(periodId: string, change: BannerChange) {
    if (synced)
      return void (await save(periodId, change, () =>
        putChoice(periodId, change),
      ));
    if (change.kind === "theme" && choices[periodId]?.photo) {
      setPhoto(periodId, null);
      void deleteBannerPhoto(`${teacherId}:${periodId}`).catch(() => {});
    }
    apply(periodId, change);
  }

  return (
    <BannersContext.Provider
      value={{
        banner,
        saved: (periodId) => choices[periodId] ?? {},
        synced,
        chooseTheme: (periodId, theme) =>
          choose(periodId, { kind: "theme", theme }),
        chooseColor: (periodId, color) =>
          choose(periodId, { kind: "color", color }),
        upload,
        removeUpload,
        // Changes made here win over an older cloud copy: while a save is in
        // flight, and for a short while after, in case that copy left first.
        receive: (value) => {
          if (!synced || saving.current) return;
          const cloud = readChoices(value);
          const recent = Date.now() - 15_000;
          setChoices((current) => {
            const next = { ...cloud };
            for (const [periodId, at] of Object.entries(changedHere.current))
              if (at > recent) {
                if (current[periodId]) next[periodId] = current[periodId];
                else delete next[periodId];
              }
            return next;
          });
        },
      }}
    >
      {children}
    </BannersContext.Provider>
  );
}
