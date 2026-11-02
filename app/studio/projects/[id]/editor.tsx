"use client";

import type { ProjectDraft, SectionDraft } from "@/lib/studio/kinds/project";
import { EntryForm, ImageField, move, rowKey, useEntryEditor } from "../../entry-editor";
import styles from "../../studio.module.css";

/* The project editor: its fields. Saving, versions and guards are the shared
   EntryForm's. */

type SectionRow = SectionDraft & { key: number };
type Draft = Omit<ProjectDraft, "sections"> & { sections: SectionRow[] };

function withKeys(draft: ProjectDraft): Draft {
  return { ...draft, sections: draft.sections.map((section) => ({ ...section, key: rowKey() })) };
}

function withoutKeys(draft: Draft): ProjectDraft {
  return { ...draft, sections: draft.sections.map(({ key: _key, ...section }) => section) };
}

export function ProjectEditor({
  id,
  initial,
  updatedAt,
  isPublished,
}: {
  id: number;
  initial: ProjectDraft;
  updatedAt: string;
  isPublished: boolean;
}) {
  const editor = useEntryEditor({ one: "project", hidden: { kind: "project", id }, initial, updatedAt, withKeys, withoutKeys });
  const { draft, update, reshape, errors, pending, field, described } = editor;

  const setField = (name: keyof Omit<Draft, "sections">, value: string) =>
    update((current) => ({ ...current, [name]: value }));
  const setSection = (index: number, change: (section: SectionRow) => SectionRow) =>
    update((current) => ({
      ...current,
      sections: current.sections.map((section, i) => (i === index ? change(section) : section)),
    }));

  const text = (name: "title" | "year" | "role", label: string, hint?: string) =>
    field(
      name,
      label,
      <input
        id={name}
        className={styles.input}
        value={draft[name]}
        onChange={(event) => setField(name, event.target.value)}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={described(name, Boolean(hint))}
      />,
      hint,
    );

  return (
    <EntryForm editor={editor} isPublished={isPublished}>
      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className={styles.legend}>The project</legend>

        {text("title", "Title")}

        {field(
          "slug",
          "Web address",
          <div className={styles.inline}>
            <span className={styles.prefix}>/projects/</span>
            <input
              id="slug"
              className={styles.input}
              value={draft.slug}
              onChange={(event) => setField("slug", event.target.value.toLowerCase())}
              aria-invalid={errors.slug ? true : undefined}
              aria-describedby={described("slug", true)}
            />
          </div>,
          isPublished
            ? "Changing this moves the live page. Links to the old address will stop working."
            : "Lowercase letters, numbers and hyphens.",
        )}

        <div className={styles.pieceFields}>
          {text("year", "Year", "e.g. 2024")}
          {text("role", "What the studio did", "e.g. Design, fabrication")}
        </div>

        {field(
          "summary",
          "Summary",
          <textarea
            id="summary"
            rows={3}
            className={styles.input}
            value={draft.summary}
            onChange={(event) => setField("summary", event.target.value)}
            aria-invalid={errors.summary ? true : undefined}
            aria-describedby={described("summary", true)}
          />,
          "A sentence or two, shown on the home page and the projects page.",
        )}

        <ImageField editor={editor} label="Lead process photo link (optional)" />
      </fieldset>

      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className={styles.legend}>The story ({draft.sections.length})</legend>
        <p className={styles.hint}>
          In order, usually brief, process, outcome. The headings show on the page.
        </p>

        {draft.sections.map((section, i) => {
          const base = `sections.${i}`;
          const label = section.heading || `Section ${i + 1}`;
          return (
            <div key={section.key} className={styles.piece}>
              <div className={styles.pieceHead}>
                <h3 className={styles.pieceTitle}>{label}</h3>
                <div className={styles.inline}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === 0}
                    onClick={() => reshape((c) => ({ ...c, sections: move(c.sections, i, i - 1) }))}
                    aria-label={`Move ${label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === draft.sections.length - 1}
                    onClick={() => reshape((c) => ({ ...c, sections: move(c.sections, i, i + 1) }))}
                    aria-label={`Move ${label} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => reshape((c) => ({ ...c, sections: c.sections.filter((_, j) => j !== i) }))}
                    aria-label={`Remove ${label}`}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {field(
                `${base}.heading`,
                "Heading",
                <input
                  id={`${base}.heading`}
                  className={styles.input}
                  value={section.heading}
                  onChange={(event) => setSection(i, (s) => ({ ...s, heading: event.target.value }))}
                  aria-invalid={errors[`${base}.heading`] ? true : undefined}
                  aria-describedby={described(`${base}.heading`)}
                />,
              )}
              {field(
                `${base}.body`,
                "Text",
                <textarea
                  id={`${base}.body`}
                  rows={6}
                  className={styles.input}
                  value={section.body}
                  onChange={(event) => setSection(i, (s) => ({ ...s, body: event.target.value }))}
                  aria-invalid={errors[`${base}.body`] ? true : undefined}
                  aria-describedby={described(`${base}.body`)}
                />,
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="ctaQuiet"
          onClick={() => reshape((c) => ({ ...c, sections: [...c.sections, { key: rowKey(), heading: "", body: "" }] }))}
        >
          Add a section
        </button>
      </fieldset>
    </EntryForm>
  );
}
