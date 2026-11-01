"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { CalendarX, ChevronLeft, ChevronRight } from "lucide-react";
import type { Snapshot, Status } from "@/types";
import {
  addCalendarDays,
  calendarDate,
  calendarGrid,
  calendarMonth,
  parseCalendarDate,
  shiftCalendarMonth,
} from "@/lib/calendar";
import { attendanceRate, historySummary } from "@/lib/history-summary";
import { useIntl, useT } from "./i18n";
import { weekdayNames } from "@/lib/i18n/dates";

const statuses: Status[] = ["present", "late", "absent", "excused"];

export function HistoryOverview({
  snapshot,
  periodId,
  selectedDate,
  showDaySummary,
  today,
  month,
  onMonthChange,
  onDateChange,
}: {
  snapshot: Snapshot;
  periodId: string;
  selectedDate: string;
  showDaySummary: boolean;
  today: string;
  month: Date;
  onMonthChange: (month: Date) => void;
  onDateChange: (date: string) => void;
}) {
  const [focusedDate, setFocusedDate] = useState(() =>
    calendarDate(calendarMonth(selectedDate)) === calendarDate(month)
      ? selectedDate
      : calendarDate(month),
  );
  const grid = useRef<HTMLDivElement>(null);
  const t = useT("history");
  const common = useT("common");
  const intl = useIntl();
  const weekdays = useMemo(() => weekdayNames(intl), [intl]);
  const statistics = useRef<HTMLDivElement>(null);
  const previousSelection = useRef({
    date: selectedDate,
    visible: showDaySummary,
  });
  const first = calendarDate(month);
  const last = calendarDate(
    new Date(month.getFullYear(), month.getMonth() + 1, 0, 12),
  );
  const monthSummary = useMemo(
    () => historySummary(snapshot, periodId, first, last),
    [snapshot, periodId, first, last],
  );
  const daySummary = useMemo(
    () => historySummary(snapshot, periodId, selectedDate, selectedDate),
    [snapshot, periodId, selectedDate],
  );

  useEffect(() => {
    const changed =
      previousSelection.current.date !== selectedDate ||
      previousSelection.current.visible !== showDaySummary;
    previousSelection.current = { date: selectedDate, visible: showDaySummary };
    // Wide screens show the summary beside the calendar; no scroll needed.
    if (
      !showDaySummary ||
      !changed ||
      window.matchMedia("(min-width: 1100px)").matches
    )
      return;
    const frame = requestAnimationFrame(() =>
      statistics.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      }),
    );
    return () => cancelAnimationFrame(frame);
  }, [selectedDate, showDaySummary]);

  function changeMonth(next: Date) {
    onMonthChange(next);
    setFocusedDate(calendarDate(next));
  }

  function moveFocus(date: Date) {
    const next = calendarDate(date);
    setFocusedDate(next);
    if (calendarDate(calendarMonth(next)) !== first)
      onMonthChange(calendarMonth(next));
    requestAnimationFrame(() =>
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)
        ?.focus(),
    );
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
    <section className="history-overview" aria-label={t("controls")}>
      <div className="history-calendar card">
        <div className="history-calendar-heading">
          <h2 aria-live="polite">
            {month.toLocaleDateString(intl, {
              month: "long",
              year: "numeric",
            })}
          </h2>
          <div className="history-calendar-navigation">
            <button
              type="button"
              aria-label={t("previousMonth")}
              onClick={() => changeMonth(shiftCalendarMonth(month, -1))}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label={t("nextMonth")}
              onClick={() => changeMonth(shiftCalendarMonth(month, 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        <div
          className="history-calendar-grid"
          ref={grid}
          role="group"
          aria-label={t("monthly")}
        >
          {weekdays.map((weekday, index) => (
            <span key={index} className="history-weekday" aria-hidden="true">
              {weekday}
            </span>
          ))}
          {calendarGrid(month).map((day) => {
            const iso = calendarDate(day);
            const inMonth = day.getMonth() === month.getMonth();
            const weekend = day.getDay() === 0 || day.getDay() === 6;
            const counts = inMonth ? monthSummary.days[iso] : undefined;
            const rate = counts ? attendanceRate(counts) : null;
            const future = inMonth && iso > today && !counts?.records;
            const detail = !inMonth
              ? t("outsideMonth")
              : counts?.records
                ? counts.absent === counts.records
                  ? t("allAbsent", { count: counts.records })
                  : t("attended", { rate: rate ?? 0, count: counts.records })
                : counts?.sessions
                  ? t("noStatuses")
                  : weekend
                    ? t("weekend")
                    : future
                      ? t("upcoming")
                      : t("noRecords");
            return (
              <button
                key={iso}
                type="button"
                data-day={iso}
                className={`history-day${inMonth ? "" : " outside"}${future ? " future" : ""}${rate !== null ? " has-rate" : ""}${showDaySummary && iso === selectedDate ? " selected" : ""}`}
                // Shades the day by attendance rate; the label states it.
                style={
                  rate !== null
                    ? ({ "--rate": rate / 100 } as CSSProperties)
                    : undefined
                }
                aria-label={t("dayLabel", {
                  date: day.toLocaleDateString(intl, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }),
                  detail,
                })}
                aria-current={iso === today ? "date" : undefined}
                aria-pressed={showDaySummary && iso === selectedDate}
                tabIndex={iso === focusedDate ? 0 : -1}
                onFocus={() => setFocusedDate(iso)}
                onKeyDown={(event) => onDayKeyDown(event, day)}
                onClick={() => onDateChange(iso)}
              >
                <strong>{day.getDate()}</strong>
                {inMonth && (
                  <span className="history-day-detail" aria-hidden="true">
                    {detail}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="hint history-calendar-hint">{t("calendarHint")}</p>
      </div>

      {showDaySummary && (
        <div
          className="history-statistics"
          aria-label={t("summary")}
          ref={statistics}
          tabIndex={-1}
        >
          <div className="history-statistics-heading">
            <h2>{t("summary")}</h2>
            <p>
              {parseCalendarDate(selectedDate).toLocaleDateString(intl, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          {daySummary.total.records ? (
            <div className="history-summary-card">
              <div className="history-rate">
                <span>{t("rate")}</span>
                <strong>{attendanceRate(daySummary.total)}%</strong>
                <small>
                  {t("rateDetail", {
                    here: daySummary.total.present + daySummary.total.late,
                    records: daySummary.total.records,
                  })}
                </small>
              </div>
              <div
                className="history-status-breakdown"
                aria-label={t("statusCounts")}
              >
                {statuses.map((key) => (
                  <div
                    className={`history-status-row history-stat-${key}`}
                    key={key}
                  >
                    <span className="history-status-dot" aria-hidden="true" />
                    <span>{common(key)}</span>
                    <strong>{daySummary.total[key]}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="history-empty-summary">
              <CalendarX size={22} aria-hidden="true" />
              <strong>{t("noDay")}</strong>
              <span>{t("noDayBody")}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
