"use client";
import { useMemo, useState } from "react";
import { Upload, ClipboardPaste } from "lucide-react";
import type { Student } from "@/types";
import {
  mapRosterRows,
  parseDelimited,
  parseRosterText,
  planRoster,
  suggestColumns,
  validateImport,
  type ColumnMap,
  type ImportMode,
  type RosterRow,
} from "@/lib/roster-import";
import { useClassroom } from "./context";
import { schoolEmailFromStudentId } from "@/lib/school-student-id";
import { Modal } from "./ui";
import { CustomSelect } from "./custom-select";
import { useLocalize, useT } from "./i18n";

type Step = "source" | "mapping" | "preview" | "success";
const blankMap: ColumnMap = {
  first: null,
  last: null,
  full: null,
  id: null,
  email: null,
};
const label = (student: Student) =>
  `${student.display_name}${student.school_student_id ? ` · ${student.school_student_id}` : ""}`;

export function RosterImportDialog({
  close,
  periodId,
}: {
  close: () => void;
  periodId: string;
}) {
  const { s, refresh } = useClassroom();
  const t = useT("rosterImport");
  const localize = useLocalize();
  const period = s.periods.find((p) => p.id === periodId);
  const rosterIds = useMemo(
    () =>
      s.period_students
        .filter((m) => m.period_id === periodId)
        .map((m) => m.student_id),
    [s.period_students, periodId],
  );
  const [step, setStep] = useState<Step>("source");
  const [method, setMethod] = useState<"paste" | "csv">("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [raw, setRaw] = useState<string[][]>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [mapping, setMapping] = useState<ColumnMap>(blankMap);
  const [order, setOrder] = useState<"first_last" | "last_first">("first_last");
  const [commaOrder, setCommaOrder] = useState<"first_last" | "last_first">(
    "last_first",
  );
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [reviewedNew, setReviewedNew] = useState<Set<number>>(new Set());
  const [reviewedMismatch, setReviewedMismatch] = useState<Set<number>>(
    new Set(),
  );
  const [mode, setMode] = useState<ImportMode>("add");
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    added: number;
    existing: number;
    removed: number;
    reactivated: number;
  } | null>(null);
  const studentById = useMemo(
    () => new Map(s.students.map((student) => [student.id, student])),
    [s.students],
  );
  const plan = useMemo(
    () => planRoster(rows, s.students, rosterIds),
    [rows, s.students, rosterIds],
  );
  const removals = plan.removals
    .map((id) => s.students.find((student) => student.id === id))
    .filter((student): student is Student => !!student);
  const validation = validateImport(plan.rows, s.students);
  const unresolved = plan.rows.findIndex(
    (row, index) =>
      row.issue === "invalid" ||
      ((row.issue === "possible_match" || row.issue === "ambiguous") &&
        !row.existing_student_id &&
        !reviewedNew.has(index)) ||
      (row.issue === "id_name_mismatch" && !reviewedMismatch.has(index)),
  );
  const duplicateNames = new Map<string, number>();
  rows.forEach((row) => {
    const name =
      `${row.first_name.trim()} ${row.last_name.trim()}`.toLocaleLowerCase();
    duplicateNames.set(name, (duplicateNames.get(name) ?? 0) + 1);
  });
  const unreviewedDuplicate = rows.findIndex(
    (row, index) =>
      (duplicateNames.get(
        `${row.first_name.trim()} ${row.last_name.trim()}`.toLocaleLowerCase(),
      ) ?? 0) > 1 &&
      !row.existing_student_id &&
      !reviewedNew.has(index),
  );

  function updateRow(index: number, changes: Partial<RosterRow>) {
    setRows((current) =>
      current.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    );
    setReviewedNew((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    setReviewedMismatch((current) => {
      const next = new Set(current);
      next.delete(index);
      return next;
    });
    setConfirmRemoval(false);
  }
  function removeRow(index: number) {
    setRows((current) => current.filter((_, i) => i !== index));
    setReviewedNew(new Set());
    setReviewedMismatch(new Set());
    setConfirmRemoval(false);
  }
  function useRows(parsed: RosterRow[]) {
    if (!parsed.length) throw new Error(t("needOne"));
    if (parsed.length > 500) throw new Error(t("tooMany"));
    setRows(parsed);
    setReviewedNew(new Set());
    setReviewedMismatch(new Set());
    setConfirmRemoval(false);
    setStep("preview");
  }
  function previewPaste() {
    try {
      setError("");
      useRows(parseRosterText(text, "paste", order, commaOrder));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("checkPaste"));
    }
  }
  async function chooseFile(file: File | undefined) {
    if (!file) return;
    setError("");
    if (!/\.csv$/i.test(file.name) && file.type !== "text/csv") {
      setError(t("csvOnly"));
      return;
    }
    if (file.size > 1_000_000) {
      setError(t("csvTooBig"));
      return;
    }
    try {
      const content = await file.text();
      const parsed = parseDelimited(
        content,
        content.includes("\t") ? "\t" : ",",
      );
      if (!parsed.length) throw new Error(t("empty"));
      if (parsed.length > 501) throw new Error(t("tooMany"));
      setRaw(parsed);
      setFileName(file.name);
      const suggested = suggestColumns(parsed[0]);
      setMapping(
        suggested.full !== null ||
          (suggested.first !== null && suggested.last !== null)
          ? suggested
          : blankMap,
      );
      setHasHeader(
        suggested.full !== null ||
          (suggested.first !== null && suggested.last !== null),
      );
      setStep("mapping");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("csvFailed"));
    }
  }
  function previewFile() {
    setError("");
    if (mapping.id === null) {
      setError(t("mapId"));
      return;
    }
    if (
      mapping.full === null &&
      (mapping.first === null || mapping.last === null)
    ) {
      setError(t("mapName"));
      return;
    }
    const selected = [
      mapping.first,
      mapping.last,
      mapping.full,
      mapping.id,
      mapping.email ?? null,
    ].filter((value): value is number => value !== null);
    if (new Set(selected).size !== selected.length) {
      setError(t("distinctColumns"));
      return;
    }
    try {
      useRows(
        mapRosterRows(raw.slice(hasHeader ? 1 : 0), mapping, order, commaOrder),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("checkMapping"));
    }
  }
  async function save() {
    if (validation) {
      setError(validation);
      return;
    }
    if (unresolved >= 0) {
      setError(t("reviewMatch", { row: unresolved + 1 }));
      return;
    }
    if (unreviewedDuplicate >= 0) {
      setError(t("reviewRepeated", { row: unreviewedDuplicate + 1 }));
      return;
    }
    if (mode === "sync" && removals.length && !confirmRemoval) {
      setError(t("confirmRemovals"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/roster-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_id: periodId,
          mode,
          rows: plan.rows.map(
            ({
              first_name,
              last_name,
              school_student_id,
              school_email,
              existing_student_id,
            }) => ({
              first_name,
              last_name,
              school_student_id,
              school_email: school_email ?? null,
              existing_student_id,
            }),
          ),
          expected_student_ids: rosterIds,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || t("saveFailed"));
      setResult(body.result);
      setStep("success");
      await refresh().catch(() => {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }
  const columns =
    raw[0]?.map(
      (heading, index) =>
        `${index + 1}: ${hasHeader ? heading || t("untitled") : t("column", { number: index + 1 })}`,
    ) ?? [];
  const mappingField = (field: keyof ColumnMap, title: string) => (
    <label className="roster-field">
      {title}
      <CustomSelect
        ariaLabel={title}
        value={String(mapping[field] ?? "")}
        onChange={(value) =>
          setMapping((current) => ({
            ...current,
            [field]: value === "" ? null : Number(value),
          }))
        }
        options={[
          { value: "", label: t("doNotUse") },
          ...columns.map((heading, index) => ({
            value: String(index),
            label: heading,
          })),
        ]}
      />
    </label>
  );
  const choicesFor = (row: (typeof plan.rows)[number]) => {
    const chosen = row.existing_student_id
      ? studentById.get(row.existing_student_id)
      : undefined;
    return chosen &&
      !row.candidates.some((candidate) => candidate.id === chosen.id)
      ? [chosen, ...row.candidates]
      : row.candidates;
  };
  return (
    <Modal
      title={t("title")}
      close={() => {
        if (!busy) close();
      }}
      className="roster-import-dialog"
    >
      <div className="roster-import-body">
        <p className="roster-import-context">
          {period
            ? t("className", {
                number: period.period_number,
                name: period.name,
              })
            : t("selectedClass")}
        </p>
        {step === "source" && (
          <>
            <div
              className="segmented roster-methods"
              role="group"
              aria-label={t("method")}
            >
              <button
                type="button"
                className={method === "paste" ? "selected" : ""}
                aria-pressed={method === "paste"}
                onClick={() => {
                  setMethod("paste");
                  setError("");
                }}
              >
                <ClipboardPaste size={17} /> {t("pasteNames")}
              </button>
              <button
                type="button"
                className={method === "csv" ? "selected" : ""}
                aria-pressed={method === "csv"}
                onClick={() => {
                  setMethod("csv");
                  setError("");
                }}
              >
                <Upload size={17} /> {t("uploadCsv")}
              </button>
            </div>
            {method === "paste" ? (
              <>
                <label className="roster-field">
                  {t("studentList")}
                  <textarea
                    rows={10}
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={t("pastePlaceholder")}
                  />
                </label>
                <p className="hint">{t("pasteHint")}</p>
                <label className="roster-field">
                  {t("noCommaOrder")}
                  <CustomSelect
                    ariaLabel={t("noCommaLabel")}
                    value={order}
                    onChange={(value) => setOrder(value as typeof order)}
                    options={[
                      { value: "first_last", label: t("firstLast") },
                      { value: "last_first", label: t("lastFirst") },
                    ]}
                  />
                </label>
                <label className="roster-field">
                  {t("commaOrder")}
                  <CustomSelect
                    ariaLabel={t("commaLabel")}
                    value={commaOrder}
                    onChange={(value) =>
                      setCommaOrder(value as typeof commaOrder)
                    }
                    options={[
                      { value: "last_first", label: t("lastCommaFirst") },
                      { value: "first_last", label: t("firstCommaLast") },
                    ]}
                  />
                </label>
                <div className="roster-footer">
                  <button type="button" className="secondary" onClick={close}>
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={previewPaste}
                  >
                    {t("preview")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="roster-file">
                  {t("chooseCsv")}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) =>
                      void chooseFile(event.target.files?.[0])
                    }
                  />
                </label>
                <p className="hint">{t("csvHint")}</p>
                <div className="roster-footer">
                  <button type="button" className="secondary" onClick={close}>
                    {t("cancel")}
                  </button>
                </div>
              </>
            )}
          </>
        )}
        {step === "mapping" && (
          <>
            <p>
              {t.rich(
                "mapColumns",
                { b: (text) => <strong>{text}</strong> },
                { file: fileName, count: raw.length },
              )}
            </p>
            <label className="roster-check">
              <input
                type="checkbox"
                checked={hasHeader}
                onChange={(event) => setHasHeader(event.target.checked)}
              />{" "}
              {t("hasHeader")}
            </label>
            <div className="roster-map-grid">
              {mappingField("full", t("fullName"))}
              {mappingField("first", t("firstName"))}
              {mappingField("last", t("lastName"))}
              {mappingField("id", t("studentNumberRequired"))}
              {mappingField("email", t("emailOptional"))}
            </div>
            <label className="roster-field">
              {t("fullNoCommaOrder")}
              <CustomSelect
                ariaLabel={t("noCommaLabel")}
                value={order}
                onChange={(value) => setOrder(value as typeof order)}
                options={[
                  { value: "first_last", label: t("firstLast") },
                  { value: "last_first", label: t("lastFirst") },
                ]}
              />
            </label>
            {mapping.full !== null && (
              <label className="roster-field">
                {t("fullCommaOrder")}
                <CustomSelect
                  ariaLabel={t("commaLabel")}
                  value={commaOrder}
                  onChange={(value) =>
                    setCommaOrder(value as typeof commaOrder)
                  }
                  options={[
                    { value: "last_first", label: t("lastCommaFirst") },
                    { value: "first_last", label: t("firstCommaLast") },
                  ]}
                />
              </label>
            )}
            <p className="hint">
              {t("sample", {
                rows:
                  raw
                    .slice(hasHeader ? 1 : 0, hasHeader ? 3 : 2)
                    .map((row) => row.join(" · "))
                    .join(" / ") || t("noRows"),
              })}
            </p>
            <div className="roster-footer">
              <button
                type="button"
                className="secondary"
                onClick={() => setStep("source")}
              >
                {t("back")}
              </button>
              <button type="button" className="primary" onClick={previewFile}>
                {t("preview")}
              </button>
            </div>
          </>
        )}
        {step === "preview" && (
          <>
            <p className="roster-summary">
              {t("summary", {
                imported: rows.length,
                added: plan.rows.filter((row) => !row.existing_student_id)
                  .length,
                existing: plan.rows.filter((row) => !!row.existing_student_id)
                  .length,
              })}
            </p>
            <fieldset className="roster-mode">
              <legend>{t("modeQuestion")}</legend>
              <label>
                <input
                  type="radio"
                  checked={mode === "add"}
                  onChange={() => setMode("add")}
                />{" "}
                {t("modeAdd")}
              </label>
              <label>
                <input
                  type="radio"
                  checked={mode === "sync"}
                  onChange={() => setMode("sync")}
                />{" "}
                {t("modeSync")}
              </label>
            </fieldset>
            <div className="roster-preview-scroll">
              <table className="roster-preview">
                <thead>
                  <tr>
                    <th>{t("colRow")}</th>
                    <th>{t("colFirst")}</th>
                    <th>{t("colLast")}</th>
                    <th>{t("colNumber")}</th>
                    <th>{t("colEmail")}</th>
                    <th>{t("colMatch")}</th>
                    <th>{t("colResult")}</th>
                    <th>{t("colRemove")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.map((row, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>
                        <input
                          aria-label={t("firstRow", { row: index + 1 })}
                          value={rows[index].first_name}
                          onChange={(event) =>
                            updateRow(index, { first_name: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={t("lastRow", { row: index + 1 })}
                          value={rows[index].last_name}
                          onChange={(event) =>
                            updateRow(index, { last_name: event.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={t("numberRow", { row: index + 1 })}
                          inputMode="numeric"
                          maxLength={6}
                          value={rows[index].school_student_id ?? ""}
                          onChange={(event) =>
                            updateRow(index, {
                              school_student_id: event.target.value || null,
                            })
                          }
                        />
                      </td>
                      <td>
                        {schoolEmailFromStudentId(
                          row.school_student_id ?? "",
                        ) ?? t("needId")}
                      </td>
                      <td>
                        <CustomSelect
                          ariaLabel={t("matchRow", { row: index + 1 })}
                          value={row.existing_student_id ?? "new"}
                          onChange={(value) => {
                            setRows((current) =>
                              current.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      existing_student_id:
                                        value === "new" ? null : value,
                                    }
                                  : item,
                              ),
                            );
                            setReviewedNew((current) => {
                              const next = new Set(current);
                              if (value === "new") next.add(index);
                              else next.delete(index);
                              return next;
                            });
                          }}
                          options={[
                            { value: "new", label: t("createNew") },
                            ...choicesFor(row).map((student) => ({
                              value: student.id,
                              label: `${label(student)}${!student.active ? t("inactive") : ""}`,
                            })),
                          ]}
                        />
                      </td>
                      <td>
                        {t(
                          row.issue === "invalid"
                            ? "resultInvalid"
                            : row.issue === "possible_match" ||
                                row.issue === "ambiguous"
                              ? "resultReviewMatch"
                              : row.issue === "id_name_mismatch"
                                ? "resultReviewName"
                                : row.existing_student_id
                                  ? rosterIds.includes(row.existing_student_id)
                                    ? "resultEnrolled"
                                    : "resultAddExisting"
                                  : "resultNew",
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="text-button"
                          aria-label={t("removeRow", { row: index + 1 })}
                          onClick={() => removeRow(index)}
                        >
                          {t("remove")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {validation && (
              <p className="notice error" role="alert">
                {localize(validation)}
              </p>
            )}
            {plan.rows.map((row, index) =>
              (row.issue === "possible_match" || row.issue === "ambiguous") &&
              !row.existing_student_id ? (
                <div className="roster-review" key={index}>
                  <strong>{t("possibleMatch", { row: index + 1 })}</strong>
                  <span>
                    {t("possibleMatchBody", {
                      candidates: row.candidates.map(label).join("; "),
                    })}
                  </span>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewedNew.has(index)}
                      onChange={(event) =>
                        setReviewedNew((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(index);
                          else next.delete(index);
                          return next;
                        })
                      }
                    />{" "}
                    {t("createSeparate")}
                  </label>
                </div>
              ) : row.issue === "id_name_mismatch" ? (
                <div className="roster-review" key={index}>
                  <strong>{t("nameDiffers", { row: index + 1 })}</strong>
                  <span>{t("nameDiffersBody")}</span>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewedMismatch.has(index)}
                      onChange={(event) =>
                        setReviewedMismatch((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(index);
                          else next.delete(index);
                          return next;
                        })
                      }
                    />{" "}
                    {t("useSaved")}
                  </label>
                </div>
              ) : (duplicateNames.get(
                  `${row.first_name.trim()} ${row.last_name.trim()}`.toLocaleLowerCase(),
                ) ?? 0) > 1 && !row.existing_student_id ? (
                <div className="roster-review" key={index}>
                  <strong>{t("repeated", { row: index + 1 })}</strong>
                  <label>
                    <input
                      type="checkbox"
                      checked={reviewedNew.has(index)}
                      onChange={(event) =>
                        setReviewedNew((current) => {
                          const next = new Set(current);
                          if (event.target.checked) next.add(index);
                          else next.delete(index);
                          return next;
                        })
                      }
                    />{" "}
                    {t("separate")}
                  </label>
                </div>
              ) : null,
            )}
            {mode === "sync" && (
              <div className="roster-removals">
                <strong>{t("leaving", { count: removals.length })}</strong>
                {removals.length > 0 && (
                  <>
                    <p>{removals.map(label).join(", ")}</p>
                    <label>
                      <input
                        type="checkbox"
                        checked={confirmRemoval}
                        onChange={(event) =>
                          setConfirmRemoval(event.target.checked)
                        }
                      />{" "}
                      {t("reviewedRemovals")}
                    </label>
                  </>
                )}
                <p>{t("recordsStay")}</p>
              </div>
            )}
            <div className="roster-footer">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setStep(method === "csv" ? "mapping" : "source")}
              >
                {t("back")}
              </button>
              <button
                type="button"
                className="primary"
                disabled={
                  busy ||
                  !!validation ||
                  unresolved >= 0 ||
                  unreviewedDuplicate >= 0 ||
                  (mode === "sync" && removals.length > 0 && !confirmRemoval)
                }
                onClick={() => void save()}
              >
                {busy
                  ? t("importing")
                  : t("importCount", { count: rows.length })}
              </button>
            </div>
          </>
        )}
        {step === "success" && result && (
          <>
            <p className="roster-summary">{t("updated")}</p>
            <p>
              {t("resultSummary", {
                added: result.added,
                existing: result.existing,
                removed: result.removed,
              })}
              {result.reactivated
                ? t("reactivated", { count: result.reactivated })
                : ""}
            </p>
            <p className="hint">{t("cardsHint")}</p>
            <div className="roster-footer">
              <button type="button" className="primary" onClick={close}>
                {t("done")}
              </button>
            </div>
          </>
        )}
        {error && (
          <p className="notice error" role="alert">
            {localize(error)}
          </p>
        )}
      </div>
    </Modal>
  );
}
