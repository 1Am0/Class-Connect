"use client";
import { useState } from "react";
import {
  Check,
  ClipboardCheck,
  Database,
  Monitor,
  Moon,
  Palette,
  School,
  Sun,
  Trash2,
} from "lucide-react";
import { useClassroom } from "./context";
import { Modal } from "./ui";
import { usePreferences, type Theme } from "./preferences";
import { CustomSelect } from "./custom-select";
import { SchoolScheduleSettings } from "./school-schedule";
import { WeeklyScheduleSettings } from "./weekly-schedule";
import { AccountSettings } from "./account-settings";
import { useLocale, useSetLocale, useT } from "./i18n";
import { locales, type Locale } from "@/lib/i18n/locales";

type Cleanup = "archive" | "clear_tags" | "delete_all";
// The server checks the English phrase; the teacher types it in their language.
const cleanupDetails = {
  archive: {
    title: "archiveTitle",
    phrase: "archivePhrase",
    description: "archiveBody",
    serverPhrase: "ARCHIVE STUDENTS",
  },
  clear_tags: {
    title: "clearTitle",
    phrase: "clearPhrase",
    description: "clearBody",
    serverPhrase: "CLEAR RFID CARDS",
  },
  delete_all: {
    title: "deleteTitle",
    phrase: "deletePhrase",
    description: "deleteBody",
    serverPhrase: "DELETE ALL STUDENT DATA",
  },
} as const satisfies Record<Cleanup, object>;
const timezones = [
  ["America/Los_Angeles", "tzPacific"],
  ["America/Denver", "tzMountain"],
  ["America/Chicago", "tzCentral"],
  ["America/New_York", "tzEastern"],
  ["Pacific/Honolulu", "tzHawaii"],
  ["Europe/London", "tzLondon"],
  ["UTC", "tzUtc"],
] as const;

export function SettingsView() {
  const { s, mutate, notify } = useClassroom();
  const { preferences, setPreference } = usePreferences();
  const t = useT("settings");
  const locale = useLocale();
  const setLocale = useSetLocale();
  const [busy, setBusy] = useState(false);
  const [section, setSection] = useState("appearance");
  const [cleanup, setCleanup] = useState<Cleanup | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [timezone, setTimezone] = useState(s.teacher.timezone);
  function openCleanup(action: Cleanup) {
    setCleanup(action);
    setAcknowledged(false);
    setConfirmation("");
  }
  const activeCount = s.students.filter((student) => student.active).length;
  return (
    <div className="settings-stack">
      <nav className="settings-navigation" aria-label={t("sections")}>
        {(
          [
            ["appearance", "navAppearance", Palette],
            ["attendance", "navAttendance", ClipboardCheck],
            ["classroom", "navClassroom", School],
            ["data", "navData", Database],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            className={"settings-nav-button settings-" + value}
            aria-pressed={section === value}
            aria-controls={`settings-${value}`}
            onClick={() => setSection(value)}
          >
            <span className="settings-nav-icon" aria-hidden="true">
              <Icon size={16} />
            </span>
            {t(label)}
          </button>
        ))}
      </nav>
      <div
        id="settings-appearance"
        className="settings-section settings-appearance"
        hidden={section !== "appearance"}
      >
        <section
          className="card settings-card controls-card"
          aria-labelledby="appearance-title"
        >
          <div className="card-title">
            <h2 id="appearance-title">{t("appearance")}</h2>
          </div>
          <div className="settings-controls">
            <fieldset className="segmented-setting">
              <legend>{t("theme")}</legend>
              <div className="segmented">
                {(["light", "dark", "system"] as Theme[]).map((theme) => (
                  <label key={theme}>
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={preferences.theme === theme}
                      onChange={() => setPreference("theme", theme)}
                    />
                    {theme === "light" ? (
                      <Sun size={18} aria-hidden="true" />
                    ) : theme === "dark" ? (
                      <Moon size={18} aria-hidden="true" />
                    ) : (
                      <Monitor size={18} aria-hidden="true" />
                    )}
                    {t(
                      theme === "light"
                        ? "themeLight"
                        : theme === "dark"
                          ? "themeDark"
                          : "themeSystem",
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="picker-setting">
              <div>
                <strong>{t("language")}</strong>
                <small>{t("languageHint")}</small>
              </div>
              <div className="picker-control">
                <CustomSelect
                  value={locale}
                  ariaLabel={t("language")}
                  options={locales.map((item) => ({
                    value: item.code,
                    label: item.name,
                  }))}
                  onChange={(value) => setLocale(value as Locale)}
                />
              </div>
            </div>
            <label className="setting-row">
              <span>
                <strong>{t("reducedMotion")}</strong>
                <small>{t("reducedMotionHint")}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={preferences.reducedMotion}
                onChange={(e) =>
                  setPreference("reducedMotion", e.target.checked)
                }
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>{t("effects")}</strong>
                <small>{t("effectsHint")}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={preferences.effects}
                onChange={(e) => setPreference("effects", e.target.checked)}
              />
            </label>
          </div>
        </section>
      </div>
      <div
        id="settings-attendance"
        className="settings-section settings-attendance"
        hidden={section !== "attendance"}
      >
        <section
          className="card settings-card controls-card"
          aria-labelledby="attendance-settings-title"
        >
          <div className="card-title">
            <div>
              <h2 id="attendance-settings-title">{t("attendance")}</h2>
              <p>{t("attendanceIntro")}</p>
            </div>
          </div>
          <div className="settings-controls">
            <label className="setting-row">
              <span>
                <strong>{t("notes")}</strong>
                <small>{t("notesHint")}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={preferences.attendanceNotes}
                onChange={(e) =>
                  setPreference("attendanceNotes", e.target.checked)
                }
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>{t("shortcuts")}</strong>
                <small>{t("shortcutsHint")}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={preferences.keyboardShortcuts}
                onChange={(e) =>
                  setPreference("keyboardShortcuts", e.target.checked)
                }
              />
            </label>
          </div>
        </section>
      </div>
      <div
        id="settings-classroom"
        className="settings-section settings-classroom"
        hidden={section !== "classroom"}
      >
        <AccountSettings />
        <section className="card settings-card">
          <div className="card-title">
            <h2>{t("timezoneTitle")}</h2>
          </div>
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                await mutate({
                  action: "settings",
                  timezone: f.get("timezone"),
                });
                notify(t("saved"));
              } catch {
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="timezone-setting">
              <label htmlFor="school-timezone">{t("timezoneTitle")}</label>
              <div className="timezone-field">
                <input
                  id="school-timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  required
                />
                <CustomSelect
                  ariaLabel={t("commonTimezones")}
                  buttonLabel={t("commonTimezones")}
                  value={timezone}
                  onChange={setTimezone}
                  options={timezones.map(([value, label]) => ({
                    value,
                    label: t(label),
                  }))}
                />
              </div>
            </div>
            <p className="hint">{t("timezoneHint")}</p>
            <button className="primary" disabled={busy}>
              {t("savePreferences")}
            </button>
          </form>
          <div className="notice info">
            <Check size={19} />
            <p>{s.demo ? t("demoPrivacy") : t("privacy")}</p>
          </div>
        </section>

        <details className="schedule-editor-disclosure">
          <summary>{t("editSchedule")}</summary>
          <p className="hint">{t("scheduleHint")}</p>
          {typeof s.teacher.weekly_schedule_version === "number" ? (
            <WeeklyScheduleSettings />
          ) : (
            <SchoolScheduleSettings />
          )}
        </details>
      </div>
      <div
        id="settings-data"
        className="settings-section settings-data"
        hidden={section !== "data"}
      >
        <section
          className="card settings-card controls-card"
          aria-labelledby="data-title"
        >
          <div className="card-title">
            <h2 id="data-title">{t("data")}</h2>
          </div>
          <p className="student-data-note">{t("dataNote")}</p>
          <div className="settings-controls data-actions">
            <div>
              <p>{t("activeStudents", { count: activeCount })}</p>
              <button
                className="secondary"
                disabled={!activeCount}
                onClick={() => openCleanup("archive")}
              >
                {t("archiveStudents")}
              </button>
            </div>
            <div>
              <p>{t("cardAssignments", { count: s.rfid_tags.length })}</p>
              <button
                className="secondary"
                disabled={!s.rfid_tags.length}
                onClick={() => openCleanup("clear_tags")}
              >
                {t("clearCards")}
              </button>
            </div>
            <div>
              <p>
                {t("allData", {
                  students: s.students.length,
                  records: s.attendance_records.length,
                })}
              </p>
              <button
                className="danger-outline"
                disabled={!s.students.length && !s.attendance_records.length}
                onClick={() => openCleanup("delete_all")}
              >
                <Trash2 size={16} /> {t("deleteAll")}
              </button>
            </div>
          </div>
        </section>
      </div>
      {cleanup && (
        <Modal
          className="settings-cleanup-dialog"
          title={t(cleanupDetails[cleanup].title)}
          close={() => {
            if (!busy) setCleanup(null);
          }}
        >
          <div className="cleanup-dialog">
            <p>{t(cleanupDetails[cleanup].description)}</p>
            <p className="cleanup-counts">
              {t("currentData", {
                students: s.students.length,
                cards: s.rfid_tags.length,
                records: s.attendance_records.length,
              })}
            </p>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={acknowledged}
                disabled={busy}
                onChange={(e) => setAcknowledged(e.target.checked)}
              />
              {t("understand")}
            </label>
            <label>
              <span>
                {t.rich(
                  "typeToConfirm",
                  { b: (text) => <strong>{text}</strong> },
                  { phrase: t(cleanupDetails[cleanup].phrase) },
                )}
              </span>
              <input
                value={confirmation}
                disabled={busy}
                autoComplete="off"
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setCleanup(null)}
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={
                  busy ||
                  !acknowledged ||
                  confirmation.trim().toLocaleUpperCase() !==
                    t(cleanupDetails[cleanup].phrase)
                }
                onClick={async () => {
                  setBusy(true);
                  try {
                    await mutate({
                      action: "studentData",
                      operation: cleanup,
                      confirmation: cleanupDetails[cleanup].serverPhrase,
                    });
                    notify(
                      t(
                        cleanup === "archive"
                          ? "archivedDone"
                          : cleanup === "clear_tags"
                            ? "clearedDone"
                            : "deletedDone",
                      ),
                    );
                    setCleanup(null);
                  } catch {
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t(
                  busy
                    ? "working"
                    : cleanup === "delete_all"
                      ? "deleteConfirm"
                      : cleanup === "archive"
                        ? "archiveConfirm"
                        : "clearConfirm",
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
