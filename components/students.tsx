"use client";
import { useEffect, useRef, useState } from "react";
import { ScanLine, Check } from "lucide-react";
import { DialogHead } from "./ui";
import type { Student } from "@/types";
import { normalizeUid } from "@/lib/core";
import { useClassroom } from "./context";
import { useBluetooth } from "./bluetooth-provider";
import { CustomSelect } from "./custom-select";
import {
  schoolEmailFromStudentId,
  schoolStudentIdError,
} from "@/lib/school-student-id";
import { useLocalize, useT } from "./i18n";

export function StudentDialog({
  student,
  close,
}: {
  student: Partial<Student>;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    element?.showModal();
    element
      ?.querySelector<HTMLInputElement>("[data-student-first-name]")
      ?.focus();
    return () => {
      element?.close();
      requestAnimationFrame(() => {
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="student-dialog"
      aria-labelledby="student-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        dialog.current
          ?.querySelector<HTMLButtonElement>(".modal-head > button")
          ?.click();
      }}
    >
      <StudentEditor student={student} close={close} />
    </dialog>
  );
}

function StudentEditor({
  student,
  close,
}: {
  student: Partial<Student>;
  close: () => void;
}) {
  const { s, periodId, mutate, notify } = useClassroom();
  const t = useT("students");
  const localize = useLocalize();
  const { state: bluetooth } = useBluetooth();
  const [id, setId] = useState(student.id ?? "");
  const [firstName, setFirstName] = useState(student.first_name ?? "");
  const [lastName, setLastName] = useState(student.last_name ?? "");
  const [displayName, setDisplayName] = useState(
    student.display_name === `${student.first_name} ${student.last_name}`
      ? ""
      : (student.display_name ?? ""),
  );
  const [notes, setNotes] = useState(student.optional_notes ?? "");
  const [schoolStudentId, setSchoolStudentId] = useState(
    student.school_student_id ?? "",
  );
  const [active, setActive] = useState(student.active ?? true);
  const [classes, setClasses] = useState(() =>
    student.id
      ? s.period_students
          .filter((m) => m.student_id === student.id)
          .map((m) => m.period_id)
      : periodId
        ? [periodId]
        : [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(!student.id);
  const [deviceId, setDeviceId] = useState(
    () =>
      s.devices.find((d) => d.active && d.id === bluetooth.deviceId)?.id ??
      s.devices.find((d) => d.active)?.id ??
      "",
  );
  const [capturing, setCapturing] = useState(false);
  const [capturedUid, setCapturedUid] = useState("");
  const [manual, setManual] = useState(false);
  const [manualUid, setManualUid] = useState("");
  const [now, setNow] = useState(Date.now());
  const enrollment = useRef<{ deviceId: string; until: string } | null>(null);
  const mounted = useRef(true);
  const device = s.devices.find((d) => d.id === deviceId && d.active);
  const waiting =
    capturing &&
    !!device?.enrollment_until &&
    !!enrollment.current &&
    Date.parse(device.enrollment_until) ===
      Date.parse(enrollment.current.until) &&
    Date.parse(device.enrollment_until) > now;
  const candidate = manual ? manualUid : waiting ? capturedUid : "";
  const currentTag = s.rfid_tags.find(
    (tag) => tag.student_id === id && tag.active,
  );
  let uid = "";
  try {
    if (candidate) uid = normalizeUid(candidate);
  } catch {}
  const conflict =
    uid && s.rfid_tags.find((tag) => tag.uid === uid && tag.student_id !== id);
  const name =
    displayName.trim() || `${firstName.trim()} ${lastName.trim()}`.trim();

  // Leaving this page also returns this scanner to attendance. The server's
  // ten-minute expiry remains the fallback if the browser loses its connection.
  function releaseOnExit(session: { deviceId: string; until: string }) {
    void fetch("/api/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "enrollment",
        device_id: session.deviceId,
        enabled: false,
        expected_until: session.until,
      }),
      keepalive: true,
    }).catch(() => {});
  }
  useEffect(() => {
    mounted.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      if (enrollment.current) releaseOnExit(enrollment.current);
    };
  }, []);
  useEffect(() => {
    if (waiting && !capturedUid && device?.pending_uid)
      setCapturedUid(device.pending_uid);
  }, [waiting, capturedUid, device?.pending_uid]);
  useEffect(() => {
    if (!waiting || capturedUid || manual || !deviceId) return;
    let cancelled = false;
    let checking = false;
    const check = async () => {
      if (checking) return;
      checking = true;
      try {
        const response = await fetch(
          `/api/devices/enrollment?deviceId=${encodeURIComponent(deviceId)}`,
          { cache: "no-store" },
        );
        if (!response.ok) return;
        const result = await response.json();
        if (!cancelled && typeof result.pendingUid === "string")
          setCapturedUid(result.pendingUid);
      } catch {
        // Keep waiting; the teacher can also enter the UID manually.
      } finally {
        checking = false;
      }
    };
    void check();
    const timer = setInterval(() => void check(), 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [waiting, capturedUid, manual, deviceId]);

  async function stopCapture() {
    if (enrollment.current) {
      await mutate({
        action: "enrollment",
        device_id: enrollment.current.deviceId,
        enabled: false,
        expected_until: enrollment.current.until,
      });
      enrollment.current = null;
    }
    setCapturing(false);
    setCapturedUid("");
    setManual(false);
    setManualUid("");
  }
  async function finishEditing() {
    setBusy(true);
    setError("");
    try {
      await stopCapture();
      close();
    } catch {
      setError(t("scannerReturnFailed"));
    } finally {
      setBusy(false);
    }
  }
  function changed() {
    setDirty(true);
    setSaved(false);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (schoolStudentId && schoolStudentIdError(schoolStudentId)) {
      setError(schoolStudentIdError(schoolStudentId)!);
      return;
    }
    if (!id && !schoolStudentId) {
      setError(t("schoolIdRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await stopCapture();
      const result = await mutate({
        action: "student",
        ...(id ? { id } : {}),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: name,
        school_student_id: schoolStudentId.trim() || null,
        optional_notes: notes,
        active,
      });
      const savedId = id || (typeof result.id === "string" ? result.id : "");
      if (!savedId) throw new Error(t("openFailed"));
      // Retain the ID immediately so retrying a failed class update does not
      // create a second student.
      setId(savedId);
      const before = s.period_students
        .filter((m) => m.student_id === savedId)
        .map((m) => m.period_id);
      for (const selectedId of new Set([...before, ...classes])) {
        if (before.includes(selectedId) !== classes.includes(selectedId))
          await mutate({
            action: "membership",
            student_id: savedId,
            period_id: selectedId,
            remove: !classes.includes(selectedId),
          });
      }
      setSaved(true);
      setDirty(false);
      notify(t("saved"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }
  async function startCapture() {
    if (!device || busy || !id || dirty || !active) return;
    setBusy(true);
    setError("");
    try {
      const result = await mutate({
        action: "enrollment",
        device_id: deviceId,
        enabled: true,
      });
      if (typeof result.enrollment_until !== "string")
        throw new Error(t("cardSetupFailed"));
      const session = { deviceId, until: result.enrollment_until };
      enrollment.current = session;
      if (!mounted.current) {
        releaseOnExit(session);
        return;
      }
      setManual(false);
      setCapturedUid("");
      setCapturing(true);
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("scannerStartFailed"));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function assignTag() {
    if (
      !uid ||
      conflict ||
      busy ||
      !id ||
      dirty ||
      !active ||
      (!manual && !waiting)
    )
      return;
    setBusy(true);
    setError("");
    try {
      await mutate({
        action: "tag",
        student_id: id,
        uid,
      });
      await stopCapture();
      notify(t("cardReady", { name }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("cardFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="student-editor">
      <DialogHead
        id="student-dialog-title"
        title={id ? t("editTitle", { name }) : t("addTitle")}
        closeLabel={dirty ? t("cancelAndClose") : undefined}
        disabled={busy}
        close={() => void finishEditing()}
      />
      {error && (
        <p className="field-error" role="alert">
          {localize(error)}
        </p>
      )}
      <form className="form-stack" onSubmit={save}>
        <fieldset
          disabled={busy || capturing || manual}
          className="student-fields"
        >
          <div className="form-row">
            <label>
              {t("firstName")}
              <input
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  changed();
                }}
                required
                maxLength={100}
                data-student-first-name
              />
            </label>
            <label>
              {t("lastName")}
              <input
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  changed();
                }}
                required
                maxLength={100}
              />
            </label>
          </div>
          <label>
            {t("schoolId")}{" "}
            {!id && <span className="muted">{t("required")}</span>}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              autoComplete="off"
              value={schoolStudentId}
              onChange={(event) => {
                setSchoolStudentId(event.target.value);
                changed();
              }}
              placeholder="123456"
              maxLength={6}
              required={!id}
            />
          </label>
          <p className="hint" role="status">
            {schoolEmailFromStudentId(schoolStudentId)
              ? t("schoolEmail", {
                  email: schoolEmailFromStudentId(schoolStudentId)!,
                })
              : id && !schoolStudentId
                ? t("schoolIdNeeded")
                : t("schoolIdHint")}
          </p>
          <fieldset className="student-class-options">
            <legend>{t("classes")}</legend>
            {s.periods
              .filter((p) => p.active || classes.includes(p.id))
              .map((p) => (
                <label className="inline-check" key={p.id}>
                  <input
                    type="checkbox"
                    checked={classes.includes(p.id)}
                    disabled={!p.active}
                    onChange={(e) => {
                      setClasses(
                        e.target.checked
                          ? [...classes, p.id]
                          : classes.filter((value) => value !== p.id),
                      );
                      changed();
                    }}
                  />
                  {t("className", { number: p.period_number, name: p.name })}
                  {!p.active && t("archivedSuffix")}
                </label>
              ))}
            {!s.periods.length && <p className="hint">{t("noClasses")}</p>}
          </fieldset>
          <details className="student-extra-details">
            <summary>{t("moreDetails")}</summary>
            <label>
              {t("displayName")} <span className="muted">{t("optional")}</span>
              <input
                value={displayName}
                placeholder={`${firstName} ${lastName}`.trim()}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  changed();
                }}
                maxLength={100}
              />
            </label>
            <label>
              {t("notes")} <span className="muted">{t("optional")}</span>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  changed();
                }}
                maxLength={500}
              />
            </label>
            <label className="inline-check">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => {
                  setActive(e.target.checked);
                  changed();
                }}
              />
              {t("active")}
            </label>
            <p className="hint">{t("activeHint")}</p>
          </details>
        </fieldset>
        <div className="student-editor-actions">
          {saved && !dirty && (
            <span className="field-success" role="status">
              <Check size={16} /> {t("savedShort")}
              {t(!currentTag && active ? "savedAddCard" : "savedEnd")}
            </span>
          )}
          <button className="primary" disabled={busy || !dirty}>
            {t(busy ? "saving" : id ? "saveChanges" : "saveStudent")}
          </button>
        </div>
      </form>
      {!id ? (
        <p className="hint">{t("cardAfterSave")}</p>
      ) : (
        <section className="student-tag-section" aria-label={t("cardSection")}>
          <div className="student-editor-head">
            <div>
              <h3>
                <ScanLine size={19} /> {t("scanCard")}{" "}
                <span className="muted">{t("optional")}</span>
              </h3>
              {!currentTag && <p className="muted">{t("cardIntro")}</p>}
            </div>
            {currentTag && (
              <span className="tag success">
                <Check size={15} /> {t("ready")}
              </span>
            )}
          </div>
          {dirty ? (
            <p className="hint">{t("saveFirst")}</p>
          ) : !active ? (
            <p className="hint">{t("makeActive")}</p>
          ) : (
            <>
              {s.devices.filter((d) => d.active).length > 1 && !capturing && (
                <label>
                  {t("useScanner")}
                  <CustomSelect
                    ariaLabel={t("useScanner")}
                    value={deviceId}
                    onChange={setDeviceId}
                    disabled={busy}
                    options={s.devices
                      .filter((d) => d.active)
                      .map((device) => ({
                        value: device.id,
                        label: device.device_name,
                      }))}
                  />
                </label>
              )}
              {capturing && !manual && (
                <div className="enrollment-state" role="status">
                  <ScanLine size={30} />
                  <h3>
                    {t(uid ? "cardDetected" : waiting ? "tapCard" : "timedOut")}
                  </h3>
                  <p>
                    {uid
                      ? t("confirmCard", { name })
                      : t(waiting ? "holdCard" : "startAgain")}
                  </p>
                  {waiting && <p className="hint">{t("paused")}</p>}
                </div>
              )}
              {!capturing && !manual && (
                <button
                  className="secondary"
                  disabled={busy || !device}
                  onClick={startCapture}
                >
                  <ScanLine size={16} />
                  {t(currentTag ? "replaceCard" : "addCard")}
                </button>
              )}
              {capturing && !waiting && !manual && (
                <button
                  className="secondary"
                  disabled={busy || !device}
                  onClick={startCapture}
                >
                  {t("tryAgain")}
                </button>
              )}
              {!device && <p className="hint">{t("noScanner")}</p>}
              {conflict && (
                <p className="field-error" role="alert">
                  {t("cardTaken")}
                </p>
              )}
              {(capturing || manual) && (
                <div className="student-editor-actions">
                  {(uid || manual) && (
                    <button
                      className="primary"
                      disabled={
                        busy || !uid || !!conflict || (!manual && !waiting)
                      }
                      onClick={assignTag}
                    >
                      {t("assignCard", {
                        name: firstName || t("studentFallback"),
                      })}
                    </button>
                  )}
                  <button
                    className="secondary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      try {
                        await stopCapture();
                      } catch {
                        setError(t("cancelFailed"));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t("cancelSetup")}
                  </button>
                </div>
              )}
              <details className="student-extra-details">
                <summary>{t("cardDetails")}</summary>
                {currentTag && (
                  <p className="hint">
                    {t.rich(
                      "currentCard",
                      { code: (text) => <code>{text}</code> },
                      {
                        uid: currentTag.uid,
                      },
                    )}
                  </p>
                )}
                {uid && !manual && (
                  <p className="hint">
                    {t.rich(
                      "detectedCard",
                      { code: (text) => <code>{text}</code> },
                      { uid },
                    )}
                  </p>
                )}
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={manual}
                    disabled={busy || capturing}
                    onChange={(e) => {
                      setManual(e.target.checked);
                      setManualUid("");
                    }}
                  />
                  {t("manualEntry")}
                </label>
                {capturing && <p className="hint">{t("cancelBeforeManual")}</p>}
                {manual && (
                  <label>
                    {t("cardNumber")}
                    <input
                      value={manualUid}
                      onChange={(e) => setManualUid(e.target.value)}
                      placeholder="04:A7:31:8C:92:66:80"
                      maxLength={40}
                    />
                    <span className="hint">{t("cardNumberHint")}</span>
                  </label>
                )}
              </details>
            </>
          )}
        </section>
      )}
    </div>
  );
}
