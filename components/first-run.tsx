"use client";

import { useState, type FormEvent } from "react";
import { firstRunError, type FirstRunInput } from "@/lib/first-run";
import { schoolWeekdays } from "@/lib/weekly-schedule";
import { TimeField } from "./time-field";
import { CustomSelect } from "./custom-select";
import { normalizeTimeInput } from "@/lib/time-input";
import { useIntl, useLocalize, useT } from "./i18n";
import { weekdayLabel } from "@/lib/i18n/dates";

export function FirstRun() {
  const t = useT("auth");
  const localize = useLocalize();
  const intl = useIntl();
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [input, setInput] = useState<FirstRunInput>({
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Los_Angeles",
    className: "",
    periodNumber: 1,
    startTime: "08:00",
    endTime: "09:00",
    weekdays: [...schoolWeekdays],
  });
  const set = (values: Partial<FirstRunInput>) =>
    setInput((current) => ({ ...current, ...values }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (step === 1) {
      if (!input.className.trim()) {
        setError(t("needClassName"));
        return;
      }
      setStep(2);
      return;
    }
    const normalized = {
      ...input,
      startTime: normalizeTimeInput(input.startTime) || input.startTime,
      endTime: normalizeTimeInput(input.endTime) || input.endTime,
    };
    const issue = firstRunError(normalized);
    if (issue) {
      setError(issue);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/first-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalized),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t("setupFailed"));
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("setupFailed"));
      setBusy(false);
    }
  }
  return (
    <main className="setup-card first-run" aria-labelledby="first-run-title">
      <h1 id="first-run-title">{t("setupTitle")}</h1>
      <p>
        {t("step", {
          step,
          name: t(step === 1 ? "stepClass" : "stepSchedule"),
        })}
      </p>
      <form onSubmit={(event) => void submit(event)} className="form-stack">
        {step === 1 ? (
          <>
            <label>
              {t("className")}
              <input
                required
                maxLength={100}
                autoFocus
                value={input.className}
                onChange={(event) => set({ className: event.target.value })}
              />
            </label>
            <label>
              {t("period")}
              <CustomSelect
                ariaLabel={t("period")}
                value={String(input.periodNumber)}
                onChange={(value) => set({ periodNumber: Number(value) })}
                options={Array.from({ length: 20 }, (_, index) => ({
                  value: String(index + 1),
                  label: t("periodOption", { number: index + 1 }),
                }))}
              />
            </label>
            <label>
              {t("timezone")}
              <input
                required
                value={input.timezone}
                onChange={(event) => set({ timezone: event.target.value })}
              />
            </label>
          </>
        ) : (
          <>
            <div className="time-fields">
              <TimeField
                label={t("startTime")}
                value={input.startTime}
                onChange={(value) => set({ startTime: value })}
              />
              <TimeField
                label={t("endTime")}
                value={input.endTime}
                onChange={(value) => set({ endTime: value })}
              />
            </div>
            <fieldset>
              <legend>{t("meetingDays")}</legend>
              {schoolWeekdays.map((day) => (
                <label key={day}>
                  <input
                    type="checkbox"
                    checked={input.weekdays.includes(day)}
                    onChange={(event) =>
                      set({
                        weekdays: event.target.checked
                          ? [...input.weekdays, day]
                          : input.weekdays.filter((item) => item !== day),
                      })
                    }
                  />{" "}
                  {weekdayLabel(day, intl)}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {localize(error)}
          </p>
        )}
        <div className="form-actions">
          {step === 2 && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setStep(1)}
            >
              {t("back")}
            </button>
          )}
          <button className="primary" disabled={busy}>
            {t(busy ? "saving" : step === 1 ? "continue" : "start")}
          </button>
        </div>
      </form>
    </main>
  );
}
