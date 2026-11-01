"use client";
import { useState } from "react";
import { Modal } from "./ui";
import { useT } from "./i18n";

const quickNotes = [
  "quickNurse",
  "quickOffice",
  "quickCounselor",
  "quickParent",
  "quickTrip",
  "quickLeft",
] as const;
export const maxNoteLength = 200;

/** Write or clear the short note on one student's mark for the day. */
export function AttendanceNoteDialog({
  studentName,
  note,
  save,
  close,
}: {
  studentName: string;
  note: string;
  save: (note: string) => Promise<void>;
  close: () => void;
}) {
  const t = useT("notes");
  const [text, setText] = useState(note);
  const [busy, setBusy] = useState(false);
  async function submit(value: string) {
    setBusy(true);
    try {
      await save(value.trim());
      close();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={t("title", { name: studentName })}
      className="note-modal"
      close={close}
    >
      <form
        className="form-stack note-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(text);
        }}
      >
        <div className="note-quick" role="group" aria-label={t("quickNotes")}>
          {quickNotes.map((key) => (
            <button
              key={key}
              type="button"
              className="chip"
              aria-pressed={text.trim() === t(key)}
              onClick={() => setText(t(key))}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <label>
          {t("note")}
          <textarea
            autoFocus
            rows={3}
            maxLength={maxNoteLength}
            value={text}
            placeholder={t("placeholder")}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter saves; Shift+Enter starts a new line.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submit(text);
              }
            }}
          />
          <small className="hint">
            {text.length}/{maxNoteLength}
          </small>
        </label>
        <div className="form-actions">
          {note && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void submit("")}
            >
              {t("clear")}
            </button>
          )}
          <button type="submit" className="primary" disabled={busy}>
            {t(busy ? "saving" : "save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
