"use client";
import { useRef, type KeyboardEvent } from "react";
import type { Status } from "@/types";
import { statusKeyTarget } from "@/lib/status-keys";
import { useT } from "./i18n";

const options: Status[] = ["present", "absent", "late", "excused"];

/**
 * One-tap attendance status. Arrow keys move between choices without saving;
 * Enter or Space (or a click) saves, so browsing never queues extra changes.
 */
export function StatusToggle({
  name,
  value,
  disabled,
  onChange,
  vertical = true,
}: {
  name: string;
  value: Status;
  disabled?: boolean;
  onChange: (status: Status) => void;
  /** False when up and down move between students instead. */
  vertical?: boolean;
}) {
  const group = useRef<HTMLDivElement>(null);
  const t = useT("common");
  const attendance = useT("attendance");
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const target = statusKeyTarget(event.key, index, options.length, vertical);
    if (target === null) return;
    event.preventDefault();
    group.current
      ?.querySelectorAll<HTMLButtonElement>("button")
      [target]?.focus();
  }
  return (
    <div
      ref={group}
      className="status-toggle"
      role="group"
      aria-label={attendance("toggleLabel", { name })}
    >
      {/* One highlight slides to the chosen status instead of each button
          lighting up on its own. */}
      <span
        className={"status-thumb " + value}
        aria-hidden="true"
        style={
          {
            "--index": options.indexOf(value),
          } as React.CSSProperties
        }
      />
      {options.map((option, index) => {
        const current = option === value;
        const label = t(option);
        return (
          <button
            key={option}
            type="button"
            className={"status-option " + option}
            aria-pressed={current}
            aria-label={label}
            title={label}
            tabIndex={current ? 0 : -1}
            disabled={disabled}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => !current && onChange(option)}
          >
            <span className="status-option-letter" aria-hidden="true">
              {t(`${option}Short`)}
            </span>
            <span className="status-option-label" aria-hidden="true">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
