"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveEntry } from "./actions";
import { PhotoPreview, PhotoUpload } from "./photo-upload";
import type { EditorState } from "./state";
import styles from "./studio.module.css";

/*
  The part of every studio editor that is not about its fields: the save and
  publish round trip, the version the form is editing, unsaved-edit guards,
  and the field-and-error layout. Each kind's editor supplies only its fields.

  The whole draft lives in local state and is sent as one JSON payload, so
  rows can be added, removed and reordered freely before saving. The server
  re-validates everything; the errors here are only the ones it sends back,
  shown next to the fields they belong to.
*/

let nextKey = 1;
/** Stable React keys for list rows, which have no id of their own. */
export const rowKey = () => nextKey++;

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

/** A path with a numeric segment names a list row by position: `pieces.2.name`. */
const ROW_PATH = /\.\d+(\.|$)/;

export type EntryEditor<R> = {
  draft: R;
  /** For edits within fields. */
  update: (change: (current: R) => R) => void;
  /** For adding, removing and moving rows, which shifts every later index. */
  reshape: (change: (current: R) => R) => void;
  errors: Record<string, string>;
  pending: boolean;
  /** A labelled field with its error, or its hint when there is no error. */
  field: (path: string, label: string, input: React.ReactElement, hint?: string) => React.ReactElement;
  /** The `aria-describedby` for a field: its error, else its hint. */
  described: (path: string, hint?: boolean) => string | undefined;
  /** For EntryForm; not for the fields. */
  internal: {
    hidden: Record<string, string | number>;
    base: string;
    payload: string;
    action: (form: FormData) => void;
    state: EditorState;
    dirty: boolean;
  };
};

export function useEntryEditor<D, R>({
  one,
  hidden,
  save = saveEntry,
  initial,
  updatedAt,
  withKeys,
  withoutKeys,
}: {
  /** What is being edited, for the leave-without-saving prompt. */
  one: string;
  /** Identifies the target to the save action: `{ kind, id }` for a content
   *  entry, `{ key }` for a setting. */
  hidden: Record<string, string | number>;
  /** The Server Action that saves and publishes. Content entries by default. */
  save?: (previous: EditorState, form: FormData) => Promise<EditorState>;
  initial: D;
  updatedAt: string;
  withKeys: (draft: D) => R;
  withoutKeys: (rows: R) => D;
}): EntryEditor<R> {
  const [state, action, pending] = useActionState(save, {
    status: "idle",
    message: "",
    errors: {},
    updatedAt,
  } satisfies EditorState);
  const [draft, setDraft] = useState(() => withKeys(initial));
  const [dirty, setDirty] = useState(false);
  const [seen, setSeen] = useState(updatedAt);
  /* The version this form is editing, sent back on save as the concurrency
     check. It moves forward on this editor's own saves and when it adopts a
     version written elsewhere — never only one of the two, or the next save
     would be refused as a conflict with itself. */
  const [base, setBase] = useState(updatedAt);

  // A save clears the dirty flag and moves the base forward.
  const [saved, setSaved] = useState(state);
  /* Field errors name list rows by position. Once rows are added, removed or
     moved, those positions point at the wrong rows, so row errors are hidden
     until the next save re-checks the new order. */
  const [reshaped, setReshaped] = useState(false);
  if (saved !== state) {
    setSaved(state);
    setReshaped(false);
    if (state.status === "saved" || state.status === "published") {
      setDirty(false);
      setBase(state.updatedAt);
    }
  }

  /* The page re-renders after any change. If the new version came from this
     editor's own save, keep the form as it is. If it came from elsewhere
     (loading an old version, discarding edits), take the server's draft. */
  if (updatedAt !== seen) {
    setSeen(updatedAt);
    if (updatedAt !== state.updatedAt) {
      setDraft(withKeys(initial));
      setDirty(false);
      setBase(updatedAt);
    }
  }

  // Leaving with unsaved edits asks first.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    /* In-app links navigate without unloading the page, so beforeunload never
       fires for them. Caught on the way down, before Next's <Link> sees the
       click, so a cancelled click goes nowhere. */
    const guard = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link || link.getAttribute("target") === "_blank") return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!window.confirm(`Leave without saving? Your edits to this ${one} will be lost.`)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty, one]);

  const errors = reshaped
    ? Object.fromEntries(Object.entries(state.errors).filter(([path]) => !ROW_PATH.test(path)))
    : state.errors;

  const update = (change: (current: R) => R) => {
    setDraft(change);
    setDirty(true);
  };
  const reshape = (change: (current: R) => R) => {
    update(change);
    setReshaped(true);
  };

  const field = (path: string, label: string, input: React.ReactElement, hint?: string) => (
    <div className={styles.field}>
      <label htmlFor={path} className={styles.label}>
        {label}
      </label>
      {input}
      {errors[path] ? (
        <p id={`${path}-error`} className={styles.error}>
          {errors[path]}
        </p>
      ) : hint ? (
        <p id={`${path}-hint`} className={styles.hint}>
          {hint}
        </p>
      ) : null}
    </div>
  );

  const described = (path: string, hint?: boolean) =>
    errors[path] ? `${path}-error` : hint ? `${path}-hint` : undefined;

  return {
    draft,
    update,
    reshape,
    errors,
    pending,
    field,
    described,
    internal: {
      hidden,
      base,
      payload: JSON.stringify(withoutKeys(draft)),
      action,
      state,
      dirty,
    },
  };
}

/** The form around a kind's fields: the hidden fields the save action reads,
 *  and the save bar. */
export function EntryForm<R>({
  editor,
  isPublished,
  children,
}: {
  editor: EntryEditor<R>;
  isPublished: boolean;
  children: React.ReactNode;
}) {
  const { hidden, base, payload, action, state, dirty } = editor.internal;
  const status = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.status !== "idle") status.current?.focus();
  }, [state]);

  return (
    <form action={action} className={styles.editor} noValidate>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="updatedAt" value={base} />
      <input type="hidden" name="payload" value={payload} />

      {children}

      <div className={styles.saveBar}>
        <button type="submit" name="intent" value="save" className="ctaQuiet" disabled={editor.pending}>
          {editor.pending ? "Saving…" : "Save draft"}
        </button>
        <button type="submit" name="intent" value="publish" className="cta" disabled={editor.pending}>
          {isPublished ? "Publish changes" : "Publish"}
        </button>
        <p
          ref={status}
          tabIndex={-1}
          aria-live="polite"
          className={
            state.status === "saved" || state.status === "published"
              ? styles.success
              : state.status === "idle"
                ? styles.meta
                : styles.error
          }
        >
          {/* After a save, further edits make the "saved" line stale. Errors stay
              up until the next submit, since they say what still needs fixing. */}
          {dirty && (state.status === "idle" || state.status === "saved" || state.status === "published")
            ? "Unsaved edits."
            : state.message}
          {editor.errors.form ? ` ${editor.errors.form}` : ""}
        </p>
      </div>
    </form>
  );
}

/** The lead photo every kind has: upload one, or paste a link. */
export function ImageField<R extends { image: string }>({
  editor,
  label,
}: {
  editor: EntryEditor<R>;
  label: string;
}) {
  const { draft, update, errors, field, described } = editor;
  const setImage = (image: string) => update((current) => ({ ...current, image }));
  return (
    <div className={styles.photo}>
      {field(
        "image",
        label,
        <input
          id="image"
          type="url"
          className={styles.input}
          value={draft.image}
          placeholder="https://ok2jcu82ma.ufs.sh/f/…"
          onChange={(event) => setImage(event.target.value)}
          aria-invalid={errors.image ? true : undefined}
          aria-describedby={described("image", true)}
        />,
        "Upload a photo, or paste an UploadThing link. Empty shows the pattern.",
      )}
      <PhotoPreview src={draft.image} />
      <PhotoUpload
        label={draft.image ? "Replace photo" : "Upload photo"}
        onUploaded={([url]) => url && setImage(url)}
      />
    </div>
  );
}
