"use client";

import { useMemo, useState } from "react";
import { FileUp } from "lucide-react";
import type { ActivitySetItem } from "@/types";
import {
  parseVocabularyImport,
  reviewVocabularyImport,
  type VocabularyImportMode,
  type VocabularyPair,
} from "@/lib/vocabulary-import";
import { useLocalize, useT } from "./i18n";

export function VocabularyImporter({
  existing,
  onApply,
  onClose,
}: {
  existing: ActivitySetItem[];
  onApply: (mode: VocabularyImportMode, rows: VocabularyPair[]) => void;
  onClose: () => void;
}) {
  const t = useT("importer");
  const localize = useLocalize();
  const [mode, setMode] = useState<VocabularyImportMode>("add");
  const [source, setSource] = useState("");
  const [filename, setFilename] = useState("");
  const [pairs, setPairs] = useState<VocabularyPair[] | null>(null);
  const [error, setError] = useState("");
  const reviewed = useMemo(
    () => (pairs ? reviewVocabularyImport(pairs, existing, mode) : []),
    [pairs, existing, mode],
  );
  const ready = reviewed.filter((row) => row.status === "ready");
  const incomplete = reviewed.filter((row) => row.status === "incomplete");
  const duplicates = reviewed.filter((row) => row.status === "duplicate");
  const currentCount = existing.filter(
    (item) => item.text.trim() || item.supporting_text.trim(),
  ).length;
  const exceedsLimit = ready.length + (mode === "add" ? currentCount : 0) > 100;

  function updateSource(value: string) {
    setSource(value);
    setFilename("");
    setPairs(null);
    setError("");
  }

  function preview(value = source) {
    try {
      setPairs(parseVocabularyImport(value));
      setError("");
    } catch (cause) {
      setPairs(null);
      setError(
        cause instanceof Error ? localize(cause.message) : t("readWordsFailed"),
      );
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setError(t("fileTooBig"));
      setPairs(null);
      return;
    }
    try {
      const value = await file.text();
      setSource(value);
      setFilename(file.name);
      preview(value);
    } catch {
      setError(t("fileFailed"));
      setPairs(null);
    }
  }

  return (
    <section
      className="activity-vocabulary-import"
      aria-label={t("titleWords")}
    >
      <div className="activity-vocabulary-import-head">
        <div>
          <h4>{t("titleWords")}</h4>
          <p>{t("introWords")}</p>
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
            name="vocabulary-import-mode"
            checked={mode === "add"}
            onChange={() => setMode("add")}
          />
          {t("addWords")}
        </label>
        <label>
          <input
            type="radio"
            name="vocabulary-import-mode"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          {t("replaceWords")}
        </label>
      </div>
      <label className="activity-vocabulary-import-source">
        <span>{t("sourceWords")}</span>
        <textarea
          value={source}
          onChange={(event) => updateSource(event.target.value)}
          placeholder={t("placeholderWords")}
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
          {t("previewWords")}
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
      {pairs && (
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
            aria-label={t("previewLabelWords")}
          >
            {reviewed.map((row, index) => (
              <div className="activity-vocabulary-preview-row" key={index}>
                <span>{index + 1}</span>
                <span>{row.spanish || t("spanishMissing")}</span>
                <span>{row.english || t("englishMissing")}</span>
                <small data-status={row.status}>
                  {t(
                    row.status === "ready"
                      ? "statusNew"
                      : row.status === "duplicate"
                        ? "statusDuplicate"
                        : "needsBoth",
                  )}
                </small>
              </div>
            ))}
          </div>
          {exceedsLimit && (
            <p className="field-error" role="alert">
              {t("limitWords")}
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
            {t(mode === "add" ? "applyAddWords" : "applyReplaceWords", {
              count: ready.length,
            })}
          </button>
        </div>
      )}
    </section>
  );
}
