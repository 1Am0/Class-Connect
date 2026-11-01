"use client";

import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import type { ActivitySetItem } from "@/types";
import {
  parseActivityTextImport,
  reviewActivityTextImport,
  type ActivityTextImportMode,
  type ActivityTextRow,
  type TextActivityKind,
} from "@/lib/activity-text-import";
import { useLocalize, useT } from "./i18n";

export function ActivityTextImporter({
  kind,
  existing,
  onApply,
  onClose,
}: {
  kind: TextActivityKind;
  existing: ActivitySetItem[];
  onApply: (mode: ActivityTextImportMode, rows: ActivityTextRow[]) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<ActivityTextImportMode>("add");
  const [source, setSource] = useState("");
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<ActivityTextRow[] | null>(null);
  const [error, setError] = useState("");
  const t = useT("importer");
  const localize = useLocalize();
  // "Prompts" or "Sentences": the key suffix for this kind's wording.
  const k = kind === "conversation" ? "Prompts" : "Sentences";
  type Key = Parameters<typeof t>[0];
  const tk = (base: string, vars?: { count: number }) =>
    t(`${base}${k}` as Key, vars);
  const reviewed = useMemo(
    () => (rows ? reviewActivityTextImport(rows, existing, mode) : []),
    [rows, existing, mode],
  );
  const ready = reviewed.filter((row) => row.status === "ready");
  const incomplete = reviewed.filter((row) => row.status === "incomplete");
  const duplicates = reviewed.filter((row) => row.status === "duplicate");
  const currentCount = existing.filter((item) => item.text.trim()).length;
  const exceedsLimit = ready.length + (mode === "add" ? currentCount : 0) > 100;

  function preview(value = source) {
    try {
      setRows(parseActivityTextImport(value, kind));
      setError("");
    } catch (cause) {
      setRows(null);
      setError(
        cause instanceof Error
          ? localize(cause.message)
          : t("readSentencesFailed"),
      );
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError(t("fileTooBig"));
      setRows(null);
      return;
    }
    try {
      const value = await file.text();
      setSource(value);
      setFilename(file.name);
      preview(value);
    } catch {
      setError(t("fileFailed"));
      setRows(null);
    }
  }

  return (
    <section className="activity-vocabulary-import" aria-label={tk("title")}>
      <div className="activity-vocabulary-import-head">
        <div>
          <h4>{tk("title")}</h4>
          <p>{tk("intro")}</p>
        </div>
        <button type="button" className="secondary compact" onClick={onClose}>
          {t("close")}
        </button>
      </div>
      <div
        className="activity-vocabulary-import-options"
        role="group"
        aria-label={t("method")}
      >
        <label>
          <input
            type="radio"
            name={`${kind}-import-mode`}
            checked={mode === "add"}
            onChange={() => setMode("add")}
          />
          {tk("add")}
        </label>
        <label>
          <input
            type="radio"
            name={`${kind}-import-mode`}
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          {tk("replace")}
        </label>
      </div>
      <label className="activity-vocabulary-import-source">
        <span>{tk("source")}</span>
        <textarea
          value={source}
          onChange={(event) => {
            setSource(event.target.value);
            setFilename("");
            setRows(null);
            setError("");
          }}
          placeholder={
            kind === "conversation"
              ? "¿Cómo estás?,How are you?\n¿Qué hora es?,What time is it?"
              : "Es hora de comer,It is time to eat\nMe gusta leer,I like to read"
          }
          rows={5}
        />
      </label>
      <div className="activity-vocabulary-import-controls">
        <label className="secondary compact activity-vocabulary-upload">
          <FileUp size={16} aria-hidden="true" /> {t("upload")}
          <input
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
        </label>
        <button
          type="button"
          className="secondary compact"
          onClick={() => preview()}
        >
          {tk("preview")}
        </button>
        {filename && (
          <span className="activity-vocabulary-filename">{filename}</span>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      {rows && (
        <div className="activity-vocabulary-preview">
          <p role="status">
            {t(mode === "add" ? "toAdd" : "toReplace", { count: ready.length })}
            {duplicates.length > 0 &&
              t("duplicates", { count: duplicates.length })}
            {incomplete.length > 0 &&
              t("incomplete", { count: incomplete.length })}
          </p>
          <div
            className="activity-vocabulary-preview-list"
            aria-label={tk("previewLabel")}
          >
            {reviewed.map((row, index) => (
              <div className="activity-vocabulary-preview-row" key={index}>
                <span>{index + 1}</span>
                <span>
                  {row.text ||
                    t(
                      kind === "conversation"
                        ? "questionMissing"
                        : "sentenceMissing",
                    )}
                </span>
                <span>{row.supporting_text || t("noHint")}</span>
                <small data-status={row.status}>
                  {t(
                    row.status === "ready"
                      ? "statusNew"
                      : row.status === "duplicate"
                        ? "statusDuplicate"
                        : "needsSpanish",
                  )}
                </small>
              </div>
            ))}
          </div>
          {exceedsLimit && (
            <p className="field-error" role="alert">
              {tk("limit")}
            </p>
          )}
          {incomplete.length > 0 && (
            <p className="field-error">{t("fixIncomplete")}</p>
          )}
          <button
            type="button"
            className="primary"
            disabled={!ready.length || incomplete.length > 0 || exceedsLimit}
            onClick={() => onApply(mode, ready)}
          >
            {tk(mode === "add" ? "applyAdd" : "applyReplace", {
              count: ready.length,
            })}
          </button>
        </div>
      )}
    </section>
  );
}
