"use client";

import { useEffect, useRef, useState } from "react";
import { FileUp, Plus, Trash2 } from "lucide-react";
import type { ActivitySet, ActivitySetItem, ActivitySetKind } from "@/types";
import { activitySetInput } from "@/lib/activity-sets";
import type {
  VocabularyImportMode,
  VocabularyPair,
} from "@/lib/vocabulary-import";
import type {
  ActivityTextImportMode,
  ActivityTextRow,
} from "@/lib/activity-text-import";
import { useClassroom } from "./context";
import { Modal } from "./ui";
import { VocabularyImporter } from "./vocabulary-importer";
import { ActivityTextImporter } from "./activity-text-importer";
import { useLocalize, useT } from "./i18n";

const itemHeadings = {
  vocabulary: "headingVocabulary",
  conversation: "headingConversation",
  scramble: "headingScramble",
} as const satisfies Record<ActivitySetKind, string>;

function blankItem(): ActivitySetItem {
  return { id: crypto.randomUUID(), text: "", supporting_text: "" };
}

type Field =
  | "text"
  | "supporting_text"
  | "sentence_starter"
  | "follow_up_question"
  | "grammar_explanation";
type EditorErrors = Record<string, string>;

export function ActivitySetEditor({
  initial,
  activityKind,
  onClose,
  onSaved,
}: {
  initial: ActivitySet | "new";
  activityKind: ActivitySetKind;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { refresh } = useClassroom();
  const t = useT("activitySets");
  const localize = useLocalize();
  const [name, setName] = useState(initial === "new" ? "" : initial.name);
  const kind = initial === "new" ? activityKind : initial.kind;
  const [items, setItems] = useState<ActivitySetItem[]>(
    initial === "new" ? [blankItem()] : structuredClone(initial.items),
  );
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [errors, setErrors] = useState<EditorErrors>({});
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"discard" | "delete" | null>(
    null,
  );
  const firstInputs = useRef(new Map<string, HTMLInputElement>());
  const pendingFocus = useRef<string | null>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const original = useRef(
    JSON.stringify({
      name: initial === "new" ? "" : initial.name,
      kind,
      items: initial === "new" ? [] : initial.items,
    }),
  );
  const dirty =
    initial === "new"
      ? Boolean(
          name ||
          items.length !== 1 ||
          items.some(
            (item) =>
              item.text ||
              item.supporting_text ||
              item.sentence_starter ||
              item.follow_up_question ||
              item.grammar_explanation ||
              item.accepted_answers?.some(Boolean),
          ),
        )
      : JSON.stringify({ name, kind, items }) !== original.current;

  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    const input = firstInputs.current.get(id);
    input?.focus();
    input?.scrollIntoView({ block: "center", behavior: "instant" });
  }, [items]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function requestClose() {
    if (busy) return;
    if (dirty) setConfirmation("discard");
    else onClose();
  }

  function changeItem(id: string, field: Field, value: string) {
    setItems((old) =>
      old.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
    setError("");
    setErrors((old) => {
      if (!old[`${id}.${field}`]) return old;
      const next = { ...old };
      delete next[`${id}.${field}`];
      return next;
    });
  }

  function addItem() {
    const item = blankItem();
    pendingFocus.current = item.id;
    setItems((old) => [...old, item]);
    setError("");
    setErrors((old) => {
      const next = { ...old };
      delete next.items;
      return next;
    });
  }

  function applyImportedWords(
    mode: VocabularyImportMode,
    pairs: VocabularyPair[],
  ) {
    loadImportedItems(
      mode,
      pairs.map((pair) => ({
        text: pair.spanish,
        supporting_text: pair.english,
      })),
      "nounWord",
    );
  }

  function applyImportedText(
    mode: ActivityTextImportMode,
    rows: ActivityTextRow[],
  ) {
    loadImportedItems(
      mode,
      rows,
      kind === "conversation" ? "nounPrompt" : "nounSentence",
    );
  }

  function loadImportedItems(
    mode: "add" | "replace",
    rows: ActivityTextRow[],
    noun: "nounWord" | "nounPrompt" | "nounSentence",
  ) {
    const imported = rows.map((row) => ({ id: crypto.randomUUID(), ...row }));
    setItems((old) =>
      mode === "replace"
        ? imported
        : [
            ...old.filter(
              (item) => item.text.trim() || item.supporting_text.trim(),
            ),
            ...imported,
          ],
    );
    setErrors({});
    setError("");
    setNotice(
      t(mode === "add" ? "importedAdded" : "importedLoaded", {
        count: imported.length,
        noun: t(noun, { count: imported.length }),
      }),
    );
    setImportOpen(false);
  }

  function removeItem(id: string) {
    setItems((old) => old.filter((item) => item.id !== id));
    setError("");
    setErrors((old) =>
      Object.fromEntries(
        Object.entries(old).filter(([key]) => !key.startsWith(`${id}.`)),
      ),
    );
  }

  function field(
    item: ActivitySetItem,
    index: number,
    key: Field,
    label: string,
  ) {
    const errorKey = `${item.id}.${key}`;
    const errorId = `activity-error-${item.id}-${key}`;
    return (
      <label key={key}>
        <span>{label}</span>
        <input
          ref={
            key === "text"
              ? (node) => {
                  if (node) firstInputs.current.set(item.id, node);
                  else firstInputs.current.delete(item.id);
                }
              : undefined
          }
          value={item[key] ?? ""}
          maxLength={500}
          aria-invalid={Boolean(errors[errorKey])}
          aria-describedby={errors[errorKey] ? errorId : undefined}
          onChange={(event) => changeItem(item.id, key, event.target.value)}
        />
        {errors[errorKey] && (
          <small className="field-error" id={errorId}>
            {errors[errorKey]}
          </small>
        )}
      </label>
    );
  }

  async function send(body: object) {
    const response = await fetch("/api/activity-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? t("saveFailed"));
    await refresh();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const input = {
      ...(initial !== "new" ? { id: initial.id } : {}),
      name,
      kind,
      items,
    };
    const checked = activitySetInput.safeParse(input);
    if (!checked.success) {
      const next: EditorErrors = {};
      for (const issue of checked.error.issues) {
        const [section, index, field] = issue.path;
        const key =
          section === "items" && typeof index === "number" && items[index]
            ? `${items[index].id}.${String(field)}`
            : String(section);
        const message =
          section === "name"
            ? t("needName")
            : section === "items" && field === "text"
              ? t(
                  kind === "vocabulary"
                    ? "needWord"
                    : kind === "conversation"
                      ? "needQuestion"
                      : "needSentence",
                )
              : section === "items" && field === "supporting_text"
                ? t("needMeaning")
                : section === "items" && field === "accepted_answers"
                  ? t("badOrder")
                  : section === "items"
                    ? t("needItem")
                    : localize(issue.message);
        next[key] ??= message;
      }
      setErrors(next);
      setError(t("checkFields"));
      requestAnimationFrame(() => {
        const invalid = scrollArea.current?.querySelector<HTMLInputElement>(
          "[aria-invalid='true']",
        );
        invalid?.focus();
      });
      return;
    }
    setBusy(true);
    setErrors({});
    setError("");
    try {
      await send({ action: "save", ...checked.data });
      onSaved(
        t(initial === "new" ? "created" : "updated", {
          name: checked.data.name,
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? localize(cause.message) : t("saveFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (initial === "new") return;
    setBusy(true);
    setError("");
    try {
      await send({ action: "delete", id: initial.id });
      onSaved(t("deleted", { name: initial.name }));
    } catch (cause) {
      setConfirmation(null);
      setError(
        cause instanceof Error ? localize(cause.message) : t("deleteFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title={t(initial === "new" ? "createTitle" : "editTitle")}
      close={requestClose}
      className="activity-set-dialog"
    >
      <form noValidate onSubmit={save} className="activity-set-form">
        <div className="activity-set-editor-scroll" ref={scrollArea}>
          <div className="activity-set-details">
            <label>
              <span>{t("setName")}</span>
              <input
                value={name}
                placeholder={t("setNamePlaceholder")}
                maxLength={100}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "activity-name-error" : undefined
                }
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                  setErrors((old) => ({ ...old, name: "" }));
                }}
              />
              {errors.name && (
                <small className="field-error" id="activity-name-error">
                  {t("needName")}
                </small>
              )}
            </label>
          </div>
          <div className="activity-set-items-heading">
            <h3>{t(itemHeadings[kind])}</h3>
            <div>
              <span>{t("items", { count: items.length })}</span>
              <button
                type="button"
                className="secondary compact"
                onClick={() => setImportOpen((open) => !open)}
              >
                <FileUp size={16} aria-hidden="true" />{" "}
                {t(
                  kind === "vocabulary"
                    ? "importWords"
                    : kind === "conversation"
                      ? "importPrompts"
                      : "importSentences",
                )}
              </button>
            </div>
          </div>
          {notice && (
            <p className="notice info" role="status">
              {notice}
            </p>
          )}
          {kind === "vocabulary" && importOpen && (
            <VocabularyImporter
              existing={items}
              onApply={applyImportedWords}
              onClose={() => setImportOpen(false)}
            />
          )}
          {kind !== "vocabulary" && importOpen && (
            <ActivityTextImporter
              kind={kind}
              existing={items}
              onApply={applyImportedText}
              onClose={() => setImportOpen(false)}
            />
          )}
          {errors.items && (
            <p className="field-error" role="alert">
              {t("needItem")}
            </p>
          )}
          <div className="activity-set-items">
            {items.map((item, index) => (
              <div
                className={`activity-set-item${kind === "vocabulary" ? " activity-set-item--vocabulary" : ""}`}
                key={item.id}
              >
                <div className="activity-set-item-head">
                  <strong>{index + 1}</strong>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={t("removeItem", { number: index + 1 })}
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
                <div className="activity-set-item-fields">
                  {field(
                    item,
                    index,
                    "text",
                    t(
                      kind === "vocabulary"
                        ? "labelWord"
                        : kind === "conversation"
                          ? "labelQuestion"
                          : "labelSentence",
                    ),
                  )}
                  {field(
                    item,
                    index,
                    "supporting_text",
                    t(
                      kind === "vocabulary"
                        ? "labelMeaning"
                        : kind === "conversation"
                          ? "labelTranslation"
                          : "labelHint",
                    ),
                  )}
                  {kind === "conversation" && (
                    <>
                      {field(
                        item,
                        index,
                        "sentence_starter",
                        t("labelStarter"),
                      )}
                      {field(
                        item,
                        index,
                        "follow_up_question",
                        t("labelFollowUp"),
                      )}
                    </>
                  )}
                  {kind === "scramble" &&
                    field(
                      item,
                      index,
                      "grammar_explanation",
                      t("labelGrammar"),
                    )}
                </div>
                {kind === "scramble" && (
                  <div className="activity-set-alternatives">
                    <strong>{t("otherOrders")}</strong>
                    {(item.accepted_answers ?? []).map(
                      (answer, answerIndex) => (
                        <div
                          className="activity-set-alternative"
                          key={answerIndex}
                        >
                          <input
                            aria-label={t("orderLabel", {
                              order: answerIndex + 1,
                              item: index + 1,
                            })}
                            aria-invalid={Boolean(
                              errors[`${item.id}.accepted_answers`],
                            )}
                            value={answer}
                            maxLength={500}
                            onChange={(event) =>
                              setItems((old) =>
                                old.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        accepted_answers: (
                                          entry.accepted_answers ?? []
                                        ).map((value, position) =>
                                          position === answerIndex
                                            ? event.target.value
                                            : value,
                                        ),
                                      }
                                    : entry,
                                ),
                              )
                            }
                          />
                          <button
                            type="button"
                            className="icon-button"
                            aria-label={t("removeOrder", {
                              order: answerIndex + 1,
                              item: index + 1,
                            })}
                            onClick={() =>
                              setItems((old) =>
                                old.map((entry) =>
                                  entry.id === item.id
                                    ? {
                                        ...entry,
                                        accepted_answers: (
                                          entry.accepted_answers ?? []
                                        ).filter(
                                          (_, position) =>
                                            position !== answerIndex,
                                        ),
                                      }
                                    : entry,
                                ),
                              )
                            }
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ),
                    )}
                    {errors[`${item.id}.accepted_answers`] && (
                      <small className="field-error">
                        {errors[`${item.id}.accepted_answers`]}
                      </small>
                    )}
                    <button
                      type="button"
                      className="secondary compact"
                      disabled={(item.accepted_answers?.length ?? 0) >= 10}
                      onClick={() =>
                        setItems((old) =>
                          old.map((entry) =>
                            entry.id === item.id
                              ? {
                                  ...entry,
                                  accepted_answers: [
                                    ...(entry.accepted_answers ?? []),
                                    "",
                                  ],
                                }
                              : entry,
                          ),
                        )
                      }
                    >
                      <Plus size={15} aria-hidden="true" /> {t("addOrder")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="secondary activity-add-item"
            disabled={items.length >= 100}
            onClick={addItem}
          >
            <Plus size={16} aria-hidden="true" /> {t("addItem")}
          </button>
        </div>
        <div className="activity-set-dialog-footer">
          <div
            className="field-error activity-set-footer-message"
            role="status"
          >
            {error}
          </div>
          <div className="activity-set-dialog-actions">
            {initial !== "new" && (
              <button
                type="button"
                className="danger-outline"
                disabled={busy}
                onClick={() => setConfirmation("delete")}
              >
                {t("deleteSet")}
              </button>
            )}
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={requestClose}
            >
              {t("cancel")}
            </button>
            <button type="submit" className="primary" disabled={busy}>
              {t(busy ? "saving" : "saveSet")}
            </button>
          </div>
        </div>
      </form>
      {confirmation && (
        <div
          className="activity-set-confirm"
          role="alertdialog"
          aria-modal="true"
          aria-label={t(
            confirmation === "discard" ? "discardLabel" : "deleteLabel",
          )}
        >
          <div className="activity-set-confirm-card">
            <h3>
              {t(confirmation === "discard" ? "discardTitle" : "deleteTitle")}
            </h3>
            <p>
              {confirmation === "discard"
                ? t("discardBody")
                : t("deleteBody", {
                    name: initial === "new" ? name : initial.name,
                  })}
            </p>
            <div>
              <button
                type="button"
                className="secondary"
                autoFocus
                onClick={() => setConfirmation(null)}
              >
                {t(confirmation === "discard" ? "keepEditing" : "keepSet")}
              </button>
              <button
                type="button"
                className="danger"
                disabled={busy}
                onClick={
                  confirmation === "discard" ? onClose : () => void remove()
                }
              >
                {t(confirmation === "discard" ? "discard" : "deleteSet")}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
