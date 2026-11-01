"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addCalendarDays,
  calendarDate,
  calendarGrid,
  calendarMonth,
  parseCalendarDate,
  shiftCalendarMonth,
} from "@/lib/calendar";
import { useIntl, useT } from "./i18n";
import { weekdayNames } from "@/lib/i18n/dates";

export function DatePicker({
  value,
  today,
  onChange,
  label,
}: {
  value: string;
  today: string;
  onChange: (value: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const t = useT("pickers");
  const intl = useIntl();
  const weekdays = weekdayNames(intl);
  label ??= t("date");
  const [month, setMonth] = useState(() => calendarMonth(value));
  const [focusedDate, setFocusedDate] = useState(value);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const calendar = useRef<HTMLDivElement>(null);
  const focusDay = useRef(false);
  const id = useId();
  const selected = parseCalendarDate(value);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || !focusDay.current) return;
    calendar.current
      ?.querySelector<HTMLButtonElement>(`[data-calendar-day="${focusedDate}"]`)
      ?.focus();
    focusDay.current = false;
  }, [open, focusedDate, month]);

  function close() {
    setOpen(false);
    focusDay.current = false;
    trigger.current?.focus();
  }
  function choose(day: string) {
    onChange(day);
    close();
  }
  function openCalendar() {
    if (open) {
      close();
      return;
    }
    setMonth(calendarMonth(value));
    setFocusedDate(value);
    focusDay.current = true;
    setOpen(true);
  }
  function moveFocus(date: Date) {
    const next = calendarDate(date);
    focusDay.current = true;
    setMonth(calendarMonth(next));
    setFocusedDate(next);
  }
  function changeMonth(offset: number) {
    const next = new Date(
      month.getFullYear(),
      month.getMonth() + offset,
      1,
      12,
    );
    setMonth(next);
    setFocusedDate(calendarDate(next));
  }
  function onDayKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    day: Date,
  ) {
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (event.key in offsets) {
      event.preventDefault();
      moveFocus(addCalendarDays(day, offsets[event.key]));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      moveFocus(
        addCalendarDays(
          day,
          event.key === "Home" ? -day.getDay() : 6 - day.getDay(),
        ),
      );
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      moveFocus(shiftCalendarMonth(day, event.key === "PageUp" ? -1 : 1));
    }
  }

  return (
    <div
      ref={root}
      className="date-picker"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node))
          setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <span id={`${id}-label`} className="date-picker-label">
        {label}
      </span>
      <button
        ref={trigger}
        type="button"
        className="date-picker-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${id}-calendar`}
        onClick={openCalendar}
      >
        <CalendarDays size={18} aria-hidden="true" />
        <span id={`${id}-value`}>
          {selected.toLocaleDateString(intl, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          id={`${id}-calendar`}
          ref={calendar}
          className="date-picker-popover"
          role="dialog"
          aria-label={t("chooseLabel", {
            label: label.toLocaleLowerCase(intl),
          })}
          aria-describedby={`${id}-hint`}
        >
          <div className="date-picker-month">
            <strong aria-live="polite">
              {month.toLocaleDateString(intl, {
                month: "long",
                year: "numeric",
              })}
            </strong>
            <div>
              <button
                type="button"
                aria-label={t("previousMonth")}
                onClick={() => changeMonth(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                aria-label={t("nextMonth")}
                onClick={() => changeMonth(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div className="date-picker-grid">
            {weekdays.map((day, index) => (
              <span
                className="date-picker-weekday"
                key={index}
                aria-hidden="true"
              >
                {day}
              </span>
            ))}
            {calendarGrid(month).map((day) => {
              const iso = calendarDate(day);
              return (
                <button
                  key={iso}
                  type="button"
                  data-calendar-day={iso}
                  className={[
                    "date-picker-day",
                    day.getMonth() !== month.getMonth() ? "outside" : "",
                    iso === value ? "selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  aria-label={day.toLocaleDateString(intl, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  aria-current={iso === today ? "date" : undefined}
                  aria-pressed={iso === value}
                  tabIndex={iso === focusedDate ? 0 : -1}
                  onKeyDown={(event) => onDayKeyDown(event, day)}
                  onClick={() => choose(iso)}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
          <div className="date-picker-footer">
            <button type="button" onClick={() => choose(today)}>
              Today
            </button>
            <span id={`${id}-hint`}>{t("arrowHint")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
