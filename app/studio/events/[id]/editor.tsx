"use client";

import type { EventDraft } from "@/lib/studio/kinds/event";
import { EntryForm, ImageField, useEntryEditor } from "../../entry-editor";
import styles from "../../studio.module.css";

/* The event editor: its fields. Events have no page of their own, so there is
   no web address to edit; they are listed together on /events. */

const same = (draft: EventDraft) => draft;

export function EventEditor({
  id,
  initial,
  updatedAt,
  isPublished,
}: {
  id: number;
  initial: EventDraft;
  updatedAt: string;
  isPublished: boolean;
}) {
  const editor = useEntryEditor({
    kind: "event",
    one: "event",
    id,
    initial,
    updatedAt,
    withKeys: same,
    withoutKeys: same,
  });
  const { draft, update, errors, pending, field, described } = editor;

  const text = (name: "title" | "venue" | "year", label: string, hint?: string) =>
    field(
      name,
      label,
      <input
        id={name}
        className={styles.input}
        value={draft[name]}
        onChange={(event) => update((current) => ({ ...current, [name]: event.target.value }))}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={described(name, Boolean(hint))}
      />,
      hint,
    );

  return (
    <EntryForm editor={editor} isPublished={isPublished}>
      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className={styles.legend}>The event</legend>

        {text("title", "Name")}

        <div className={styles.pieceFields}>
          {text("venue", "Venue (optional)", "Leave empty until it is confirmed.")}
          {text("year", "Year or dates (optional)", "e.g. 2025, or March 2026")}
        </div>

        {field(
          "note",
          "About it",
          <textarea
            id="note"
            rows={3}
            className={styles.input}
            value={draft.note}
            onChange={(event) => update((current) => ({ ...current, note: event.target.value }))}
            aria-invalid={errors.note ? true : undefined}
            aria-describedby={described("note", true)}
          />,
          "A sentence or two for the events page.",
        )}

        <ImageField editor={editor} label="Install photo link (optional)" />
      </fieldset>
    </EntryForm>
  );
}
