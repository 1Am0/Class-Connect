"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type Theme = "light" | "dark" | "system";
type Sound = "success" | "error" | "tick" | "selection" | "groups";
export interface Preferences {
  theme: Theme;
  effects: boolean;
  reducedMotion: boolean;
  /** Show a note button on each roster row. */
  attendanceNotes: boolean;
  /** Mark the roster from the keyboard: arrows, P/A/L/E, N, /. */
  keyboardShortcuts: boolean;
}
const defaults: Preferences = {
  theme: "system",
  effects: true,
  reducedMotion: false,
  attendanceNotes: false,
  keyboardShortcuts: false,
};
const storageKey = "classroom-preferences-v1";
/** Sound effects play at one quiet, fixed level (0–1). */
const effectsVolume = 0.3;
const Context = createContext<{
  preferences: Preferences;
  setPreference: <K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) => void;
  play: (sound: Sound) => void;
  motionReduced: boolean;
} | null>(null);

export function usePreferences() {
  const context = useContext(Context);
  if (!context) throw new Error("Preferences provider missing.");
  return context;
}

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [preferences, setPreferences] = useState(defaults);
  const [ready, setReady] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const [systemReduced, setSystemReduced] = useState(false);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(storageKey) ?? "{}",
      ) as Partial<Preferences>;
      setPreferences({
        theme: saved.theme ?? defaults.theme,
        effects: saved.effects ?? defaults.effects,
        reducedMotion: saved.reducedMotion ?? defaults.reducedMotion,
        attendanceNotes: saved.attendanceNotes ?? defaults.attendanceNotes,
        keyboardShortcuts:
          saved.keyboardShortcuts ?? defaults.keyboardShortcuts,
      });
    } catch {
      /* Invalid saved preferences fall back to classroom defaults. */
    }
    setReady(true);
    const dark = matchMedia("(prefers-color-scheme: dark)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      setSystemDark(dark.matches);
      setSystemReduced(reduced.matches);
    };
    update();
    dark.addEventListener("change", update);
    reduced.addEventListener("change", update);
    return () => {
      dark.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme =
      preferences.theme === "system"
        ? systemDark
          ? "dark"
          : "light"
        : preferences.theme;
    document.documentElement.dataset.reducedMotion =
      preferences.reducedMotion || systemReduced ? "true" : "false";
    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));
    } catch {
      /* Preferences still work for this tab when browser storage is blocked. */
    }
  }, [preferences, systemDark, systemReduced, ready]);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );

  const tone = useCallback(
    (
      frequency: number,
      length: number,
      volume: number,
      at = 0,
      type: OscillatorType = "sine",
    ) => {
      if (typeof window === "undefined" || !window.AudioContext || volume <= 0)
        return;
      try {
        const context = audio.current ?? new AudioContext();
        audio.current = context;
        if (context.state === "suspended") void context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        const start = context.currentTime + at;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, volume),
          start + Math.min(0.025, length / 4),
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(start);
        oscillator.stop(start + length + 0.01);
      } catch {
        /* Audio is optional; browser/device failures never block classroom actions. */
      }
    },
    [],
  );
  const play = useCallback(
    (sound: Sound) => {
      if (!preferences.effects) return;
      const volume = effectsVolume * 0.09;
      if (sound === "error") {
        tone(220, 0.18, volume);
        tone(165, 0.22, volume, 0.16);
      }
      if (sound === "success") {
        tone(523, 0.15, volume);
        tone(784, 0.25, volume, 0.13);
      }
      // The wheel's ratchet: one short click per segment that passes the pointer.
      if (sound === "tick") tone(1500, 0.04, volume * 0.9, 0, "triangle");
      if (sound === "selection") {
        tone(587, 0.16, volume);
        tone(880, 0.25, volume, 0.14);
      }
      if (sound === "groups") {
        tone(440, 0.14, volume);
        tone(660, 0.2, volume, 0.12);
      }
    },
    [preferences.effects, tone],
  );
  const setPreference = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPreferences((old) => ({ ...old, [key]: value }));
    },
    [],
  );
  return (
    <Context.Provider
      value={{
        preferences,
        setPreference,
        play,
        motionReduced: preferences.reducedMotion || systemReduced,
      }}
    >
      {children}
    </Context.Provider>
  );
}
