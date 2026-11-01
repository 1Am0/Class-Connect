"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { BellPeriod, Period } from "@/types";
import { bellScheduleError, bellTimeFor } from "@/lib/bell-schedule";
import { useClassroom } from "./context";
import { CustomSelect } from "./custom-select";
import { TimeField } from "./time-field";
import { Modal } from "./ui";
import { normalizeTimeInput } from "@/lib/time-input";
import { useLocalize, useT } from "./i18n";

type Change = { period: Period; newTime: BellPeriod };

export function SchoolScheduleSettings() {
  const { s, mutate, notify } = useClassroom();
  const t = useT("schedule");
  const localize = useLocalize();
  const [rows, setRows] = useState<BellPeriod[]>(() =>
    [...(s.teacher.bell_schedule ?? [])].sort(
      (a, b) => a.period_number - b.period_number,
    ),
  );
  const [review, setReview] = useState<{
    schedule: BellPeriod[];
    changes: Change[];
    unlinked: Period[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function changeRow(index: number, change: Partial<BellPeriod>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...change } : row,
      ),
    );
    setError("");
  }

  async function save(schedule: BellPeriod[], updateExisting: boolean) {
    setBusy(true);
    setError("");
    try {
      await mutate({
        action: "bellSchedule",
        bell_schedule: schedule,
        update_existing: updateExisting,
      });
      setRows(schedule);
      setReview(null);
      notify(t(updateExisting ? "savedWithClasses" : "saved"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const schedule = rows
      .map((row) => ({
        ...row,
        start_time: normalizeTimeInput(row.start_time) ?? row.start_time,
        end_time: normalizeTimeInput(row.end_time) ?? row.end_time,
      }))
      .sort((a, b) => a.period_number - b.period_number);
    const validation = bellScheduleError(schedule);
    if (validation) {
      setError(validation);
      return;
    }
    const savedSchedule = [...(s.teacher.bell_schedule ?? [])].sort(
      (a, b) => a.period_number - b.period_number,
    );
    if (JSON.stringify(schedule) === JSON.stringify(savedSchedule)) {
      notify(t("upToDate"));
      return;
    }
    const changes = s.periods.flatMap((period) => {
      const newTime = bellTimeFor(schedule, period.period_number);
      return newTime &&
        (period.start_time.slice(0, 5) !== newTime.start_time ||
          period.end_time.slice(0, 5) !== newTime.end_time)
        ? [{ period, newTime }]
        : [];
    });
    const unlinked = s.periods.filter(
      (period) =>
        period.time_source === "school" &&
        !bellTimeFor(schedule, period.period_number),
    );
    if (changes.length || unlinked.length) {
      setReview({ schedule, changes, unlinked });
    } else {
      void save(schedule, false);
    }
  }

  const nextNumber = Array.from({ length: 20 }, (_, index) => index + 1).find(
    (number) => !rows.some((row) => row.period_number === number),
  );

  return (
    <section className="card settings-card school-schedule-card">
      <h2 className="sr-only">{t("title")}</h2>
      <p>{t("intro")}</p>
      <div className="school-schedule-content">
        {rows.length ? (
          <div className="bell-period-list">
            {rows.map((row, index) => (
              <div className="bell-period-row" key={index}>
                <label>
                  {t("period")}
                  <CustomSelect
                    ariaLabel={t("periodFor", { index: index + 1 })}
                    value={String(row.period_number)}
                    onChange={(value) =>
                      changeRow(index, { period_number: Number(value) })
                    }
                    options={Array.from({ length: 20 }, (_, optionIndex) => {
                      const value = optionIndex + 1;
                      return {
                        value: String(value),
                        label: t("periodOption", { number: value }),
                        disabled: rows.some(
                          (other, otherIndex) =>
                            otherIndex !== index &&
                            other.period_number === value,
                        ),
                      };
                    })}
                  />
                </label>
                <TimeField
                  customPicker
                  label={t("starts")}
                  ariaLabel={t("startsLabel", { number: row.period_number })}
                  value={row.start_time}
                  onChange={(value) => changeRow(index, { start_time: value })}
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
                  title={t("remove", { number: row.period_number })}
                  onClick={() => {
                    setRows((current) => current.filter((_, i) => i !== index));
                    setError("");
                  }}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">{t("noBellTimes")}</p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {localize(error)}
          </p>
        )}
        <div className="school-schedule-actions">
          <button
            type="button"
            className="secondary"
            disabled={nextNumber === undefined || busy}
            onClick={() => {
              setRows((current) => [
                ...current,
                { period_number: nextNumber!, start_time: "", end_time: "" },
              ]);
              setError("");
            }}
          >
            <Plus size={16} /> {t("addPeriod")}
          </button>
          {!rows.length && !!s.periods.length && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setRows(
                  [...s.periods]
                    .sort((a, b) => a.period_number - b.period_number)
                    .map((period) => ({
                      period_number: period.period_number,
                      start_time: period.start_time.slice(0, 5),
                      end_time: period.end_time.slice(0, 5),
                    })),
                );
                setError("");
              }}
            >
              {t("useClassTimes")}
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={submit}
          >
            {t(busy ? "saving" : "save")}
          </button>
        </div>
      </div>
      {review && (
        <Modal
          className="bell-review-dialog"
          title={t("reviewTitle")}
          close={() => {
            if (!busy) setReview(null);
          }}
        >
          <div className="bell-review">
            {!!review.changes.length && <p>{t("reviewChanges")}</p>}
            {!!review.changes.length && (
              <ul>
                {review.changes.map(({ period, newTime }) => (
                  <li key={period.id}>
                    <strong>
                      {t("className", {
                        number: period.period_number,
                        name: period.name,
                      })}
                    </strong>
                    <span>
                      {period.start_time.slice(0, 5)}–
                      {period.end_time.slice(0, 5)}
                      {" → "}
                      {newTime.start_time}–{newTime.end_time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!!review.unlinked.length && (
              <p>{t("unlinked", { count: review.unlinked.length })}</p>
            )}
            {error && (
              <p className="notice error" role="alert">
                {localize(error)}
              </p>
            )}
            <div className="bell-review-actions">
              {!!review.changes.length && (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => void save(review.schedule, true)}
                >
                  {t("updateAndSave")}
                </button>
              )}
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => void save(review.schedule, false)}
              >
                {t("keepAndSave")}
              </button>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => setReview(null)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
