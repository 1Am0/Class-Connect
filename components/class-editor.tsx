"use client";

import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { DialogHead } from "./ui";
import type { Period } from "@/types";
import { firstAssignedBellTime } from "@/lib/weekly-schedule";
import { formatSchoolTime, normalizeTimeInput } from "@/lib/time-input";
import { useClassroom } from "./context";
import { CustomSelect } from "./custom-select";
import { TimeField } from "./time-field";
import { useIntl, useLocalize, useT } from "./i18n";

export function ClassEditor({
  period,
  onClose,
  onImport,
}: {
  period: Partial<Period>;
  onClose: () => void;
  onImport: (periodId: string) => void;
}) {
  const { s, mutate, notify } = useClassroom();
  const t = useT("classEditor");
  const localize = useLocalize();
  const intl = useIntl();
  const dialog = useRef<HTMLDialogElement>(null);
  const initialNumber = period.period_number ?? 1;
  const initialBellTime = firstAssignedBellTime(s.teacher, initialNumber);
  const [periodNumber, setPeriodNumber] = useState(initialNumber);
  const [timeSource, setTimeSource] = useState<"school" | "custom">(
    initialBellTime && (!period.id || period.time_source === "school")
      ? "school"
      : "custom",
  );
  const [startTime, setStartTime] = useState(
    period.start_time?.slice(0, 5) ?? initialBellTime?.start_time ?? "",
  );
  const [endTime, setEndTime] = useState(
    period.end_time?.slice(0, 5) ?? initialBellTime?.end_time ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const selectedBellTime = firstAssignedBellTime(s.teacher, periodNumber);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="student-dialog class-editor-dialog"
      aria-labelledby="class-editor-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="student-editor">
        <DialogHead
          id="class-editor-title"
          title={t(period.id ? "editTitle" : "addTitle")}
          closeLabel={t("cancelAndClose")}
          disabled={busy}
          close={onClose}
        />
        <form
          className="form-stack"
          onChangeCapture={() => setDirty(true)}
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const form = new FormData(event.currentTarget);
            try {
              if (timeSource === "school" && !selectedBellTime)
                throw new Error(t("needBellTime"));
              const customStart = normalizeTimeInput(startTime);
              const customEnd = normalizeTimeInput(endTime);
              if (
                timeSource === "custom" &&
                (!customStart || !customEnd || customEnd <= customStart)
              )
                throw new Error(t("invalidTime"));
              const importAfterSave =
                (event.nativeEvent as SubmitEvent).submitter?.getAttribute(
                  "value",
                ) === "import";
              const result = await mutate({
                action: "period",
                ...(period.id ? { id: period.id } : {}),
                name: form.get("name"),
                period_number: periodNumber,
                start_time:
                  timeSource === "school"
                    ? selectedBellTime!.start_time
                    : customStart,
                end_time:
                  timeSource === "school"
                    ? selectedBellTime!.end_time
                    : customEnd,
                active: period.active ?? true,
                time_source: timeSource,
              });
              if (importAfterSave) {
                if (typeof result.id !== "string")
                  throw new Error(t("importFailed"));
                onImport(result.id);
              } else onClose();
              notify(t(importAfterSave ? "savedImport" : "saved"));
            } catch (err) {
              setError(err instanceof Error ? err.message : t("saveFailed"));
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            {t("name")}
            <input
              name="name"
              defaultValue={period.name}
              autoFocus
              required
              maxLength={100}
              disabled={busy}
            />
          </label>
          <label>
            {t("period")}
            <CustomSelect
              ariaLabel={t("period")}
              value={String(periodNumber)}
              options={Array.from({ length: 20 }, (_, index) => ({
                value: String(index + 1),
                label: t("periodOption", { number: index + 1 }),
                disabled: s.periods.some(
                  (other) =>
                    other.id !== period.id &&
                    other.active &&
                    (period.active ?? true) &&
                    other.period_number === index + 1,
                ),
              }))}
              onChange={(value) => {
                setDirty(true);
                const number = Number(value);
                const bellTime = firstAssignedBellTime(s.teacher, number);
                setPeriodNumber(number);
                setTimeSource(bellTime ? "school" : "custom");
                setStartTime(bellTime?.start_time ?? "");
                setEndTime(bellTime?.end_time ?? "");
              }}
              disabled={busy}
            />
          </label>
          <fieldset className="class-time-choice">
            <legend>{t("classTime")}</legend>
            <div>
              <label>
                <input
                  type="radio"
                  name="time-source"
                  value="school"
                  checked={timeSource === "school"}
                  disabled={busy || !selectedBellTime}
                  onChange={() => setTimeSource("school")}
                />
                {t("schoolSchedule")}
              </label>
              <label>
                <input
                  type="radio"
                  name="time-source"
                  value="custom"
                  checked={timeSource === "custom"}
                  disabled={busy}
                  onChange={() => setTimeSource("custom")}
                />
                {t("customTime")}
              </label>
            </div>
          </fieldset>
          {timeSource === "school" && selectedBellTime ? (
            <p className="class-scheduled-time">
              {formatSchoolTime(selectedBellTime.start_time, intl)}–
              {formatSchoolTime(selectedBellTime.end_time, intl)}
            </p>
          ) : (
            <div className="form-row">
              <TimeField
                label={t("startsAt")}
                value={startTime}
                onChange={setStartTime}
                required
                disabled={busy}
              />
              <TimeField
                label={t("endsAt")}
                value={endTime}
                onChange={setEndTime}
                required
                disabled={busy}
              />
            </div>
          )}
          {period.active === false && (
            <p className="hint">{t("archivedHint")}</p>
          )}
          {error && (
            <p className="notice error" role="alert">
              {localize(error)}
            </p>
          )}
          <div className="form-actions">
            {period.active !== false &&
              (period.id ? (
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (dirty) {
                      setError(t("saveBeforeImport"));
                      return;
                    }
                    onImport(period.id!);
                  }}
                >
                  <Upload size={16} /> {t("importRoster")}
                </button>
              ) : (
                <button
                  type="submit"
                  className="secondary"
                  value="import"
                  disabled={busy}
                >
                  <Upload size={16} /> {t("saveAndImport")}
                </button>
              ))}
            <button className="primary" disabled={busy}>
              {t(busy ? "saving" : "save")}
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
