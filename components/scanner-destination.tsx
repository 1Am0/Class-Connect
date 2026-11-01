"use client";
import { useState } from "react";
import { activePeriod } from "@/lib/core";
import { useClassroom } from "./context";
import { CustomSelect } from "./custom-select";
import { FastLink as Link } from "./fast-link";
import { useLocalize, useT } from "./i18n";

export function ScannerDestination({
  viewedPeriodId,
}: {
  viewedPeriodId?: string;
}) {
  const { s, mutate, notify, syncError } = useClassroom();
  const [busy, setBusy] = useState(false);
  const t = useT("scanner");
  const localize = useLocalize();
  const [error, setError] = useState("");
  const destination = activePeriod(s.teacher, s.periods);
  const manual = Boolean(s.teacher.override_period_id);
  const mismatch = Boolean(
    viewedPeriodId && destination?.id !== viewedPeriodId,
  );
  const classes = [...s.periods]
    .filter((p) => p.active)
    .sort((a, b) => a.period_number - b.period_number);
  async function route(value: string) {
    setBusy(true);
    setError("");
    try {
      await mutate({
        action: "settings",
        override_period_id: value === "schedule" ? null : value,
      });
      notify(t("destinationUpdated"));
    } catch (e) {
      setError(e instanceof Error ? localize(e.message) : t("routingFailed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={`scanner-routing${viewedPeriodId ? " compact-routing" : " card"}`}
      aria-label={t("routing")}
    >
      <div>
        {(viewedPeriodId || !manual || !destination) && (
          <p>
            <strong>
              {destination
                ? t("scansGo", {
                    number: destination.period_number,
                    name: destination.name,
                  })
                : t("noClassNow")}
            </strong>
          </p>
        )}
        <p className="hint">{manual ? t("manualHint") : t("autoHint")}</p>
        {mismatch && (
          <p className="routing-mismatch">
            {destination ? t("mismatch") : t("noActive")}
          </p>
        )}
      </div>
      {viewedPeriodId ? (
        <div className="routing-actions">
          {mismatch && (
            <button
              className="secondary"
              disabled={busy || syncError}
              onClick={() => void route(viewedPeriodId)}
            >
              {t(busy ? "updating" : "sendHere")}
            </button>
          )}
          {manual && (
            <button
              className="text-button"
              disabled={busy || syncError}
              onClick={() => void route("schedule")}
            >
              {t("follow")}
            </button>
          )}
        </div>
      ) : classes.length ? (
        <label>
          {t("destination")}
          <CustomSelect
            ariaLabel={t("destination")}
            value={s.teacher.override_period_id ?? "schedule"}
            disabled={busy || syncError}
            onChange={(value) => void route(value)}
            options={[
              { value: "schedule", label: t("follow") },
              ...classes.map((p) => ({
                value: p.id,
                label: t("classOption", {
                  number: p.period_number,
                  name: p.name,
                }),
              })),
            ]}
          />
        </label>
      ) : (
        <Link href="/dashboard" className="secondary">
          {t("setUpClass")}
        </Link>
      )}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
