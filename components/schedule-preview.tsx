"use client";

import type { SchedulePreset, Snapshot } from "@/types";
import { schoolClock } from "@/lib/core";
import { formatSchoolTime } from "@/lib/time-input";
import { useIntl, useT } from "./i18n";

export function SchedulePreview({
  s,
  preset,
  day,
  today = false,
  now = new Date(),
}: {
  s: Snapshot;
  preset: SchedulePreset | null;
  day: string;
  today?: boolean;
  now?: Date;
}) {
  const t = useT("schedule");
  const intl = useIntl();
  const clock = schoolClock(s.teacher.timezone, now);
  const active = today
    ? [...s.periods]
        .filter((p) => p.active)
        .sort((a, b) => a.period_number - b.period_number)
        .find((period) => {
          const bell = preset?.periods.find(
            (row) => row.period_number === period.period_number,
          );
          if (!bell) return false;
          const time = period.time_source === "custom" ? period : bell;
          return (
            time && time.start_time <= clock.time && clock.time < time.end_time
          );
        })
    : undefined;
  return (
    <div
      className="schedule-preview"
      role="region"
      aria-label={t("previewLabel", { day })}
    >
      <div className="schedule-preview-heading">
        <strong>{preset?.name ?? t("noneAssigned")}</strong>
        {today && !active && <span>{t("noClassNow")}</span>}
      </div>
      {preset && (
        <div className="schedule-preview-list">
          {preset.periods.length ? (
            [...preset.periods]
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((row) => {
                const period = s.periods.find(
                  (item) =>
                    item.active && item.period_number === row.period_number,
                );
                const time =
                  period?.time_source === "custom"
                    ? {
                        start_time: period.start_time.slice(0, 5),
                        end_time: period.end_time.slice(0, 5),
                      }
                    : row;
                const current = today && !!period && active?.id === period.id;
                return (
                  <div
                    className={`schedule-preview-row${current ? " is-current" : ""}`}
                    key={row.period_number}
                  >
                    <span>
                      {t("periodRow", { number: row.period_number })}
                      {period ? ` · ${period.name}` : ""}
                    </span>
                    <span>
                      {formatSchoolTime(time.start_time, intl)}–
                      {formatSchoolTime(time.end_time, intl)}
                    </span>
                    {current && <strong>{t("inSession")}</strong>}
                  </div>
                );
              })
          ) : (
            <p>{t("noPeriods")}</p>
          )}
        </div>
      )}
    </div>
  );
}
