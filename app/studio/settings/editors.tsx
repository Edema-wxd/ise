"use client";

import {
  COPY_SECTIONS,
  type CopyDraft,
  type NavDraft,
  type NavItemDraft,
  type SettingKey,
  type SiteDraft,
} from "@/lib/studio/settings/fields";
import { EntryForm, move, rowKey, useEntryEditor } from "../entry-editor";
import styles from "../studio.module.css";
import { saveSetting } from "./actions";

/* The settings editors: their fields. Saving, versions and guards are the
   shared EntryForm's, posting to saveSetting with the setting's key. */

type Props<D> = { initial: D; updatedAt: string; isPublished: boolean };

const same = <T,>(value: T) => value;

function SiteEditor({ initial, updatedAt, isPublished }: Props<SiteDraft>) {
  const editor = useEntryEditor({
    one: "page",
    hidden: { key: "site" },
    save: saveSetting,
    initial,
    updatedAt,
    withKeys: same<SiteDraft>,
    withoutKeys: same<SiteDraft>,
  });
  const { draft, update, errors, pending, field, described } = editor;

  const input = (name: keyof SiteDraft, label: string, hint: string, type = "text") =>
    field(
      name,
      label,
      <input
        id={name}
        type={type}
        className={styles.input}
        value={draft[name]}
        onChange={(event) => update((current) => ({ ...current, [name]: event.target.value }))}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={described(name, true)}
      />,
      hint,
    );

  return (
    <EntryForm editor={editor} isPublished={isPublished}>
      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className={styles.legend}>Site details</legend>
        {input("name", "Studio name", "In the browser tab, link previews and the footer.")}
        {input("tagline", "Tagline", "The line under the name in search results and link previews.")}
        {input("email", "Email", "Where custom-order emails go, and the address shown on the site.", "email")}
        {input("instagram", "Instagram handle", "Without the @. Linked from the footer and contact page.")}
        {input(
          "url",
          "Site address",
          "Used for the sitemap and link previews. Change it only if the domain changes.",
          "url",
        )}
      </fieldset>
    </EntryForm>
  );
}

type NavRow = NavItemDraft & { key: number };
type NavRows = { items: NavRow[] };

function NavEditor({ initial, updatedAt, isPublished }: Props<NavDraft>) {
  const editor = useEntryEditor({
    one: "menu",
    hidden: { key: "nav" },
    save: saveSetting,
    initial,
    updatedAt,
    withKeys: (draft: NavDraft): NavRows => ({ items: draft.items.map((item) => ({ ...item, key: rowKey() })) }),
    withoutKeys: (rows: NavRows): NavDraft => ({ items: rows.items.map(({ key: _key, ...item }) => item) }),
  });
  const { draft, update, reshape, errors, pending, field, described } = editor;
  const setItem = (index: number, change: Partial<NavItemDraft>) =>
    update((current) => ({
      items: current.items.map((item, i) => (i === index ? { ...item, ...change } : item)),
    }));

  return (
    <EntryForm editor={editor} isPublished={isPublished}>
      <fieldset className={styles.fieldset} disabled={pending}>
        <legend className={styles.legend}>Menu links ({draft.items.length})</legend>
        <p className={styles.hint}>
          In the header and footer, in this order. The link to /collections opens the menu
          of collections.
        </p>

        {draft.items.map((item, i) => {
          const base = `items.${i}`;
          const label = item.label || `Link ${i + 1}`;
          return (
            <div key={item.key} className={styles.piece}>
              <div className={styles.pieceHead}>
                <h3 className={styles.pieceTitle}>{label}</h3>
                <div className={styles.inline}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === 0}
                    onClick={() => reshape((c) => ({ items: move(c.items, i, i - 1) }))}
                    aria-label={`Move ${label} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    disabled={i === draft.items.length - 1}
                    onClick={() => reshape((c) => ({ items: move(c.items, i, i + 1) }))}
                    aria-label={`Move ${label} down`}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => reshape((c) => ({ items: c.items.filter((_, j) => j !== i) }))}
                    aria-label={`Remove ${label}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className={styles.pieceFields}>
                {field(
                  `${base}.label`,
                  "Link text",
                  <input
                    id={`${base}.label`}
                    className={styles.input}
                    value={item.label}
                    onChange={(event) => setItem(i, { label: event.target.value })}
                    aria-invalid={errors[`${base}.label`] ? true : undefined}
                    aria-describedby={described(`${base}.label`)}
                  />,
                )}
                {field(
                  `${base}.href`,
                  "Goes to",
                  <input
                    id={`${base}.href`}
                    className={styles.input}
                    value={item.href}
                    placeholder="/collections"
                    onChange={(event) => setItem(i, { href: event.target.value.trim() })}
                    aria-invalid={errors[`${base}.href`] ? true : undefined}
                    aria-describedby={described(`${base}.href`)}
                  />,
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="ctaQuiet"
          onClick={() => reshape((c) => ({ items: [...c.items, { key: rowKey(), href: "", label: "" }] }))}
        >
          Add a link
        </button>
      </fieldset>
    </EntryForm>
  );
}

function CopyEditor({ initial, updatedAt, isPublished }: Props<CopyDraft>) {
  const editor = useEntryEditor({
    one: "page copy",
    hidden: { key: "copy" },
    save: saveSetting,
    initial,
    updatedAt,
    withKeys: same<CopyDraft>,
    withoutKeys: same<CopyDraft>,
  });
  const { draft, update, errors, pending, field, described } = editor;

  return (
    <EntryForm editor={editor} isPublished={isPublished}>
      {COPY_SECTIONS.map((section) => (
        <fieldset key={section.key} className={styles.fieldset} disabled={pending}>
          <legend className={styles.legend}>{section.title}</legend>
          {section.fields.map((f) => {
            const path = `${section.key}.${f.key}`;
            const props = {
              id: path,
              className: styles.input,
              value: draft[section.key]?.[f.key] ?? "",
              maxLength: f.max,
              onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const value = event.target.value;
                update((current) => ({ ...current, [section.key]: { ...current[section.key], [f.key]: value } }));
              },
              "aria-invalid": errors[path] ? true : undefined,
              "aria-describedby": described(path, true),
            };
            return (
              <div key={f.key}>
                {field(path, f.label, f.multiline ? <textarea rows={4} {...props} /> : <input {...props} />, f.hint)}
              </div>
            );
          })}
        </fieldset>
      ))}
    </EntryForm>
  );
}

/** The editor for one setting, chosen by key. */
export function SettingEditor({ settingKey, ...props }: Props<unknown> & { settingKey: SettingKey }) {
  switch (settingKey) {
    case "site":
      return <SiteEditor {...(props as Props<SiteDraft>)} />;
    case "nav":
      return <NavEditor {...(props as Props<NavDraft>)} />;
    case "copy":
      return <CopyEditor {...(props as Props<CopyDraft>)} />;
  }
}
