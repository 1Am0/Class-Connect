"use client";
import { useState } from "react";
import {
  ArrowRight,
  Archive,
  BluetoothConnected,
  ClipboardCheck,
  GraduationCap,
  History,
  Plus,
  Pencil,
  RotateCcw,
} from "lucide-react";
import type { Period } from "@/types";
import {
  activePeriod,
  presentStudents,
  recordsFor,
  rosterFor,
} from "@/lib/core";
import { formatSchoolTime } from "@/lib/time-input";
import { todaySchedule, type TodayClass } from "@/lib/today";
import { sortClassesByPeriod } from "@/lib/home-class-order";
import { effectiveTimeFor } from "@/lib/weekly-schedule";
import { useClassroom } from "./context";
import { FastLink as Link } from "./fast-link";
import { ClassEditor, RosterImportDialog } from "./lazy";
import { Empty, Modal, StatusBar } from "./ui";
import { useClassBanners } from "./class-banners";
import { useBluetooth } from "./bluetooth-provider";
import { useIntl, useLocalize, useT } from "./i18n";

const timingKeys = {
  now: "timingNow",
  next: "timingNext",
  later: "timingLater",
  done: "timingDone",
  off: "timingOff",
} as const satisfies Record<TodayClass["timing"], string>;

export function HomeClasses({ management = false }: { management?: boolean }) {
  const { s, date, mutate, notify } = useClassroom();
  const t = useT("home");
  const localize = useLocalize();
  const common = useT("common");
  const intl = useIntl();
  const time12 = (value: string) => formatSchoolTime(value, intl);
  const classLabel = (period: Period) =>
    t("className", { number: period.period_number, name: period.name });
  const { state: bluetooth } = useBluetooth();
  const banners = useClassBanners();
  const scannerDestination =
    bluetooth.connection === "connected"
      ? activePeriod(s.teacher, s.periods)
      : null;
  const [edit, setEdit] = useState<Partial<Period> | null>(null),
    [importClassId, setImportClassId] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const [archiveCandidate, setArchiveCandidate] = useState<Period | null>(null);
  const [lifecycleError, setLifecycleError] = useState("");
  const classes = sortClassesByPeriod(s.periods.filter((p) => p.active));
  const archived = sortClassesByPeriod(s.periods.filter((p) => !p.active));
  const today = todaySchedule(s.teacher, s.periods);
  const counts = (periodId: string) => {
    const roster = rosterFor(s, periodId);
    const records = recordsFor(s, periodId, date).filter((record) =>
      roster.some((student) => student.id === record.student_id),
    );
    const count = (status: "late" | "excused") =>
      records.filter((record) => record.status === status).length;
    const present = presentStudents(roster, records).length;
    const late = count("late");
    const excused = count("excused");
    return {
      total: roster.length,
      present,
      late,
      excused,
      absent: roster.length - present - late - excused,
    };
  };
  const classHref = (id: string) =>
    `/attendance?class=${encodeURIComponent(id)}`;
  const timeLabel = (period: Period) => {
    const time = effectiveTimeFor(s.teacher, period, date);
    return time
      ? `${time12(time.start_time)}–${time12(time.end_time)}`
      : t("doesNotMeetToday");
  };

  function addClass() {
    const used = new Set(classes.map((period) => period.period_number));
    const nextNumber = Array.from({ length: 20 }, (_, index) => index + 1).find(
      (number) => !used.has(number),
    );
    if (nextNumber === undefined) {
      notify(t("tooManyClasses"), "error");
      return;
    }
    setEdit({ active: true, period_number: nextNumber });
  }

  async function changeClassActive(period: Period, active: boolean) {
    setBusy(true);
    setLifecycleError("");
    try {
      const result = await mutate({
        action: "classLifecycle",
        id: period.id,
        operation: active ? "restore" : "archive",
      });
      notify(
        active
          ? t("restored", { name: period.name })
          : result.scannerReset
            ? t("archivedScannerReset", { name: period.name })
            : t("archived", { name: period.name }),
      );
      setArchiveCandidate(null);
    } catch (err) {
      setLifecycleError(err instanceof Error ? err.message : t("updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className={"home-classes" + (management ? " class-management" : "")}
      id="classes"
      aria-labelledby="home-classes-title"
    >
      {/* Home keeps a plain title over its colorful class cards; every other
          page, Manage classes included, opens with a colored banner. */}
      <div
        className={
          "page-heading home-classes-heading" +
          (management ? " page-banner" : "")
        }
        style={
          management
            ? ({ "--banner": "var(--page-color)" } as React.CSSProperties)
            : undefined
        }
      >
        <div className="page-heading-title">
          <h1 id="home-classes-title" tabIndex={-1}>
            {t(management ? "manageClasses" : "today")}
          </h1>
        </div>
        <div className="home-classes-actions">
          <button
            type="button"
            className={management ? "secondary" : "primary"}
            onClick={addClass}
          >
            <Plus size={17} /> {t("addClass")}
          </button>
        </div>
      </div>
      {management && lifecycleError && (
        <p className="notice error" role="alert">
          {localize(lifecycleError)}
        </p>
      )}
      {edit && (
        <ClassEditor
          key={edit.id ?? "new"}
          period={edit}
          onClose={() => setEdit(null)}
          onImport={(id) => {
            setEdit(null);
            setImportClassId(id);
          }}
        />
      )}
      {importClassId && (
        <RosterImportDialog
          periodId={importClassId}
          close={() => setImportClassId(null)}
        />
      )}
      {management ? (
        <>
          {classes.length ? (
            <div className="managed-class-list" aria-label={t("activeClasses")}>
              {classes.map((period) => (
                <div className="card managed-class-row" key={period.id}>
                  <span
                    className="class-chip"
                    style={{
                      background: banners.banner(period).color,
                      color: "#fff",
                    }}
                    aria-hidden="true"
                  >
                    {period.period_number}
                  </span>
                  <div className="managed-class-details">
                    <strong>{classLabel(period)}</strong>
                    <span>{timeLabel(period)}</span>
                  </div>
                  <div className="managed-class-actions">
                    <Link
                      className="secondary"
                      href={`/attendance?class=${encodeURIComponent(period.id)}`}
                    >
                      {t("openClass")} <ArrowRight size={16} />
                    </Link>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEdit(period)}
                    >
                      <Pencil size={16} /> {common("edit")}
                    </button>
                    <button
                      type="button"
                      className="secondary archive-class-action"
                      onClick={() => {
                        setLifecycleError("");
                        setArchiveCandidate(period);
                      }}
                    >
                      <Archive size={16} /> {t("archiveEllipsis")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <Empty
                icon={GraduationCap}
                title={t("noActiveClasses")}
                body={t("noActiveClassesBody")}
                action={
                  <button type="button" className="primary" onClick={addClass}>
                    <Plus size={17} /> {t("addClass")}
                  </button>
                }
              />
            </div>
          )}
          <section
            className="archived-classes"
            aria-labelledby="archived-classes-title"
          >
            <div className="archived-classes-heading">
              <h2 id="archived-classes-title">{t("archivedClasses")}</h2>
              <p>{t("archivedClassesBody")}</p>
            </div>
            {archived.length ? (
              <div className="managed-class-list">
                {archived.map((period) => {
                  const latest = s.attendance_sessions
                    .filter((session) => session.period_id === period.id)
                    .map((session) => session.date)
                    .sort()
                    .at(-1);
                  return (
                    <div className="card managed-class-row" key={period.id}>
                      <span className="class-chip" aria-hidden="true">
                        {period.period_number}
                      </span>
                      <div className="managed-class-details">
                        <strong>{classLabel(period)}</strong>
                        <span>
                          {time12(period.start_time)}–{time12(period.end_time)}
                        </span>
                      </div>
                      <div className="managed-class-actions">
                        <Link
                          className="secondary"
                          href={`/history?class=${encodeURIComponent(period.id)}${latest ? `&date=${encodeURIComponent(latest)}` : ""}`}
                        >
                          {t("viewHistory")} <ArrowRight size={16} />
                        </Link>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setEdit(period)}
                        >
                          <Pencil size={16} /> {common("edit")}
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={busy}
                          onClick={() => void changeClassActive(period, true)}
                        >
                          <RotateCcw size={16} /> {t("restore")}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="archived-empty">{t("noArchived")}</p>
            )}
          </section>
        </>
      ) : classes.length ? (
        <>
          <ol className="class-cards" aria-label={t("yourClassesToday")}>
            {today.map((row) => {
              const count = counts(row.period.id);
              const receivingScans = scannerDestination?.id === row.period.id;
              const label = classLabel(row.period);
              const timing = t(timingKeys[row.timing]);
              return (
                <li
                  key={row.period.id}
                  className={"class-card " + row.timing}
                  style={
                    {
                      "--banner": banners.banner(row.period).color,
                    } as React.CSSProperties
                  }
                >
                  <Link
                    className="class-card-banner themed"
                    style={banners.banner(row.period).style}
                    href={classHref(row.period.id)}
                    aria-label={t("openClassLabel", {
                      name: label,
                      timing,
                      here: count.present + count.late,
                      total: count.total,
                    })}
                  >
                    <span className="class-card-timing" aria-hidden="true">
                      {timing}
                    </span>
                    <strong aria-hidden="true">{row.period.name}</strong>
                    <span aria-hidden="true">
                      {row.time
                        ? `${time12(row.time.start_time)}–${time12(row.time.end_time)}`
                        : t("noClassToday")}
                    </span>
                    <span className="class-card-period" aria-hidden="true">
                      {row.period.period_number}
                    </span>
                  </Link>
                  <div className="class-card-body">
                    <p className="class-card-count">
                      <strong>{count.present + count.late}</strong>
                      <span>{t("hereToday", { total: count.total })}</span>
                    </p>
                    <StatusBar counts={count} />
                    {receivingScans && (
                      <p className="class-card-scanner">
                        <BluetoothConnected size={16} aria-hidden="true" />
                        {t("scannerHere")}
                      </p>
                    )}
                  </div>
                  <div className="class-card-footer">
                    <Link
                      className="icon-button"
                      href={classHref(row.period.id)}
                      aria-label={t("takeAttendanceFor", { name: label })}
                      title={t("takeAttendance")}
                    >
                      <ClipboardCheck size={20} />
                    </Link>
                    <Link
                      className="icon-button"
                      href={`/history?class=${encodeURIComponent(row.period.id)}`}
                      aria-label={t("attendanceHistoryFor", { name: label })}
                      title={t("attendanceHistory")}
                    >
                      <History size={20} />
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <div className="card start-class">
          <GraduationCap size={32} />
          <h3>{t("firstClass")}</h3>
          <p>{t("firstClassBody")}</p>
        </div>
      )}
      {archiveCandidate && (
        <Modal
          title={t("archiveTitle")}
          className="class-archive-modal"
          close={() => {
            if (!busy) setArchiveCandidate(null);
          }}
        >
          <div className="class-archive-dialog">
            <p>
              {t.rich(
                "archiveBody",
                { b: (text) => <strong>{text}</strong> },
                { name: classLabel(archiveCandidate) },
              )}
            </p>
            {s.teacher.override_period_id === archiveCandidate.id && (
              <p>{t("archiveScanner")}</p>
            )}
            {lifecycleError && (
              <p className="notice error" role="alert">
                {localize(lifecycleError)}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setArchiveCandidate(null)}
              >
                {t("keepClass")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={() => void changeClassActive(archiveCandidate, false)}
              >
                {t(busy ? "archiving" : "archiveClass")}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
