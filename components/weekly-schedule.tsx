"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BellPeriod, SchedulePreset, SchoolWeekday } from "@/types";
import {
  schoolWeekdays,
  weeklyScheduleError,
  overlapWarnings,
  weekdayForSchoolDate,
} from "@/lib/weekly-schedule";
import { schoolClock } from "@/lib/core";
import { normalizeTimeInput } from "@/lib/time-input";
import { useClassroom } from "./context";
import { TimeField } from "./time-field";
import { CustomSelect } from "./custom-select";
import { SchedulePreview } from "./schedule-preview";
import { useIntl, useLocalize, useT } from "./i18n";
import { weekdayLabel } from "@/lib/i18n/dates";

export function WeeklyScheduleSettings() {
  const { s, mutate, notify } = useClassroom();
  const t = useT("schedule");
  const localize = useLocalize();
  const intl = useIntl();
  const title = (day: SchoolWeekday) => weekdayLabel(day, intl);
  const [presets, setPresets] = useState<SchedulePreset[]>(() =>
    structuredClone(s.teacher.schedule_presets ?? []),
  );
  const [assignments, setAssignments] = useState<
    Partial<Record<SchoolWeekday, string>>
  >(() => ({ ...s.teacher.weekday_schedule }));
  const [selected, setSelected] = useState(
    s.teacher.schedule_presets?.[0]?.id ?? "",
  );
  const [version, setVersion] = useState(
    s.teacher.weekly_schedule_version ?? 1,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const chosen = presets.find((item) => item.id === selected);
  const date = schoolClock(s.teacher.timezone).date;
  const [previewDay, setPreviewDay] = useState<SchoolWeekday>(
    weekdayForSchoolDate(date) ?? "monday",
  );
  const assignedDays = schoolWeekdays.filter(
    (day) => assignments[day] === selected,
  );
  const previewPreset =
    presets.find((item) => item.id === assignments[previewDay]) ?? null;

  useEffect(() => {
    if ((s.teacher.weekly_schedule_version ?? 1) <= version) return;
    setPresets(structuredClone(s.teacher.schedule_presets ?? []));
    setAssignments({ ...s.teacher.weekday_schedule });
    setVersion(s.teacher.weekly_schedule_version ?? 1);
    setError(t("changedElsewhere"));
  }, [s.teacher, version, t]);

  function updatePreset(change: Partial<SchedulePreset>) {
    setPresets((current) =>
      current.map((item) =>
        item.id === selected ? { ...item, ...change } : item,
      ),
    );
    setError("");
  }
  function changeRow(index: number, change: Partial<BellPeriod>) {
    if (!chosen) return;
    updatePreset({
      periods: chosen.periods.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...change } : row,
      ),
    });
  }
  function addPreset(copy = false) {
    const id = crypto.randomUUID();
    const next = {
      id,
      name:
        copy && chosen
          ? t("copyName", { name: chosen.name })
          : t("newSchedule"),
      periods: copy && chosen ? structuredClone(chosen.periods) : [],
    };
    setPresets((current) => [...current, next]);
    setSelected(id);
    setError("");
  }
  function removePreset() {
    if (!chosen) return;
    setPresets((current) => current.filter((item) => item.id !== selected));
    setAssignments((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([, id]) => id !== selected),
      ),
    );
    setSelected(presets.find((item) => item.id !== selected)?.id ?? "");
    setError("");
  }
  async function save() {
    const normalized = presets.map((preset) => ({
      ...preset,
      name: preset.name.trim(),
      periods: preset.periods
        .map((row) => ({
          ...row,
          start_time: normalizeTimeInput(row.start_time) ?? row.start_time,
          end_time: normalizeTimeInput(row.end_time) ?? row.end_time,
        }))
        .sort((a, b) => a.period_number - b.period_number),
    }));
    const issue = weeklyScheduleError(normalized, assignments);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await mutate({
        action: "weeklySchedule",
        presets: normalized,
        assignments,
        expected_version: version,
      });
      setPresets(normalized);
      setVersion(Number(result.version));
      notify(t("weeklySaved"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("weeklyFailed"));
    } finally {
      setBusy(false);
    }
  }
  const nextNumber = Array.from({ length: 20 }, (_, index) => index + 1).find(
    (number) => !chosen?.periods.some((row) => row.period_number === number),
  );

  return (
    <section
      className="card settings-card school-schedule-card weekly-schedule-card"
      aria-labelledby="weekly-schedule-title"
    >
      <h2 id="weekly-schedule-title" className="sr-only">
        {t("weeklyTitle")}
      </h2>
      <p>{t("weeklyIntro")}</p>
      <div className="school-schedule-content">
        <div
          className="weekly-schedule-days"
          role="group"
          aria-label={t("assignments")}
        >
          {schoolWeekdays.map((day) => (
            <label key={day}>
              {title(day)}
              <CustomSelect
                ariaLabel={t("daySchedule", { day: title(day) })}
                value={assignments[day] ?? ""}
                onChange={(value) =>
                  setAssignments((current) => {
                    const next = { ...current };
                    if (value) next[day] = value;
                    else delete next[day];
                    return next;
                  })
                }
                options={[
                  { value: "", label: t("noSchedule") },
                  ...presets.map((item) => ({
                    value: item.id,
                    label: item.name,
                  })),
                ]}
              />
            </label>
          ))}
        </div>
        <p className="hint">{t("noScheduleHint")}</p>
        <div className="weekly-schedule-toolbar">
          <label>
            {t("scheduleToEdit")}
            <CustomSelect
              ariaLabel={t("scheduleToEdit")}
              value={selected}
              onChange={setSelected}
              options={presets.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => addPreset()}
            disabled={presets.length >= 20}
          >
            <Plus size={16} /> {t("newSchedule")}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => addPreset(true)}
            disabled={!chosen || presets.length >= 20}
          >
            {t("duplicate")}
          </button>
        </div>
        {chosen && (
          <div className="weekly-schedule-editor">
            <div className="weekly-schedule-name-row">
              <label>
                {t("scheduleName")}
                <input
                  value={chosen.name}
                  maxLength={60}
                  onChange={(event) =>
                    updatePreset({ name: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                className="secondary"
                onClick={removePreset}
              >
                <Trash2 size={16} /> {t("deleteSchedule")}
              </button>
            </div>
            <p className="hint">
              {assignedDays.length
                ? t("usedOn", {
                    days: new Intl.ListFormat(intl).format(
                      assignedDays.map(title),
                    ),
                  })
                : t("notAssigned")}
            </p>
            <div className="bell-period-list">
              {chosen.periods.map((row, index) => (
                <div className="bell-period-row" key={index}>
                  <label>
                    {t("period")}
                    <CustomSelect
                      ariaLabel={t("periodForTime", { index: index + 1 })}
                      value={String(row.period_number)}
                      onChange={(value) =>
                        changeRow(index, { period_number: Number(value) })
                      }
                      options={Array.from({ length: 20 }, (_, i) => ({
                        value: String(i + 1),
                        label: t("periodOption", { number: i + 1 }),
                        disabled: chosen.periods.some(
                          (other, otherIndex) =>
                            otherIndex !== index &&
                            other.period_number === i + 1,
                        ),
                      }))}
                    />
                  </label>
                  <TimeField
                    customPicker
                    label={t("starts")}
                    ariaLabel={t("startsLabel", { number: row.period_number })}
                    value={row.start_time}
                    onChange={(value) =>
                      changeRow(index, { start_time: value })
                    }
                    required
                  />
                  <TimeField
                    customPicker
                    label={t("ends")}
                    ariaLabel={t("endsLabel", { number: row.period_number })}
                    value={row.end_time}
                    onChange={(value) => changeRow(index, { end_time: value })}
                    required
                  />
                  <button
                    type="button"
                    className="icon-button bell-remove"
                    aria-label={t("remove", { number: row.period_number })}
                    onClick={() =>
                      updatePreset({
                        periods: chosen.periods.filter((_, i) => i !== index),
                      })
                    }
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              ))}
            </div>
            <div className="weekly-schedule-actions">
              <button
                type="button"
                className="secondary"
                disabled={!nextNumber}
                onClick={() =>
                  nextNumber &&
                  updatePreset({
                    periods: [
                      ...chosen.periods,
                      {
                        period_number: nextNumber,
                        start_time: "08:00",
                        end_time: "09:00",
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> {t("addPeriod")}
              </button>
            </div>
            {!!overlapWarnings(chosen.periods).length && (
              <p className="hint" role="status">
                {t("overlapNote", {
                  warnings: overlapWarnings(chosen.periods)
                    .map(localize)
                    .join(" "),
                })}
              </p>
            )}
          </div>
        )}
        {!presets.length && <p className="hint">{t("createFirst")}</p>}
        <div className="weekly-schedule-preview">
          <label>
            {t("previewDay")}
            <CustomSelect
              ariaLabel={t("previewDay")}
              value={previewDay}
              onChange={(value) => setPreviewDay(value as SchoolWeekday)}
              options={schoolWeekdays.map((day) => ({
                value: day,
                label: title(day),
              }))}
            />
          </label>
          <SchedulePreview
            s={s}
            preset={previewPreset}
            day={title(previewDay)}
            today={previewDay === weekdayForSchoolDate(date)}
          />
        </div>
        {error && (
          <p role="alert" className="notice error">
            {localize(error)}
          </p>
        )}
        <button
          type="button"
          className="primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {t(busy ? "saving" : "saveWeekly")}
        </button>
      </div>
    </section>
  );
}
