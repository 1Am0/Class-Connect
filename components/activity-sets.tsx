"use client";

import { useState } from "react";
import { FolderOpen, Pencil, Plus } from "lucide-react";
import type { ActivitySet, ActivitySetKind } from "@/types";
import { useClassroom } from "./context";
import { ActivitySetEditor } from "./lazy";
import { isSampleSet, sampleActivitySets } from "@/lib/sample-activity-sets";
import { useT } from "./i18n";

const kindKeys = {
  vocabulary: "kindVocabulary",
  conversation: "kindConversation",
  scramble: "kindScramble",
} as const satisfies Record<ActivitySetKind, string>;
const emptyKeys = {
  vocabulary: "emptyVocabulary",
  conversation: "emptyConversation",
  scramble: "emptyScramble",
} as const satisfies Record<ActivitySetKind, string>;

export function ActivitySetsSidebar({
  kind,
  selectedId,
  onSelect,
}: {
  kind: ActivitySetKind;
  selectedId: string | null;
  onSelect: (set: ActivitySet) => void;
}) {
  const { s, notify } = useClassroom();
  const t = useT("activitySets");
  const sets = [...(s.activity_sets ?? [])].sort(
    (a, b) =>
      b.updated_at.localeCompare(a.updated_at) || a.name.localeCompare(b.name),
  );
  const [editing, setEditing] = useState<ActivitySet | "new" | null>(null);
  // Built-in samples follow the teacher's own sets and cannot be edited.
  const visible = [...sets, ...sampleActivitySets].filter(
    (set) => set.kind === kind,
  );

  return (
    <aside className="card activity-sets" aria-labelledby="activity-sets-title">
      <div className="activity-sets-heading">
        <h2 id="activity-sets-title">
          <FolderOpen size={21} aria-hidden="true" /> {t("title")}
        </h2>
        <button
          type="button"
          className="secondary compact"
          onClick={() => setEditing("new")}
        >
          <Plus size={16} aria-hidden="true" /> {t("newSet")}
        </button>
      </div>
      {visible.length ? (
        <ul className="activity-set-list">
          {visible.map((set) => (
            <li
              key={set.id}
              className={selectedId === set.id ? "selected" : ""}
            >
              <button type="button" onClick={() => onSelect(set)}>
                <strong>{set.name}</strong>
                <small>
                  {isSampleSet(set) ? t("sample") : t(kindKeys[set.kind])} ·{" "}
                  {t("items", { count: set.items.length })}
                </small>
              </button>
              {!isSampleSet(set) && (
                <button
                  type="button"
                  className="activity-set-edit"
                  aria-label={t("editSet", { name: set.name })}
                  onClick={() => setEditing(set)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="activity-set-empty">{t(emptyKeys[kind])}</p>
      )}
      {editing && (
        <ActivitySetEditor
          key={editing === "new" ? "new" : editing.id}
          initial={editing}
          activityKind={kind}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            notify(text);
            setEditing(null);
          }}
        />
      )}
    </aside>
  );
}
