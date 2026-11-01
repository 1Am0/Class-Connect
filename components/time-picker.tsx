"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Clock3 } from "lucide-react";
import { formatSchoolTime, normalizeTimeInput } from "@/lib/time-input";
import { CustomSelect } from "./custom-select";
import { useIntl, useT } from "./i18n";

const hours = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: String(index + 1),
}));
const minutes = Array.from({ length: 60 }, (_, index) => ({
  value: String(index).padStart(2, "0"),
  label: String(index).padStart(2, "0"),
}));

export function TimePicker({
  id,
  anchor,
  label,
  value,
  onApply,
  onClose,
}: {
  id: string;
  anchor: HTMLButtonElement;
  label: string;
  value: string;
  onApply: (value: string) => void;
  onClose: (restoreFocus?: boolean) => void;
}) {
  const t = useT("pickers");
  const intl = useIntl();
  const initialHour = Number(value.split(":")[0]);
  const [hour, setHour] = useState(String(initialHour % 12 || 12));
  const [minute, setMinute] = useState(value.split(":")[1]);
  const [meridiem, setMeridiem] = useState(initialHour >= 12 ? "PM" : "AM");
  const popup = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 300,
    maxHeight: 400,
  });
  const selected = normalizeTimeInput(`${hour}:${minute} ${meridiem}`)!;
  const host = anchor.closest("dialog[open]") ?? document.body;

  useLayoutEffect(() => {
    function place() {
      const menu = popup.current;
      if (!menu) return;
      const rect = anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = (viewport?.offsetLeft ?? 0) + 8;
      const top = (viewport?.offsetTop ?? 0) + 8;
      const width = Math.min(300, (viewport?.width ?? window.innerWidth) - 16);
      const bottom = top + (viewport?.height ?? window.innerHeight) - 16;
      menu.style.width = `${width}px`;
      const height = Math.min(menu.scrollHeight, bottom - top);
      const below = bottom - rect.bottom - 6;
      const above = rect.top - top - 6;
      const opensAbove = below < height && above > below;
      setPosition({
        left: Math.max(
          left,
          Math.min(
            rect.right - width,
            left + (viewport?.width ?? window.innerWidth) - 16 - width,
          ),
        ),
        top: Math.max(
          top,
          Math.min(
            bottom - height,
            opensAbove ? rect.top - height - 6 : rect.bottom + 6,
          ),
        ),
        width,
        maxHeight: bottom - top,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [anchor]);

  useEffect(() => {
    popup.current
      ?.querySelector<HTMLButtonElement>(".custom-select-trigger")
      ?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    function outside(event: Event) {
      const target = event.target as Node;
      if (!popup.current?.contains(target) && !anchor.contains(target))
        onClose(false);
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={popup}
      id={id}
      className="settings-time-picker"
      data-select-portal
      role="dialog"
      aria-labelledby={`${id}-title`}
      style={position}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onClose();
        } else if (event.key === "Tab" && !event.defaultPrevented) {
          const controls = popup.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          );
          const boundary = event.shiftKey
            ? controls?.[0]
            : controls?.[controls.length - 1];
          if (event.target !== boundary) return;
          // A portal sits at the end of its host. Continue from the field's
          // original position instead of tabbing into the browser chrome.
          event.preventDefault();
          const scope = anchor.closest("dialog[open]") ?? document.body;
          const focusable = Array.from(
            scope.querySelectorAll<HTMLElement>(
              "a[href], button, input, select, textarea, summary, [tabindex]",
            ),
          ).filter(
            (element) =>
              !popup.current?.contains(element) &&
              element.getClientRects().length > 0 &&
              element.tabIndex >= 0 &&
              !element.matches(":disabled") &&
              !element.closest("[inert]") &&
              getComputedStyle(element).visibility !== "hidden",
          );
          const next =
            focusable[focusable.indexOf(anchor) + (event.shiftKey ? -1 : 1)];
          onClose(false);
          (next ?? anchor).focus();
        }
      }}
    >
      <div className="settings-time-picker-heading">
        <Clock3 size={18} aria-hidden="true" />
        <h3 id={`${id}-title`}>{label}</h3>
      </div>
      <div className="settings-time-picker-fields">
        <label>
          {t("hour")}
          <CustomSelect
            ariaLabel={t("hourLabel", { label })}
            value={hour}
            options={hours}
            onChange={setHour}
          />
        </label>
        <label>
          {t("minute")}
          <CustomSelect
            ariaLabel={t("minuteLabel", { label })}
            value={minute}
            options={minutes}
            onChange={setMinute}
          />
        </label>
        <label>
          {t("meridiem")}
          <CustomSelect
            ariaLabel={t("meridiemLabel", { label })}
            value={meridiem}
            options={[
              { value: "AM", label: t("am") },
              { value: "PM", label: t("pm") },
            ]}
            onChange={setMeridiem}
          />
        </label>
      </div>
      <output className="settings-time-picker-preview" aria-live="polite">
        {formatSchoolTime(selected, intl)}
      </output>
      <div className="settings-time-picker-actions">
        <button type="button" className="secondary" onClick={() => onClose()}>
          {t("cancel")}
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => {
            onApply(selected);
            onClose();
          }}
        >
          {t("apply")}
        </button>
      </div>
    </div>,
    host,
  );
}
