"use client";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search,
  Download,
  ScanLine,
  Plus,
  QrCode,
  CalendarX,
  UserPlus,
  SearchX,
  StickyNote,
  Undo2,
  X,
} from "lucide-react";
import type { Attendance, Status, Student } from "@/types";
import { rosterFor, recordsFor, presentStudents } from "@/lib/core";
import { useClassroom } from "./context";
import { Avatar, Badge, Empty, StatusBar, localTime } from "./ui";
import { StatusToggle } from "./status-toggle";
import { AttendanceNoteDialog } from "./attendance-note";
import { rosterShortcut } from "@/lib/roster-shortcuts";
import { usePreferences } from "./preferences";
import { StudentDialog } from "./students";
import { schoolEmailFromStudentId } from "@/lib/school-student-id";
import { CustomSelect } from "./custom-select";
import { HistoryOverview } from "./history-overview";
import { calendarDate, calendarMonth, parseCalendarDate } from "@/lib/calendar";
import { useIntl, useLocalize, useT } from "./i18n";

function initialHistoryDate(linked: string | null, fallback: string) {
  try {
    return linked ? calendarDate(parseCalendarDate(linked)) : fallback;
  } catch {
    return fallback;
  }
}

function initialHistoryMonth(linked: string | null, date: string) {
  if (linked && /^\d{4}-(0[1-9]|1[0-2])$/.test(linked))
    return calendarMonth(`${linked}-01`);
  return calendarMonth(date);
}

type UndoStep = {
  period: string;
  day: string;
  changes: { before: Attendance; record: Attendance }[];
};
const maxUndoSteps = 50;

export function AttendanceView({ view }: { view: string }) {
  const { play, preferences } = usePreferences();
  const t = useT("attendance");
  const localize = useLocalize();
  const common = useT("common");
  const intl = useIntl();
  const notesOn = preferences.attendanceNotes;
  const shortcutsOn = preferences.keyboardShortcuts;
  const {
    s,
    periodId,
    date,
    notify,
    refresh,
    pendingAttendance,
    enqueueAttendance,
    attendanceStorageError,
    discardAttendanceConflict,
  } = useClassroom();
  const searchParams = useSearchParams();
  const linkedDate = searchParams.get("date");
  const [historyDateSelected, setHistoryDateSelected] = useState(true);
  const [search, setSearch] = useState(""),
    [historyDate, setHistoryDate] = useState(
      initialHistoryDate(linkedDate, date),
    ),
    [editing, setEditing] = useState<Partial<Student> | null>(null);
  const [historyMonth, setHistoryMonth] = useState(() =>
    initialHistoryMonth(searchParams.get("month"), historyDate),
  );
  const history = view === "history",
    day = history ? historyDate : date;
  const [correcting, setCorrecting] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(new Set<string>());
  const [bulkStatus, setBulkStatus] = useState<Status>("present");
  const [bulkBusy, setBulkBusy] = useState(false);
  // The student whose note is open, and the keyboard's current student.
  const [noting, setNoting] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const rosterBody = useRef<HTMLTableSectionElement>(null);
  // Failures appear in the shared message toast so the roster never shifts.
  const setError = (text: string) => {
    if (text) notify(text, "error");
  };
  // Every change on this class and day, newest last. The Undo pop reverses
  // the latest one; Ctrl+Z keeps stepping back through the rest.
  const [undoStack, setUndoStack] = useState<UndoStep[]>([]);
  const [undoShown, setUndoShown] = useState(false);
  const undo = undoStack.at(-1) ?? null;
  const pushUndo = (step: UndoStep) => {
    setUndoStack((old) => [...old, step].slice(-maxUndoSteps));
    setUndoShown(true);
  };
  const editable = !history || correcting;
  // The undo popup steps away after a while, like a toast; Ctrl+Z still
  // reaches the changes it leaves behind.
  useEffect(() => {
    if (!undoShown) return;
    const timer = setTimeout(() => setUndoShown(false), 30_000);
    return () => clearTimeout(timer);
  }, [undoShown, undoStack]);
  useEffect(() => {
    setCorrecting(false);
    setSelecting(false);
    setSelected(new Set());
    setUndoStack([]);
    setUndoShown(false);
    setError("");
  }, [day, periodId]);
  useEffect(() => {
    setSelected(new Set());
  }, [search]);
  function historyUrl(
    classId: string,
    selectedDate: string,
    month = historyMonth,
    selected = historyDateSelected,
  ) {
    const params = new URLSearchParams({ class: classId, date: selectedDate });
    if (selected) params.set("selected", "1");
    params.set("month", calendarDate(month).slice(0, 7));
    return `/history?${params.toString()}`;
  }
  function selectHistoryDate(selectedDate: string) {
    const selectedMonth = calendarMonth(selectedDate);
    setHistoryDate(selectedDate);
    setHistoryMonth(selectedMonth);
    setHistoryDateSelected(true);
    window.history.replaceState(
      null,
      "",
      historyUrl(periodId, selectedDate, selectedMonth, true),
    );
  }
  const records = recordsFor(s, periodId, day);
  const session = s.attendance_sessions.find(
    (x) => x.period_id === periodId && x.date === day,
  );
  const roster = history
    ? s.students
        .filter((x) => records.some((r) => r.student_id === x.id))
        .sort((a, b) => a.last_name.localeCompare(b.last_name))
    : rosterFor(s, periodId);
  const rosterIds = new Set(roster.map((student) => student.id));
  const present = presentStudents(roster, records);
  const count = (status: Status) =>
    records.filter((r) => rosterIds.has(r.student_id) && r.status === status)
      .length;
  const late = count("late"),
    excused = count("excused"),
    absent = roster.length - present.length - late - excused;
  // QR check-in needs a school ID whose derived email matches the saved one.
  const qrSetup = (student: (typeof roster)[number]) => {
    const email = schoolEmailFromStudentId(student.school_student_id ?? "");
    return !email
      ? t("schoolIdNeeded")
      : student.school_email !== email
        ? t("qrSetupNeeded")
        : null;
  };
  const qrSetupCount = history
    ? 0
    : roster.filter((student) => qrSetup(student)).length;
  const students = roster.filter((st) =>
    `${st.display_name} ${st.first_name} ${st.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  // Briefly highlight rows whose scanner check-in just arrived.
  const scanSignature = records
    .filter((r) => r.source === "rfid" && r.checked_in_at)
    .map((r) => `${r.student_id}@${r.checked_in_at}`)
    .sort()
    .join("|");
  const seenScans = useRef<{ key: string; scans: Set<string> } | null>(null);
  const arrivalTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [arrivals, setArrivals] = useState<Set<string>>(new Set());
  useEffect(() => {
    const key = `${periodId}|${day}`;
    const scans = new Set(scanSignature ? scanSignature.split("|") : []);
    const previous = seenScans.current;
    seenScans.current = { key, scans };
    if (history || !previous || previous.key !== key) return;
    const fresh = [...scans]
      .filter((scan) => !previous.scans.has(scan))
      .map((scan) => scan.split("@")[0]);
    if (!fresh.length) return;
    setArrivals((old) => new Set([...old, ...fresh]));
    arrivalTimers.current.push(
      setTimeout(
        () =>
          setArrivals((old) => {
            const next = new Set(old);
            fresh.forEach((id) => next.delete(id));
            return next;
          }),
        1600,
      ),
    );
  }, [scanSignature, periodId, day, history]);
  useEffect(() => {
    const timers = arrivalTimers.current;
    return () => timers.forEach(clearTimeout);
  }, []);
  const last = [...records]
    .filter((r) => r.source === "rfid" && r.checked_in_at)
    .sort((a, b) => b.checked_in_at!.localeCompare(a.checked_in_at!))[0];
  const lastStudent = s.students.find((st) => st.id === last?.student_id);
  const pendingFor = (studentId: string) => {
    const matches = pendingAttendance.filter(
      (item) =>
        item.student_id === studentId &&
        item.period_id === periodId &&
        item.date === day,
    );
    return matches.find((item) => item.state === "conflict") ?? matches.at(-1);
  };
  const pendingError = pendingAttendance.find(
    (item) =>
      item.period_id === periodId &&
      item.date === day &&
      item.state === "pending" &&
      item.error,
  )?.error;
  const beforeRecord = (
    studentId: string,
    expected: Attendance | null,
  ): Attendance =>
    expected ?? {
      id: `pending:before:${studentId}`,
      teacher_id: s.teacher.id,
      attendance_session_id: session?.id ?? `pending:${periodId}:${day}`,
      student_id: studentId,
      status: "absent",
      source: "manual",
      checked_in_at: null,
    };
  async function change(student_id: string, status: Status) {
    const expected = records.find((r) => r.student_id === student_id) ?? null;
    if (!editable || (expected?.status ?? "absent") === status) return;
    setError("");
    try {
      const at = new Date().toISOString();
      await enqueueAttendance({
        operation_id: crypto.randomUUID(),
        action: "manual",
        student_id,
        period_id: periodId,
        date: day,
        status,
        at,
        expected,
      });
      const before = beforeRecord(student_id, expected);
      const record = {
        ...before,
        status,
        source: "manual" as const,
        checked_in_at: status === "present" || status === "late" ? at : null,
      };
      pushUndo({
        period: periodId,
        day,
        changes: [{ before, record }],
      });
      play("success");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    }
  }
  async function saveNote(student_id: string, note: string) {
    const expected = records.find((r) => r.student_id === student_id) ?? null;
    if ((expected?.note ?? "") === note) return;
    try {
      await enqueueAttendance({
        operation_id: crypto.randomUUID(),
        action: "note",
        student_id,
        period_id: periodId,
        date: day,
        status: expected?.status ?? "absent",
        at: new Date().toISOString(),
        expected,
        note,
      });
      notify(t(note ? "noteSaved" : "noteCleared"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("noteFailed"));
      throw e;
    }
  }
  /** Move the keyboard to a student and focus their current status. */
  function moveCursor(studentId: string) {
    setCursor(studentId);
    const row = rosterBody.current?.querySelector<HTMLElement>(
      `tr[data-student="${studentId}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
    (
      row?.querySelector<HTMLElement>('.status-option[aria-pressed="true"]') ??
      row
    )?.focus({ preventScroll: true });
  }
  const onShortcut = useRef<(event: KeyboardEvent) => void>(() => {});
  onShortcut.current = (event) => {
    const target = event.target as HTMLElement | null;
    const typing = target?.closest(
      "input, textarea, select, [contenteditable]",
    );
    // Ctrl+Z (⌘Z on a Mac) does what the Undo pop does.
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      !event.altKey &&
      event.key.toLowerCase() === "z" &&
      undo &&
      !typing &&
      !document.querySelector("dialog[open]")
    ) {
      event.preventDefault();
      void undoChange();
      return;
    }
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      typing ||
      document.querySelector("dialog[open]")
    )
      return;
    const ids = students.map((student) => student.id);
    const action = rosterShortcut(event.key, ids, cursor);
    if (!action) return;
    if (action.kind === "search") {
      event.preventDefault();
      searchInput.current?.focus();
    } else if (action.kind === "clear") {
      setCursor(null);
    } else if (action.kind === "move") {
      event.preventDefault();
      moveCursor(action.studentId);
    } else if (action.kind === "mark" && editable) {
      event.preventDefault();
      void change(action.studentId, action.status);
      if (action.next) moveCursor(action.next);
      else setCursor(action.studentId);
    } else if (action.kind === "note" && editable && notesOn) {
      event.preventDefault();
      setCursor(action.studentId);
      setNoting(action.studentId);
    }
  };
  useEffect(() => {
    if (!shortcutsOn) return;
    const listener = (event: KeyboardEvent) => onShortcut.current(event);
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [shortcutsOn]);
  async function changeSelected() {
    if (!selected.size || bulkBusy || !editable) return;
    setBulkBusy(true);
    setError("");
    const changes: { before: Attendance; record: Attendance }[] = [];
    const failed = new Set<string>();
    const messages: string[] = [];
    try {
      for (const student_id of selected) {
        const expected =
          records.find((r) => r.student_id === student_id) ?? null;
        if ((expected?.status ?? "absent") === bulkStatus) continue;
        const at = new Date().toISOString();
        try {
          await enqueueAttendance({
            operation_id: crypto.randomUUID(),
            action: "manual",
            student_id,
            period_id: periodId,
            date: day,
            status: bulkStatus,
            at,
            expected,
          });
          const before = beforeRecord(student_id, expected);
          changes.push({
            before,
            record: {
              ...before,
              status: bulkStatus,
              source: "manual",
              checked_in_at:
                bulkStatus === "present" || bulkStatus === "late" ? at : null,
            },
          });
        } catch (cause) {
          failed.add(student_id);
          messages.push(
            `${s.students.find((item) => item.id === student_id)?.display_name ?? t("student")}: ${cause instanceof Error ? cause.message : t("queueFailed")}`,
          );
        }
      }
      if (changes.length) pushUndo({ period: periodId, day, changes });
      setSelected(failed);
      setError(messages.join(" "));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("bulkFailed"));
    } finally {
      setBulkBusy(false);
    }
  }
  async function undoChange() {
    if (!undo || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    const failed: typeof undo.changes = [];
    const messages: string[] = [];
    for (const change of undo.changes) {
      try {
        await enqueueAttendance({
          operation_id: crypto.randomUUID(),
          action: "manual",
          at: new Date().toISOString(),
          student_id: change.record.student_id,
          period_id: undo.period,
          date: undo.day,
          status: change.before.status,
          expected:
            records.find(
              (record) => record.student_id === change.record.student_id,
            ) ?? null,
          restore: {
            status: change.before.status,
            source: change.before.source,
            checked_in_at: change.before.checked_in_at,
          },
        });
      } catch (e) {
        failed.push(change);
        messages.push(
          `${s.students.find((st) => st.id === change.record.student_id)?.display_name ?? t("student")}: ${
            e instanceof Error ? e.message : t("undoFailed")
          }`,
        );
      }
    }
    setUndoStack((old) =>
      failed.length
        ? [...old.slice(0, -1), { ...undo, changes: failed }]
        : old.slice(0, -1),
    );
    // The pop undoes only the latest change; earlier ones are Ctrl+Z only.
    setUndoShown(failed.length > 0);
    setError(messages.join(" "));
    setBulkBusy(false);
  }
  function exportCsv() {
    const cell = (v: string) =>
      '"' + (/^[=+\-@\t\r]/.test(v) ? "'" + v : v).replaceAll('"', '""') + '"';
    const text = [
      [
        t("csvDate"),
        t("csvPeriod"),
        t("csvStudent"),
        t("csvStatus"),
        t("csvCheckIn"),
        t("csvSource"),
        t("csvNote"),
      ],
      ...students.map((st) => {
        const r = records.find((r) => r.student_id === st.id);
        return [
          day,
          s.periods.find((p) => p.id === periodId)?.name ?? "",
          st.display_name,
          common(r?.status ?? "absent"),
          r?.checked_in_at ?? "",
          r?.source ?? "",
          r?.note ?? "",
        ];
      }),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = t("csvFile", { day });
    a.click();
    URL.revokeObjectURL(url);
    notify(t("downloaded"));
  }
  return (
    <>
      {history && (
        <HistoryOverview
          snapshot={s}
          periodId={periodId}
          selectedDate={historyDate}
          showDaySummary={historyDateSelected}
          today={date}
          month={historyMonth}
          onMonthChange={(nextMonth) => {
            setHistoryMonth(nextMonth);
            window.history.replaceState(
              null,
              "",
              historyUrl(periodId, historyDate, nextMonth, historyDateSelected),
            );
          }}
          onDateChange={selectHistoryDate}
        />
      )}
      {(!history || historyDateSelected) && (
        <section className="card attendance-card simple-attendance">
          {history && session && (
            <div className="history-correction">
              <div>
                <strong>
                  {s.periods.find((p) => p.id === periodId)?.name} · {day}
                </strong>
                <p className="hint">
                  {t(correcting ? "correcting" : "viewing")}
                </p>
              </div>
              <button
                className="secondary"
                disabled={bulkBusy}
                onClick={() => {
                  setCorrecting(!correcting);
                  setSelecting(false);
                  setSelected(new Set());
                }}
              >
                {t(correcting ? "doneCorrecting" : "correctDay")}
              </button>
            </div>
          )}
          {!history && (
            <div className="attendance-overview">
              <div className="attendance-hero">
                <p className="big-count">
                  <strong>{present.length + late}</strong>
                  <span>/ {roster.length}</span>
                </p>
                <div className="attendance-hero-detail">
                  <p className="big-count-label">{t("hereToday")}</p>
                  <StatusBar
                    counts={{ present: present.length, late, excused, absent }}
                  />
                  <ul className="attendance-stats" aria-label={t("summary")}>
                    {(
                      [
                        ["present", present.length],
                        ["late", late],
                        ["excused", excused],
                        ["absent", absent],
                      ] as const
                    ).map(([key, value]) => (
                      <li key={key} className={"attendance-stat " + key}>
                        <span
                          className="attendance-stat-key"
                          aria-hidden="true"
                        />
                        <span>{common(key)}</span>
                        <strong>{value}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {lastStudent && (
                <div className="latest-checkin">
                  <ScanLine size={17} aria-hidden="true" />
                  <span>
                    {t.rich(
                      "lastTap",
                      { b: (text) => <strong>{text}</strong> },
                      { name: lastStudent.display_name },
                    )}
                  </span>
                  <time>
                    {localTime(
                      last?.checked_in_at ?? null,
                      s.teacher.timezone,
                      intl,
                    )}
                  </time>
                </div>
              )}
              {qrSetupCount > 0 && (
                <p className="attendance-setup-note">
                  {t("qrSetupCount", { count: qrSetupCount })}
                </p>
              )}
            </div>
          )}
          {pendingError && (
            <p className="notice error attendance-message" role="alert">
              {t("pendingRetry", { error: localize(pendingError) })}
            </p>
          )}
          {attendanceStorageError && (
            <p className="notice error attendance-message" role="alert">
              {localize(attendanceStorageError)}
            </p>
          )}
          <div className="table-controls">
            <div className="search-box">
              <Search size={18} />
              <input
                ref={searchInput}
                aria-label={t("searchStudents")}
                placeholder={t("findStudent")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="table-control-actions">
              <button
                className="secondary"
                disabled={!students.length || (history && !session)}
                onClick={exportCsv}
              >
                <Download size={16} /> {t("exportCsv")}
              </button>
              {editable && students.length > 0 && (
                <button
                  className="secondary attendance-select-button"
                  aria-pressed={selecting}
                  disabled={bulkBusy}
                  onClick={() => {
                    setSelecting(!selecting);
                    setSelected(new Set());
                  }}
                >
                  {t(selecting ? "cancelSelection" : "selectMultiple")}
                </button>
              )}
              {!history && (
                <button
                  className="secondary add-student-action"
                  onClick={() => setEditing({ active: true })}
                >
                  <Plus size={17} /> {t("addStudent")}
                </button>
              )}
            </div>
          </div>
          {shortcutsOn && editable && students.length > 0 && (
            <p className="shortcut-hint">
              <span>{t("keyboard")}</span>
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> {t("keyMove")}
              </span>
              <span>
                <kbd>P</kbd>
                <kbd>A</kbd>
                <kbd>L</kbd>
                <kbd>E</kbd> {t("keyMark")}
              </span>
              {notesOn && (
                <span>
                  <kbd>N</kbd> {t("keyNote")}
                </span>
              )}
              <span>
                <kbd>/</kbd> {t("keyFind")}
              </span>
              <span>
                <kbd>Ctrl</kbd>
                <kbd>Z</kbd> {t("keyUndo")}
              </span>
            </p>
          )}
          {editable && selecting && (
            <div className="bulk-attendance selecting">
              <>
                <span>{day}</span>
                <CustomSelect
                  ariaLabel={t("bulkStatusLabel")}
                  value={bulkStatus}
                  disabled={bulkBusy}
                  onChange={(value) => setBulkStatus(value as Status)}
                  options={[
                    { value: "present", label: common("present") },
                    { value: "absent", label: common("absent") },
                    { value: "late", label: common("late") },
                    { value: "excused", label: common("excused") },
                  ]}
                />
                <button
                  className="primary"
                  disabled={
                    !selected.size ||
                    bulkBusy ||
                    Boolean(attendanceStorageError)
                  }
                  onClick={() => void changeSelected()}
                >
                  {bulkBusy
                    ? common("saving")
                    : t("markSelected", {
                        count: selected.size,
                        status: common(bulkStatus).toLocaleLowerCase(intl),
                      })}
                </button>
              </>
              <p className="hint">{t("bulkHint")}</p>
            </div>
          )}
          {undo && undoShown && (
            // Floats top right, like the scanner button bottom right.
            <div className="undo-pop" role="status">
              <button
                type="button"
                className="undo-pop-action"
                title={shortcutsOn ? t("undoTitle") : undefined}
                disabled={bulkBusy}
                onClick={() => void undoChange()}
              >
                <Undo2 size={18} aria-hidden="true" />
                {undo.changes.length > 1
                  ? t("undoMany", { count: undo.changes.length })
                  : t("undo")}
              </button>
              <button
                type="button"
                className="undo-pop-close"
                aria-label={t("dismissUndo")}
                onClick={() => setUndoShown(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          {history && !session ? (
            <Empty icon={CalendarX} title={t("noDay")} body={t("noDayBody")} />
          ) : students.length ? (
            <div className="table-scroll">
              <table
                className="simple-roster"
                role="table"
                aria-label={t("tableLabel", {
                  name:
                    s.periods.find((p) => p.id === periodId)?.name ??
                    t("classFallback"),
                  day,
                })}
              >
                <thead>
                  <tr>
                    <th>{t("colStudent")}</th>
                    <th>{t("colStatus")}</th>
                    <th className="checkin-column">{t("colCheckedIn")}</th>
                    <th className="edit-column">
                      <span className="sr-only">{t("colEdit")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody ref={rosterBody}>
                  {students.map((st) => {
                    const r = records.find((r) => r.student_id === st.id),
                      status = r?.status ?? "absent";
                    const queued = pendingFor(st.id);
                    const hasTag = s.rfid_tags.some(
                      (tag) => tag.active && tag.student_id === st.id,
                    );
                    return (
                      <tr
                        key={st.id}
                        role="row"
                        data-student={st.id}
                        tabIndex={shortcutsOn ? -1 : undefined}
                        onFocus={
                          shortcutsOn ? () => setCursor(st.id) : undefined
                        }
                        className={
                          `status-${status}` +
                          (arrivals.has(st.id) ? " just-arrived" : "") +
                          (shortcutsOn && cursor === st.id
                            ? " keyboard-current"
                            : "")
                        }
                      >
                        <td>
                          <div className="student-cell">
                            {selecting && (
                              <label className="row-select">
                                <input
                                  type="checkbox"
                                  aria-label={t("select", {
                                    name: st.display_name,
                                  })}
                                  checked={selected.has(st.id)}
                                  disabled={
                                    bulkBusy ||
                                    (selected.size >= 100 &&
                                      !selected.has(st.id))
                                  }
                                  onChange={(e) =>
                                    setSelected((old) => {
                                      const next = new Set(old);
                                      if (e.target.checked) next.add(st.id);
                                      else next.delete(st.id);
                                      return next;
                                    })
                                  }
                                />
                              </label>
                            )}
                            <Avatar student={st} />
                            <span className="student-name">
                              {st.display_name}
                              {r?.source === "qr" && (
                                <span
                                  className="tag page"
                                  title={t("qrTagTitle")}
                                >
                                  <QrCode size={13} aria-hidden="true" />
                                  {t("qrTag")}
                                </span>
                              )}
                              {!history && qrSetup(st) && (
                                <span className="tag qr-setup-tag">
                                  {qrSetup(st)}
                                </span>
                              )}
                              {!history && !hasTag && (
                                <span className="tag">{t("noCard")}</span>
                              )}
                              {notesOn && r?.note && (
                                <button
                                  type="button"
                                  className="tag page attendance-note"
                                  disabled={!editable}
                                  onClick={() => setNoting(st.id)}
                                  aria-label={t("noteLabel", { note: r.note })}
                                >
                                  <StickyNote size={13} aria-hidden="true" />
                                  {r.note}
                                </button>
                              )}
                            </span>
                          </div>
                        </td>
                        <td
                          data-label={t("colStatus")}
                          className={
                            queued?.state === "pending"
                              ? "status-column status-pending"
                              : "status-column"
                          }
                        >
                          {editable ? (
                            <StatusToggle
                              name={st.display_name}
                              value={status}
                              vertical={!shortcutsOn}
                              disabled={Boolean(attendanceStorageError)}
                              onChange={(value) => void change(st.id, value)}
                            />
                          ) : (
                            <Badge status={status} />
                          )}
                          {queued && (
                            <span
                              className={
                                queued.state === "conflict"
                                  ? "saving-status"
                                  : "sr-only"
                              }
                              role="status"
                            >
                              {queued.state === "conflict"
                                ? queued.error
                                  ? localize(queued.error)
                                  : t("syncConflict")
                                : t("pendingSync")}
                            </span>
                          )}
                          {queued?.state === "conflict" && (
                            <button
                              type="button"
                              className="text-button"
                              onClick={() =>
                                void discardAttendanceConflict(st.id).then(
                                  refresh,
                                )
                              }
                            >
                              {t("discardConflict")}
                            </button>
                          )}
                        </td>
                        <td
                          className="time-cell checkin-column"
                          data-label={t("colCheckedIn")}
                          data-prefix={t("checkedInPrefix")}
                        >
                          {localTime(
                            r?.checked_in_at ?? null,
                            s.teacher.timezone,
                            intl,
                          )}
                          {/* Only self check-ins are labeled; teacher marks are the norm. */}
                          {history &&
                            (r?.source === "rfid" || r?.source === "qr") && (
                              <small className="block">
                                {t(
                                  r.source === "rfid"
                                    ? "sourceTag"
                                    : "sourceQr",
                                )}
                              </small>
                            )}
                        </td>
                        <td className="edit-column">
                          {notesOn && editable && (
                            <button
                              type="button"
                              className={
                                "icon-button note-button" +
                                (r?.note ? " has-note" : "")
                              }
                              aria-label={t(
                                r?.note ? "editNoteFor" : "addNoteFor",
                                {
                                  name: st.display_name,
                                },
                              )}
                              title={t(r?.note ? "editNote" : "addNote")}
                              onClick={() => setNoting(st.id)}
                            >
                              <StickyNote size={17} aria-hidden="true" />
                            </button>
                          )}
                          {(!history || correcting) && (
                            <button
                              className="secondary compact"
                              aria-label={t("editStudent", {
                                name: st.display_name,
                              })}
                              onClick={() => setEditing(st)}
                            >
                              {common("edit")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="roster-empty">
              <Empty
                icon={roster.length ? SearchX : UserPlus}
                action={
                  !roster.length &&
                  !history && (
                    <button
                      className="primary"
                      onClick={() => setEditing({ active: true })}
                    >
                      <Plus size={17} /> {t("addStudent")}
                    </button>
                  )
                }
                title={t(roster.length ? "noMatches" : "addStudentsTitle")}
                body={t(roster.length ? "noMatchesBody" : "addStudentsBody")}
              />
            </div>
          )}
          <div className="table-footer">
            {!history && roster.length > 0 && (
              <ul className="footer-stats" aria-label={t("todaySoFar")}>
                {(
                  [
                    ["present", t("footerPresent"), present.length],
                    ["late", t("footerLate"), late],
                    ["excused", t("footerExcused"), excused],
                    ["absent", t("footerAbsent"), absent],
                  ] as const
                ).map(([key, label, value]) => (
                  <li key={key} className={"badge " + key}>
                    <strong>{value}</strong> {label}
                  </li>
                ))}
              </ul>
            )}
            <span>
              {students.length !== roster.length
                ? t("studentCountOf", {
                    count: students.length,
                    total: roster.length,
                  })
                : t("studentCount", { count: students.length })}{" "}
              {(!history || correcting) && t("autoSave")}
            </span>
          </div>
        </section>
      )}
      {noting && (
        <AttendanceNoteDialog
          key={noting}
          studentName={
            s.students.find((student) => student.id === noting)?.display_name ??
            t("studentFallback")
          }
          note={records.find((r) => r.student_id === noting)?.note ?? ""}
          save={(note) => saveNote(noting, note)}
          close={() => {
            const id = noting;
            setNoting(null);
            if (shortcutsOn) requestAnimationFrame(() => moveCursor(id));
          }}
        />
      )}
      {editing && (
        <StudentDialog
          key={editing.id ?? "new"}
          student={editing}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}
